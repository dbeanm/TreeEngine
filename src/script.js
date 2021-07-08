import cytoscape from "cytoscape" //from "./cytoscape.esm.min.js"
import {compileExpression} from "filtrex"
import * as Terror from './Error.js';

export class Layer {
	constructor(name) {
		this.name = name
		this.units = {}
		this.variables = {} //to be determined based on contained trees
		this.inputs = {} //this is the deconflicted set of unique variables across all models that is needed to run
		this.conflicts = new Set()
		this.state = {}
		this.size = 0
		//each variable {name : {type}}

	}

	save(){
		//get a JSON string representation that can be loaded
		let s = {}
		s['name'] = this.name
		s['units'] = {}
		for(const k in this.units){
			s['units'][k] = this.units[k].save()
		}
		//return JSON.stringify(s)
		return s
	}

	load(config){
		console.log("layer loading from config")
		let m, u
		for(const [unit_name, unit_data] of Object.entries(config.units)){
			if(unit_data.model_class == "EsynDecisionTree"){
				m = new EsynDecisionTree(unit_data.model.model_json, unit_data.model.network_name)
				u = new Unit(unit_data.name, m) //unit_data.name is the internal model name, unit_name is the name for this unit in the layer
				u.set_output_type(unit_data.output_type)
				this.add_unit(u, unit_name)
			}
		}
	}

	add_unit(unit, unit_name = unit.name) {
		/*
		add a tree and it's variables to the layer
		cannot currently handle overwriting an existing unit name
		as this would require removing the old unit with that name then adding this one
		and there is no way to remove a unit yet
		*/
		if(this.units.hasOwnProperty(unit_name)){
			throw new Terror.AddUnitError(`Unit name exists: ${unit_name}`)
		}
		this.units[unit_name] = unit
		//could just set this.variables[unit_name] = unit.variables
		//but doing it this way ensures that any variables that do not
		//belong to units are added in exactly the same way as those from 
		//units
		for (const [vname, vdata] of Object.entries(unit.variables)) {
			  console.log(`adding variable ${vname} from ${unit_name}`);
			  this.add_variable(unit_name, vname, vdata.type)
		}
		//don't just +=1 each time as we may be overwriting an existing unit
		this.size = Object.keys(this.units).length

		this.state[unit_name] = undefined
	}

	delete_unit(unit_name){
		delete this.units[unit_name]
		this.refresh_all_variables()
		this.reset_state()
		this.size = Object.keys(this.units).length
	}

	rename(name){
		this.name = name
	}

	rename_unit(old_name, new_name){
		//copy over the unit then delete it and refresh variables
		try {
			this.add_unit(this.units[old_name], new_name)
		}
		catch(err) {
			console.log(err)
			return false
		}
		
		this.delete_unit(old_name) //also calls refresh_all_variables
		return true
	}

	add_variable(scope, name, type) {
		//conflicts need to be tracked as variables are added. 
		if(!this.variables.hasOwnProperty(scope)){
			this.variables[scope] = {}
		}
		this.variables[scope][name] = {'type': type}

		if(!this.inputs.hasOwnProperty(name)){
			this.inputs[name] = [scope]
		} else {
			this.inputs[name].push(scope)
			this.conflicts.add(name)
		}
		
	}

	refresh_all_variables() {
		console.log(`Layer ${this.name} refreshing all variables`)
		this.inputs = {}
		this.variables = {}
		for (const [unit_name, unit] of Object.entries(this.units)){
			for (const [vname, vdata] of Object.entries(unit.variables)) {
				console.log(`adding variable ${vname} from ${unit_name}`);
				this.add_variable(unit_name, vname, vdata.type)
			}
		}
		
	}

	auto_resolve(){
		//where possible, map conflicting variables to use the same input
		//only possible if the type is the same
	}

	reset_state(){
		for (const unit_name of Object.keys(this.units)) {
			this.state[unit_name] = undefined
		}
	}

	run(all = {}, scoped = {}) {
		//run each Unit
		// all = input variables for all layers
		// scoped = {Unit name : {variables}} to overwrite or supplement global inputs
		// scoped variables are needed if there are conflicting inputs between layers
		let results = {}
		let states = {}
		this.reset_state()
		for (const [key, value] of Object.entries(this.units)) {
		  console.log(`run ${key}`);
		  let this_unit_input = this.handle_input(key, all, scoped)
		  let res = value.run(this_unit_input)
		  states[key] = res
		  if(res.is_ok()){
		  	results[key] = res.value
		  } else {
		  	console.log("Error in unit", key, "state", res)
		  }
		}
		this.state = states //results
		return {results: results, states:states}
	}

	handle_input(unit_name, all, scoped) {
		let input = Object.assign(all, scoped[unit_name]);
		return input
	}
}

export class Unit {
	constructor(name, model = "") {
		this.name = name
		this.model = model
		this.variables = this.model.variables //must be unique, i.e. no separate this.inputs required
		this.output_type = this.model.output_type //default to the type of the model, can be edited later
		this.model_calculator_mode = this.model.metadata.calculator_mode
		// some sort of this.load_graph method should run now
	}

	run(input) {
		//in a real tree run will contain the logic to run, the model itself will not have a run method
		console.log(`${this.name} running with`, input)
		let result = this.model.run(input)
		let result_converted = this.convert_output(result)
		result.value = result_converted
		return result
	}

	save(){
		//get a json representation of the unit that can be loaded
		let s = {}
		s['name'] = this.name
		s['model'] = this.model.save()
		s['model_class'] = this.model.model_class
		s['output_type'] = this.output_type
		//return JSON.stringify(s)
		return s
	}

	set_output_type(type){
		//call with undefined type to reset to the Model defined type
		this.output_type = type
		if(type == "" || type === undefined){
			this.output_type = this.model.output_type
		}
	}

	convert_output(model_result){
		//possible true values are the number 1 or the string "true" with any captialisation
		let val2
		const val = model_result.value
		const input_type = typeof(val);
		if(this.output_type == "str"){
			val2 = String(val)
		}
		
		else if(this.output_type == "num"){
			val2 = parseFloat(val)
		}

		else if(this.output_type == "bool"){
			//for Bool we do our own conversion because any string in js is True, as is any number other than 0
			if(input_type === "string"){
				val2 = (val.toLowerCase() === 'true')
			}
			if(input_type === "number"){
				val2 = (val === 1)
			}
		} else {
			console.log("output type not valid", this.output_type)
			val2 = val
		}
		return val2
	}
}

export class Model {
	//models can specify their output type but this cannot be changed once loaded
	//Units can override the output type set internally by the model.
	constructor(variables = {}){
		this.variables = variables
		this.model_class = "Base"
		this.output_type = "str" //by default, outputs are treated as strings
	}

	run(input){
		return new ModelState()
	}

	save(){
		//get a json representation that can be loaded to get this model back
		return Object.assign({}, this)
	}
}

export class QuickTree extends Model{
	//load a graph from edge list, .run() gives a random path from .run({start: node})
	constructor(edges){
		super({'start': {'type':'str'}})
		this.model_class = "QuickTree"
		this.tree = new Tree(edges)
	}

	run(input){
		let start = input['start']
		let opts = Array.from(this.tree.edgesST[start])
		let next = opts[Math.floor(Math.random() * opts.length)]

		while(this.tree.edgesST.hasOwnProperty(next)){
			opts = Array.from(this.tree.edgesST[next])
			next = opts[Math.floor(Math.random() * opts.length)]
		}
		//return next
		let s = new ModelState()
		s.set_ok(next)
		return s
	}
}

export class Tree {
	//load a graph from edge list
	constructor(edges = [], nodes = []){
		//edges first so nodes can be skipped
		//nodes: list of node names
		//edges: list of [source, target] directed edges
		//nodes will automatically be created from edges
		this.nodes = new Set(nodes)
		this.edgesST = {}
		this.edgesTS = {}
		this.init(nodes, edges)
	}

	init(nodes, edges){
		for(const [s, t] of edges){
			this.nodes.add(s)
			this.nodes.add(t)
			if(!this.edgesST.hasOwnProperty(s)){
				this.edgesST[s] = new Set()
			}
			this.edgesST[s].add(t)

			if(!this.edgesTS.hasOwnProperty(t)){
				this.edgesTS[t] = new Set()
			}
			this.edgesTS[t].add(s)
		}
	}

}

export class EsynDecisionTree extends Model{
	constructor(model_json, network_name = "Network0"){
		//model_json: content of file downloaded from esyn
		//network_name: specific network within the file to run
		super()
		this.model_class = "EsynDecisionTree"
		this.cy = cytoscape({
		  headless: true
		});
		this.network_name = network_name
		this.model_json = model_json
		this.load(model_json, network_name)
		this.model_eval_log = []
	}

	save(){
		//override the base class .save with a customised version
		let s = {}
		// s['model_json'] = this.model_json
		// return JSON.stringify(s)
		s[this.network_name] = this.cy.json()['elements']
		s['metadata'] = this.metadata
		let r = {'model_json': s, 'network_name': this.network_name}
		return r
	}

	load(model_json, network_name, clear_blank_variable = true){
		if(typeof model_json.metadata == 'string'){
			model_json.metadata = JSON.parse(model_json.metadata)
		}
		if(typeof model_json[network_name] == 'string'){
			model_json[network_name] = JSON.parse(model_json[network_name])
		}
		this.metadata = model_json.metadata
		this.cy.add(model_json[network_name])
		this.variables = this.metadata.variables //this.variables is compatible with TreeEngine
		for(const v in this.variables){
			this.variables[v].type = this.variables[v].value_type
		}

		if(clear_blank_variable){
			//else conditions create a blank variable in esyn editor
			delete this.variables['']
		}
		this.model_eval_log = []
		for(const r of Object.keys(this.metadata.dt_rules)){
			//console.log("adding rule", r, this.metadata.dt_rules[r])
			this.add_rule(this.metadata.dt_rules[r])
		}

		//set the model output type to that in the model file if it exists
		//older model format did not require this property
		//nb can be overridden by the parent Unit
		if(this.metadata.hasOwnProperty('output_type')){
			this.output_type = this.metadata.output_type
		}

		//calculator mode
		//old model format did not have this so set a default if absent
		if(!this.metadata.hasOwnProperty('calculator_mode')){
			this.metadata.calculator_mode = "missing"
		} 

	}

	pre_run_checks(input, enforce_required = true) {
		let can_run = true;
		this.model_eval_log = []

		//apply rules and calculators
		let rules = this.get_rules_by_type()
		console.log('rules are', rules)

		//input to the model is user data with calculators applied according to calculator mode

		//detect missing variables
		let all_required = []
		let all_missing_input = []
		let all_variables = Object.keys(this.metadata.variables)
		let val, type
		all_variables.forEach(function(el){
		if( this.metadata.variables[el].required == true ){
				all_required.push(el)
			}
			if(input.hasOwnProperty(el)){
				val = input[el]
				type = this.metadata.variables[el].value_type
				if ( type == 'num' && isNaN(val)  ||  type == 'num' && val === '' || type == 'bool' && val === '' || type == 'str' && val == ''){
					all_missing_input.push(el)
				}
			} else {
				all_missing_input.push(el)
			}
			
		}, this)

		//now run calculators
		let calculated = this.run_calculators(rules.set_val_rules, input)

		let model_input = this.merge_with_calculators(input, calculated,  all_required, all_missing_input, this.metadata.calculator_mode)

		//now apply rules to updated input
		let rules_out = this.run_rules(rules.not_valid_rules, model_input)
		this.model_eval_log = this.model_eval_log.concat(rules_out.log)

		//user-defined checks
		//required variables must be set
		let missing = []
		if(enforce_required == true){
		    let all_vars = Object.keys(model_input)
		    all_vars.forEach(function(el){
				if(this.metadata.variables.hasOwnProperty(el) && this.metadata.variables[el].required == true ){
					if(model_input.hasOwnProperty(el)){
						val = model_input[el]
						type = this.metadata.variables[el].value_type
						if ( type == 'num' && isNaN(val) || type == 'num' && val === '' || type == 'bool' && val === '' || type == 'str' && val == ''){
							missing.push(el)
							this.model_eval_log.push("Missing required input: " + el)
						}
					} else {
						missing.push(el)
						this.model_eval_log.push("Missing required input: " + el)
					}
		        	
				}
		    }, this)
		}

		//stop if input not valid
		//if "required" variables are not being enforced or if none are missing, missing.length==0
		if ( missing.length != 0 || !rules_out.can_run ) {
	    	this.model_eval_log.push('Stopped: model input not valid')
	    	can_run = false
		}


		//checks on structure of the graph
		let root_nodes = this.cy.nodes().roots()
		if(root_nodes.length == 0){
			can_run = false;
		}
		if(root_nodes.length > 1){
			can_run = false;
		}

		return {'can_run': can_run, 'model_input': model_input, 'root': root_nodes[0], 'missing': missing}
	}

	merge_with_calculators(user_input, calculated, required, missing, mode){
		//provides updated input according to the specified mode
		var result
		if(mode == 'always'){
			result = Object.assign(user_input, calculated)
		} else if(mode == 'missing'){
			missing.forEach(function(el){
				if(calculated.hasOwnProperty(el)){
					user_input[el] = calculated[el]
				}
			})
			result = user_input
		} else if(mode == 'required'){
			//replace required variables IF they are missing in the input
			missing.forEach(function(el){
				if(required.indexOf(el) != -1 && calculated.hasOwnProperty(el)){
					user_input[el] = calculated[el]
				}
			})
			result = user_input
		} else if(mode == 'off'){
			result = user_input
		} else {
			console.log("calculator mode", mode,"not recognised, not changing input")
			result = user_input
		}
		return result
	}

	run(input, missing_action = 'highlight', use_calculators = true, enforce_required = true){
		let checks = this.pre_run_checks(input, enforce_required)
		console.log("pre run checks", checks)
		let result = new ModelState()
		let model_input = checks.model_input;
		if(checks.can_run){			
			let root_node = checks.root
			let traversal = this.traverse_from(root_node, model_input)
			console.log("traversal result", traversal)
			let result_is_leaf = traversal.next_node.leaves().length == 1
			//console.log("result is leaf", result_is_leaf, traversal.next_node.leaves().length)
			if(result_is_leaf){
				result.set_ok(traversal.next_node.data('name'))
			} else {
				//model started but didn't reach a leaf
				result.set_error("incomplete")
			}
		} else {
			//cannot run model at all
			result.set_error("cannot run")
		}
		console.log(result)
		return result
	}

	traverse_from(root_node, user_input){
		let options = this.get_targets_from(root_node)
		let can_reach = this.conditions_met(root_node, options, user_input)
		let missing_per_step = []
		let reachable_ids = Object.keys(can_reach.reachable_ids) //was _.keys()
		missing_per_step.push(can_reach.missing)
		let path_nodes = [root_node.id()]
		let path_edges = []
		let next_node = root_node //needed in case evaluation stops at root
		let next_src
		while(reachable_ids.length == 1){
			next_src = reachable_ids[0]
			console.log("continue to", next_src)
			next_node = this.cy.$('#' + next_src)
			//console.log("node", next_node,"is leaf", next_node.leaves().length)
			path_nodes.push(next_src)
			path_edges = path_edges.concat(can_reach.reachable_ids[next_src])
			options = this.get_targets_from(next_node)

			can_reach = this.conditions_met(next_node, options, user_input)
			console.log(can_reach)
			reachable_ids = Object.keys(can_reach.reachable_ids) //was _.keys()
			missing_per_step.push(can_reach.missing)
		}
		let res = {reachable_ids:reachable_ids, next_node:next_node, path_nodes:path_nodes, path_edges:path_edges, path_missing: missing_per_step}
		return res
	}

	conditions_met(source, targets, model_input){
		//targets is a list of options, even if there is only one option
		//targets must be labelnodes, but the returned nodes will be normal (place) nodes
		//i.e. this function follows the whole edge as seen by the user, not just the internal
		//segment to the label
		//for each target, test whether the all conditions are met for the edges connecting s and t
		//an edge with no conditions will always be evaluated as possible, as if it had conditions and they were met.
		let src_id = source.id()
		let options = {}
		let else_options = {}
		let missing = []
		let edge_conds_met //previously was defined within the loop. Should have default value?
		for (let i = 0; i < targets.length; i++) {
			let tgt_id = targets[i].id()
			if(this.metadata.conditions.hasOwnProperty(tgt_id)){
				//there are conditions, test them
				let conds = this.metadata.conditions[tgt_id]
				if(conds.length == 1 && conds[0].operation == 'else') {
					//get all edges connected to the labelnode
					let edges = targets[i].connectedEdges()
					let edge_ids = []
					for (let e = 0; e < edges.length; e++) {
						edge_ids.push(edges[e].id())
					}

					//find the target of the whole labelled edge
					let edge_target = targets[i].outgoers().filter('node')
					let tgt_id = edge_target.id()
					else_options[tgt_id] = edge_ids
					continue
				}
				edge_conds_met = true
				for (let c = 0; c < conds.length; c++) {
					console.log(conds[c].cond_str)
					let res = this.evaluate(conds[c], model_input)
					console.log(res)
					if(res.tested == false || res.result == false){
						edge_conds_met = false
					}
					if(res.tested == false){
						//report to user e.g. missing data
						this.model_eval_log.push(res.reason)
	         			missing.push(res.missing)
					}
				}
			} else {
				//there are no conditions so always reachable, nothing to evaluate
				console.log("no conditions found for ", tgt_id)
				edge_conds_met = true;
				//report to user if there should be conditions
				if(!source.hasClass('labelnode')){
					this.model_eval_log.push("Warning: No conditions for edge")
				}
			}
			if(edge_conds_met){
				//get all edges connected to the labelnode
				let edges = targets[i].connectedEdges()
				let edge_ids = []
				for (let e = 0; e < edges.length; e++) {
					edge_ids.push(edges[e].id())
				}

				//find the target of the whole labelled edge
				let edge_target = targets[i].outgoers().filter('node')
				let tgt_id = edge_target.id()

				if(options.hasOwnProperty(tgt_id)){
					options[tgt_id] = options[tgt_id].concat(edge_ids)
				} else {
					options[tgt_id] = edge_ids
				}
			}
		}
		let result = {'reachable_ids': undefined, 'missing': missing}
		if(Object.keys(options).length > 0){ //was _.keys()
			result.reachable_ids = options
		} else {
			result.reachable_ids = else_options //might be empty but that means there are no options at all
		}
 	return result
	}

	evaluate(condition, model_input){
		let result = {'result': false, 'reason': 'valid', 'tested' : true, 'missing': undefined}
		if(condition.operation == 'else'){
			result.result = true
			return result
		}
		let mv = model_input[condition.prop]
		//note triple === otherwise 0 == ""
		if(!model_input.hasOwnProperty(condition.prop) || mv === "" || (typeof mv != "string" &&  isNaN(mv))){
			result.result = undefined
			result.tested = false
			result.reason = 'missing ' + condition.prop
	    result.missing = condition.prop
			return result //return immediately so we can assume values are ok below
		}
		if(condition['value_type'] == 'bool'){
			let tr = this.get_true_opts()
			let cv
			if(tr.indexOf(condition.value) >= 0){
				cv = true
			} else {
				cv = false
			}
			if(condition.operation == "="){
				result.result = model_input[condition.prop] == cv
			} else if(condition.operation == "!="){
				result.result = model_input[condition.prop] != cv
			}
		} else {
			if(condition.operation == "="){
				result.result = model_input[condition.prop] == condition.value
			} else if(condition.operation == "!="){
				result.result = model_input[condition.prop] != condition.value
			} else if(condition.operation == ">"){
				result.result = model_input[condition.prop] > condition.value
			} else if(condition.operation == ">="){
				result.result = model_input[condition.prop] >= condition.value
			} else if(condition.operation == "<"){
				result.result = model_input[condition.prop] < condition.value
			} else if(condition.operation == "<="){
				result.result = model_input[condition.prop] <= condition.value
			} else {
				result.tested = false
				result.reason = 'unrecognised operation type'
			}
		}
		return result
	}

	get_targets_from(node){
		let out_nodes = node.outgoers('node')
		return out_nodes
	}

	get_true_opts(){
	    return ['TRUE', 'True', 'true']
	}

	get_false_opts(){
	    return ['FALSE', 'False', 'false']
	}

	run_rules(rules, user_input){
	    let then_action
	    let log = []
	    let can_run_model = true

	    //now run not-valid rules using updated input
	    //if any rules run, set can_run_model to false
	    let not_valid_rules_state = {}
		let do_then
		console.log("user input to rules is", user_input)
	    rules.forEach(function(el){
	        do_then = this.metadata.dt_rules[el].if(user_input)
			console.log("result for rule",el,"is",do_then)
	        if(do_then == 1){
	            can_run_model = false
	            not_valid_rules_state[el] = true
	            log.push('Failed input check rule: ' + el)
	        } else {
	            not_valid_rules_state[el] = false
	        }
	    }, this)


	    let output = {log:log, can_run:can_run_model}
	    return output
	}

	get_rules_by_type(){
	    let rules = Object.keys(this.metadata.dt_rules)
	    let set_val_rules = []
	    let not_valid_rules = []
	    let then_action

	    //separate out set-val and not-valid rules
	    rules.forEach(function(el){
	        then_action = this.metadata.dt_rules[el].then_str
	        if(then_action == 'set-val'){
	            set_val_rules.push(el)
	        }
	        else if(then_action == 'not-valid'){
	            not_valid_rules.push(el)
	        }
	        else {
	            console.log('cannot process rule', el)
	        }
	    }, this)
	    return {'set_val_rules': set_val_rules, 'not_valid_rules': not_valid_rules}
	}

	run_calculators(set_val_rules, user_input){
	    let calculated = {}
	    let r
	    set_val_rules.forEach(function(el){
	        //check the IF condition
	        let do_then = this.metadata.dt_rules[el].if(user_input)
	        if(do_then == 1){
	            console.log('running set-val rule', el)
	            r = this.metadata.dt_rules[el]
	            calculated[r.then.set_variable] = r.then.fn(user_input)
	            //should check here that the function worked

	        } else {
	            console.log('not running set-val rule', el)
	        }
	    }, this)
	    return calculated
	}

	add_rule(rule){
	    rule['if'] = compileExpression(rule['if_str']);
	    // handle THEN
	    if(rule['then_str'] == 'set-val'){

	        rule['then']['fn'] = compileExpression(rule['then']['str']);
	    }
	    if(rule['then_str'] == 'not-valid') {
	        rule['then']['fn'] = this.rule_input_invalid
	    }
	    //update metadata
	    this.metadata.dt_rules[rule['name']] = rule
	    console.log('rule created')
	}

	rule_input_invalid(){
	    return true;
	}


}

export class ModelState {
	constructor() {
		this.error_value = null
		this.value = null
		this.status = null
		this.message = null
	}

	set_error(message){
		this.status = "Error"
		this.message = message
		this.value = this.error_value
	}

	set_ok(value, message = ""){
		this.status = "OK"
		this.message = message
		this.value = value
	}

	set_none(message){
		//e.g. for layers that are not in the path
		//so that the model can have a set empty result rather than a blank ModelState
		this.status = "None"
		this.message = message
	}

	is_ok(){
		return this.status == "OK"
	}

	to_cell(){
		if(this.is_ok()){
			return this.value
		} else {
			return `TE-STATE-${this.status}-${this.message}`
		}
	}
}

export class DummyModel extends Model{
	constructor(num_variables = [], bool_variables = []){
		super()
		this.model_class = "DummyModel"
		//normally the variables would be inferred from the graph 
		//for testing just set them in constructor since there is no graph
		this.variables = this.configure_variables(num_variables, bool_variables)
		this.metadata = {}
		this.metadata.calculator_mode = "missing"
	}

	run(input){
		let r = 0
		for (const [key, value] of Object.entries(this.variables)) {
		  r += input[key]
		}
		let result = new ModelState()
		result.set_ok(r)
		return result
	}

	configure_variables(vs = [], bvs = []) {
		let vars = {}
		for (let i = vs.length - 1; i >= 0; i--) {
			vars[vs[i]] = {'type':'num'}
		}
		for (let i = bvs.length - 1; i >= 0; i--) {
			vars[bvs[i]] = {'type':'bool'}
		}
		return vars
	}

}

export class ID2Name {
	/*
	class to map from ID to Name. Will not allow duplicate names or ids
	only names can be changed
	get takes ID -> name
	revGet takes name -> id
	add accepts (id, name)
	*/
    constructor(map = {}) {
       this.map = map;
       this.reverseMap = {};
       for(const [key, value] of Object.entries(map)) {
          this.reverseMap[value] = key;   
       }
    }
    get(key) { return this.map[key]; }
    revGet(key) { return this.reverseMap[key]; }

	add(key, value = key){
		if(this.map.hasOwnProperty(key)){
			throw new Terror.DuplicateEntryError(`Key already exists: ${key}`)
		}
		if(this.reverseMap.hasOwnProperty(value)){
			throw new Terror.DuplicateEntryError(`Value already exists: ${value}`)
		}
		this.map[key] = value
		this.reverseMap[value] = key
	}

	rename(key, value){
		if(this.reverseMap.hasOwnProperty(value)){
			throw new Terror.DuplicateEntryError(`Value already exists: ${value}`)
		}
		this.delete(key)
		this.add(key, value)
	}

	delete(key){
		if(!this.map.hasOwnProperty(key)){
			return
		}
		const value = this.map[key]
		delete this.map[key]
		delete this.reverseMap[value]
	}
}

export class ID2Name2D {
	/*
	class to map from [layer, unit] to Name. Will not allow multiple [layer,unit]s to set a single variable
	but will allow a single [layer, unit] to set multiple values
	
	*/
    constructor(map = {}) {
       this.map = map;
       this.reverseMap = {};
       this.reverse()
    }

	add(layer, unit, variable){
		if(this.reverse.hasOwnProperty(variable)){
			throw new Terror.DuplicateEntryError(`Variable ${variable} is already linked to ${this.reverseMap[variable]}`)
		}
		if(!this.map.hasOwnProperty(layer)){
			this.map[layer] = {}
		}
		if(!this.map[layer].hasOwnProperty(unit)){
			this.map[layer][unit] = [] //don't use a set so it can be serialised easily
		}
		if(this.map[layer][unit].indexOf(variable) == -1){
			this.map[layer][unit].push(variable)
		}
		this.reverse()
	}

	get(layer, unit){
		if(!this.map.hasOwnProperty(layer)){
			return []
		}
		if(!this.map[layer].hasOwnProperty(unit)){
			return []
		}
		return this.map[layer][unit]
	}

	get_layer(layer){
		if(!this.map.hasOwnProperty(layer)){
			return {}
		}
		return this.map[layer]
	}

	get_variable(variable){
		//return {layer, unit} if linked, false otherwise
		if(!this.reverseMap.hasOwnProperty(variable)){
			return false
		} else {
			return this.reverseMap[variable]
		}
	}
	
	get_variable_str(variable){
		const loc = this.get_variable(variable)
		if(loc === false){
			return ""
		}
		return loc.layer + '-' + loc.unit
	}

	get_linked_variables(){
		return Object.keys(this.reverseMap)
	}
	
	delete_layer(layer_name, remaining_variables){
		delete this.map[layer_name]
		this.reverse()
		this.flush(remaining_variables)
	}


	delete_unit(layer_name, unit_name, remaining_variables){
		//there has to at least be an object for the layer in the map
		//then deleting a non-existant unit key is fine if there is no link
		const layer_exists = this.map.hasOwnProperty(layer_name)

		if(layer_exists){
			delete this.map[layer_name][unit_name]
			//if we deleted the only unit, also delete the layer
			if(Object.keys(this.map[layer_name]).length == 0){
				console.log("clean up link for now empty layer", layer_name)
				this.delete_layer(layer_name, remaining_variables)
			}
			this.reverse()
		}

		this.flush(remaining_variables)
		
	}

	flush(remaining_variables){
		//delete links for all variables other than these
		//triggered when a layer is deleted in the container, since it could delete the target of a link
		const linked = Object.keys(this.reverseMap)
		const to_delete = linked.filter(item => remaining_variables.indexOf(item) === -1)
		console.log("ID2Name2D flush comparing list", remaining_variables,"to internal", linked)
		console.log("ID2Name2D flushing unused variables", to_delete)
		for(const v of to_delete){
			//there is potential for an infinite recursion here because delete_link can call flush
			//however delete_link should internally set the remaining variables to the current variables
			//so there will be nothing to delete triggered
			this.delete_link(v)
		}
	}

	delete_link(variable){
		//don't want trying to delete a non-existant link to create issues
		//so currently always returns true but branches are handled separately
		//because the delete process will produce errors if there is no link i.e. key not in dict
		const loc = this.get_variable(variable)
		if(loc === false){
			return true
		}
		//since we got a location, assume the forward link also exists
		//should also check that it exists in case of some internal error
		this.map[loc.layer][loc.unit] = this.map[loc.layer][loc.unit].filter(item => item !== variable)
		//if that was the only link, also delete keys for unit and possibly layer
		if(this.map[loc.layer][loc.unit].length == 0){
			console.log("clean up link for now empty unit", loc.unit,"in",loc.layer)
			this.delete_unit(loc.layer, loc.unit, Object.keys(this.reverseMap))
		}
		this.reverse()
		return true
	}

	rename_layer(old_name, new_name){
		//if old_name doesn't exist it just does nothing rather than raise an error
		if(this.map.hasOwnProperty(new_name)){
			throw new Terror.DuplicateEntryError(`Value already exists: ${new_name}`)
		}
		if(this.map.hasOwnProperty(old_name)){
			this.map[new_name] = this.map[old_name]
			//in a rename we won't lose any variables so set the list of remaining variables to all variable names
			this.delete_layer(old_name, Object.keys(this.reverseMap))
			this.reverse()
		}
	}

	rename_unit(layer_name, old_name, new_name){
		//can only rename if there is an existing link to rename
		//check if either of old_name or new_name does not exist
		const layer_exists = this.map.hasOwnProperty(layer_name)
		let unit_exists = false
		if(layer_exists){
			unit_exists = this.map[layer_name].hasOwnProperty(old_name)
		}

		if(layer_exists && unit_exists){
			if(this.map[layer_name].hasOwnProperty(new_name)){
				throw new Terror.DuplicateEntryError(`Value already exists: ${new_name}`)
			}
			this.map[layer_name][new_name] = this.map[layer_name][old_name]
			//no variables will be deleted in a rename so all current links can be used as list to keep
			this.delete_unit(layer_name, old_name, Object.keys(this.reverseMap))
			this.reverse()
		}
		
	}

	reverse(){
		//the reverse direction is stored flat as only 1:1
		this.reverseMap = {}
		let link;
		for(const [layer, units] of Object.entries(this.map)) {
			for(const [unit, variables] of Object.entries(units)) {
				link = {layer:layer, unit:unit}
				for(const variable of variables){
					this.reverseMap[variable] = link; 
				}
			 }
		 }
	}

}