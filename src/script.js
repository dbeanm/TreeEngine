import cytoscape from "./cytoscape.esm.min.js"
import compileExpression from "filtrex"

class AddLayerError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddLayerError";
	}
}

export class Container {
	constructor(layers = []){
		this.layers = {}
		this.layer_order = []
		this.state = {}
		this.variables = {}
		this.inputs = {}
		for(const l of layers){
			//for...of will be in order, for...in is not guaranteed to be
			this.add_layer(l)
		}
	}

	add_layer(layer, name = layer.name){
		if(this.layers.hasOwnProperty(name)){
			throw new AddLayerError(`Layer name exists: ${name}`)
		} else {
			this.layer_order.push(name)
			this.layers[name] = layer
			this.variables[name] = layer.variables
		}
	}

	run (input = {}, scoped_input = {}) {
		// run each layer
		//update state between layers with result of previous
		for(const layer_name of this.layer_order){
			let layer_r = this.layers[layer_name].run(input, scoped_input)
			input = this.update_inputs(input, layer_r)
		}
		this.state = input
	}

	update_inputs(current, updates){
		let input = Object.assign(current, updates);
		return input
	}
}

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

	add_unit(unit, unit_name = unit.name ) {
		/*
		add a tree and it's variables to the layer
		*/
		this.units[unit_name] = unit
		//could just set this.variables[unit_name] = unit.variables
		//but doing it this way ensures that any variables that do not
		//belong to units are added in exactly the same way as those from 
		//units
		for (const [vname, vdata] of Object.entries(unit.variables)) {
			  console.log(`adding variable ${vname} from ${unit_name}`);
			  this.add_variable(unit_name, vname, vdata.type)
		}
		this.size += 1
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
		//could be useful e.g. once there is a way to remove a Unit
	}

	auto_resolve(){
		//where possible, map conflicting variables to use the same input
		//only possible if the type is the same
	}

	run(all = {}, scoped = {}) {
		//run each Unit
		// all = input variables for all layers
		// scoped = {Unit name : {variables}} to overwrite or supplement global inputs
		// scoped variables are needed if there are conflicting inputs between layers
		let results = {}
		for (const [key, value] of Object.entries(this.units)) {
		  console.log(`run ${key}`);
		  let this_unit_input = this.handle_input(key, all, scoped)
		  let res = value.run(this_unit_input)
		  if(res.is_ok()){
		  	results[key] = res.value
		  } else {
		  	console.log("Error in unit", key, "state", res)
		  }
		}
		this.state = results
		return results
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
		// some sort of this.load_graph method should run now
	}

	run(input) {
		//in a real tree run will contain the logic to run, the model itself will not have a run method
		console.log(`${this.name} running with`, input)
		let result = this.model.run(input)
		return result
	}
}

export class Model {
	constructor(variables = {}){
		this.variables = variables
	}

	run(input){
		return new ModelState()
	}
}

export class QuickTree extends Model{
	//load a graph from edge list, .run() gives a random path from .run({start: node})
	constructor(edges){
		super({'start': {'type':'str'}})
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
		this.cy = cytoscape({
		  headless: true
		});
		this.load(model_json, network_name)
		
	}

	load(model_json, network_name){
		this.metadata = JSON.parse(model_json.metadata)
		this.cy.add(JSON.parse(model_json[network_name]))
		this.variables = this.metadata.variables
		this.model_eval_log = []
		for(const r of Object.keys(this.metadata.dt_rules)){
			this.add_rule(this.metadata.dt_rules[r])
		}
	}

	pre_run_checks(input, use_calculators = true, enforce_required = true) {
		let can_run = true;
		this.model_eval_log = []

		//apply rules and calculators
		let rules = this.run_rules(input) // updated user input is in rules.updated_input
		this.model_eval_log = this.model_eval_log.concat(rules.log)


		//input to the model is user data with calculators applied
		let model_input
		if(use_calculators == true){
			model_input = rules.updated_input
		} else {
			model_input = input
		}

		//user-defined checks
		//required variables must be set
		let missing = []
		if(enforce_required == true){
		    let all_vars = Object.keys(model_input)
		    all_vars.forEach(function(el){
				if( this.metadata.variables[el].required == true ){
		        	let val = model_input[el]
		        	let type = this.metadata.variables[el].value_type
			        if ( type == 'num' && isNaN(val) || type == 'bool' && val === '' || type == 'str' && val == ''){
						missing.push(el)
						this.model_eval_log.push("Missing required input: " + el)
			        }
				}
		    })
		}

		//stop if input not valid
		//if "required" variables are not being enforced or if none are missing, missing.length==0
		if ( missing.length != 0 || !rules.can_run ) {
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

		return {'can_run': can_run, 'model_input': model_input, 'root': root_nodes[0]}
	}

	run(input, missing_action = 'highlight', use_calculators = true, enforce_required = true){
		let checks = this.pre_run_checks(input, use_calculators, enforce_required)

		let result = new ModelState()
		let model_input = checks.model_input;
		if(checks.can_run){			
			let root_node = checks.root
			let traversal = this.traverse_from(root_node, model_input)
			let result_is_leaf = traversal.next_node.leaves().length == 1
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
		while(reachable_ids.length == 1){
			let next_src = reachable_ids[0]
			console.log("continue to", next_src)
			let next_node = this.cy.$('#' + next_src)
			path_nodes.push(next_src)
			path_edges = path_edges.concat(can_reach[next_src])
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

	run_rules(user_input){
	    let then_action
	    let log = []
	    let can_run_model = true

	    let rules = this.get_rules_by_type()
	    let calculated = this.run_calculators(rules.set_val_rules, user_input)

	    //now run not-valid rules using updated input
	    //if any rules run, set can_run_model to false
	    let not_valid_rules_state = {}
	    rules.not_valid_rules.forEach(function(el){
	        let do_then = this.metadata.dt_rules[el].if(calculated)
	        if(do_then == 1){
	            can_run_model = false
	            not_valid_rules_state[el] = true
	            log.push('Failed input check rule: ' + el)
	        } else {
	            not_valid_rules_state[el] = false
	        }
	    })

	    //apply calculators to input
	    let calculated_vars = Object.keys(calculated) //was _.keys
	    let updated_input = Object.assign({}, user_input) //was _.clone
	    calculated_vars.forEach(function(el){
	        updated_input[el] = calculated[el]
	    })
	    let output = {log:log, can_run:can_run_model, calculated: calculated, updated_input: updated_input}
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
	    })
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
	    })
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

	is_ok(){
		return this.status == "OK"
	}
}

export class DummyModel extends Model{
	constructor(variables = []){
		super()
		//normally the variables would be inferred from the graph 
		//for testing just set them in constructor since there is no graph
		this.variables = this.configure_variables(variables)
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

	configure_variables(vs) {
		let vars = {}
		for (let i = vs.length - 1; i >= 0; i--) {
			vars[vs[i]] = {'type':'num'}
		}
		return vars
	}

}