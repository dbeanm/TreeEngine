import cytoscape from "cytoscape" //from "./cytoscape.esm.min.js"
import {compileExpression} from "filtrex"
import { timers } from "jquery";
import CytoscapeComponent from 'react-cytoscapejs';


class AddLayerError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddLayerError";
	}
}

class AddEdgeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddEdgeError";
	}
}

class VariableTypeError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "VariableTypeError";
	}
}

class AddUnitError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "AddUnitError";
	}
}

class ModelExecutionError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "ModelExecutionError";
	}
}

/*
Once a layer has been added to a container it should not be edited directly
instead use the container functions to control the layer, which guarantees the container also updates
*/
export class Container {
	constructor(layers = [], name = ""){
		this.container_type = "Plain"
		this.layers = {}
		this.layer_order = []
		this.state = {}
		this.variables = {}
		this.inputs = {'conflict': {}, 'usable': {}}
		this.name = name
		for(const l of layers){
			//for...of will be in order, for...in is not guaranteed to be
			this.add_layer(l)
		}
	}

	save(){
		//get a JSON string representation that can be loaded
		let s = {}
		s['layer_order'] = this.layer_order
		s['layers'] = {}
		for(const k in this.layers){
			s['layers'][k] = this.layers[k].save()
		}
		s['name'] = this.name
		s['container_type'] = this.container_type
		//return JSON.stringify(s)
		return s
	}

	load(config){
		let ld
		let loaded_layer
		this.name = config.name
		for(const l of config.layer_order){
			console.log("Container loading layer", l)
			ld = config.layers[l]
			loaded_layer = new Layer(l)
			loaded_layer.load(ld)
			this.add_layer(loaded_layer)
		}
	}

	add_layer(layer, name = layer.name){
		if(this.layers.hasOwnProperty(name)){
			throw new AddLayerError(`Layer name exists: ${name}`)
		} else {
			this.layer_order.push(name)
			this.layers[name] = layer
			this.variables[name] = layer.variables
			this.resolve_inputs()
		}
	}

	add_unit_to_layer(layer_name, unit, unit_name = unit.name){
		console.log(`adding unit ${unit.name} to ${layer_name} with name ${unit_name}`)
		this.layers[layer_name].add_unit(unit, unit_name)
		this.resolve_inputs()
	}

	run (input = {}, scoped_input = {}) {
		// run each layer
		//update state between layers with result of previous
		let result = {}
		for(const layer_name of this.layer_order){
			let layer_r = this.layers[layer_name].run(input, scoped_input)
			input = this.update_inputs(input, layer_r)
			result[layer_name] = layer_r
		}
		this.state = input
		return result
	}

	update_inputs(current, updates){
		let input = Object.assign(current, updates);
		return input
	}

	resolve_inputs(){
		this.inputs = {'conflict': {}, 'usable': {}}
		let seen = {}
		let name;
		for (const [layer_name, layer_variables] of Object.entries(this.variables)) {
			//key is a layer name, value is layer.variables which itself is {name:{props}}
			for (const [uname, udata] of Object.entries(layer_variables)) {
				for (const [vname, vdata] of Object.entries(udata)) {
					if(!seen.hasOwnProperty(vname)){
						//type0 is a shortcut to get the unique type used if types.size == 0
						//without converting the set to an array
						name = `${layer_name}-${uname}`
						seen[vname] = {'appears': [], 'types': new Set(), 'type0': vdata.type}
					}
					seen[vname]['appears'].push(name)
					seen[vname]['types'].add(vdata.type)
				}
			}
		}

		let ob;
		for (const [key, value] of Object.entries(seen)) {
			if(value.types.size === 1){
				ob = {type: value.type0, appears: value.appears, state: undefined, name: key}
				if(value.appears.length > 1){
					ob['state'] = 'warn'
				} else {
					ob['state'] = 'good'
				}
				this.inputs.usable[key] = ob
			} else {
				ob = {type: '', appears: value.appears, state: 'conflict', name:key}
				this.inputs.conflict[key] = ob
			}
		}
	}
}

export class GraphContainer {
	constructor(graph = {}, name = "", headless = true){
		this.cy = cytoscape({
			headless: headless
		  });
		this.container_type = 'Graph'
		this.layers = {}
		this.state = {}
		this.variables = {}
		this.inputs = {'conflict': {}, 'usable': {}}
		this.name = name
		this.layer_order = [] //not needed, to get old UI working
		this.graph_els = []
		this.graph_state =  {'valid': false, 'message' : [], 'root': undefined}
		this.metadata = {conditions: {}}
		this.metadata.variables = {} // variable name -> properties. These appearances are only in rules/conditions, not inside units
		//user defined groups of variables
		this.metadata.dt_ui_groups = {} // group name -> [variables]
		this.metadata.dt_ui_groups[''] = [] //empty string is always the group when a new variable is created
		this.metadata.dt_rules = {} // functions to run


	}

	update_graph_els(){
		console.log("update graph eles for ui")
		// console.log("setting graph els to", this.cy.json()['elements'])
		this.graph_els = CytoscapeComponent.normalizeElements(this.cy.json()['elements'])
	}

	save(){
		/*
		***** TODO *****
		*/
		//get a JSON string representation that can be loaded
		let s = {}
		s['layer_order'] = this.layer_order
		s['layers'] = {}
		for(const k in this.layers){
			s['layers'][k] = this.layers[k].save()
		}
		s['name'] = this.name
		s['container_type'] = this.container_type
		s['metadata'] = this.metadata
		s['graph'] = this.cy.json()['elements']
		//return JSON.stringify(s)
		return s
	}

	load(config){
		/*
		***** TODO *****
		*/
		let ld
		let loaded_layer
		this.name = config.name
		for(const l of config.layer_order){
			console.log("Container loading layer", l)
			ld = config.layers[l]
			loaded_layer = new Layer(l)
			loaded_layer.load(ld)
			this.add_layer(loaded_layer)
		}
		this.metadata = config.metadata
		this.cy.elements().remove()
		this.cy.add(config.graph)
		this.update_graph_validity()
		this.update_graph_els()

	}

	add_layer(layer, name = layer.name){
		if(this.layers.hasOwnProperty(name)){
			throw new AddLayerError(`Layer name exists: ${name}`)
		} else {
			//add node to graph
			this.cy.add({
				group: 'nodes',
				data: {id: name, label: name},
				position: { x: 200, y: 200 }
			})
			this.update_graph_els()
			this.update_graph_validity()
			this.layers[name] = layer
			this.variables[name] = layer.variables
			this.layer_order = Object.keys(this.layers)
			this.resolve_inputs()
		}
	}

	add_edge(layer1, layer2, conditions = []){
		// layer1, layer2: layer NAMES
		/*
		TODO get a list of disallowed values for layer2
		e.g. any parent node in the hierarchy
		*/
		if(layer1 === layer2){
			throw new AddEdgeError(`Edge not allowed`)
		} else {
			let s = this.cy.getElementById(layer1)
			let t = this.cy.getElementById(layer2)
			let the_label_id = this.create_edge_with_label(s, t)
			console.log("edge added with label id", the_label_id)
			this.update_graph_els()
			this.update_graph_validity()
		}
	}

	create_edge_with_label(source, target){
		//first create the label node
		var srcpos = source.position()
		var tgtpos = target.position()
		var xPos = (srcpos.x + tgtpos.x) / 2
		var yPos = (srcpos.y + tgtpos.y) / 2

		
		let the_label_node = this.cy.add({
			group: 'nodes',
			data: {label: "label node here"},
			classes: 'labelnode',
			position: { x: xPos, y: yPos }
		})
		this.metadata.conditions[the_label_node.id()] = []

	
		//from source to labelnode
		this.cy.add([
			{
				group: 'edges',
				data: {source: source.id(), target: the_label_node.id()}
			},
			{
				group: 'edges',
				data: {source: the_label_node.id(), target: target.id()},
				classes: 'directed'
			}
		])
		return the_label_node.id()
	}

	add_condition_to_edge(label_id, cond_var, cond_op, cond_val, cond_val_type){
		let condition_obj = {}
		condition_obj['operation'] = cond_op
		condition_obj['prop'] = cond_op == 'else' ? "" : cond_var
		condition_obj['value'] = cond_op == 'else' ? "" : cond_val
		condition_obj['value_type'] = cond_op == 'else' ? "" : cond_val_type
		condition_obj['cond_str'] = condition_obj['prop'] + " " + condition_obj['operation'] + " " + condition_obj['value']

		//check if the type of the input matches the type of the proporty if it already exists
		if( this.inputs.usable.hasOwnProperty(condition_obj['prop']) ){
			let correct_type = this.inputs.usable[condition_obj['prop']].type
			if (correct_type != condition_obj['value_type']){
				console.log(`${cond_var} has type ${correct_type} but got ${cond_val_type}`)
				//throw new VariableTypeError(`${cond_var} has type ${correct_type} but got ${cond_val_type}`)
				return false //have to stop
			} else {
				this.metadata.conditions[label_id].push(condition_obj)
				if (this.metadata.variables[condition_obj['prop']].appearances.hasOwnProperty(label_id)) {
					this.metadata.variables[condition_obj['prop']].appearances[label_id] += 1
				} else {
					this.metadata.variables[condition_obj['prop']].appearances[label_id] = 1
				}
				return true
			}
			
		} else if(this.inputs.usable.hasOwnProperty(condition_obj['prop'])){
			console.log("cannot create a condition for a conflicted variable")
			return false
		} else {
			console.log("variable does not exist", condition_obj['prop'])
			return false
		}
		
		// in esyn there is an else here to create the variable if it does not exist
	}

	create_variable_meta(var_name, type, required=false){
		//only adds metadata if the variable does not exist, otherwise does nothing
		let variable_obj = {}
        variable_obj['value_type'] = type
        variable_obj['required'] = required
        variable_obj['appearances'] = {}
        variable_obj['ui_group'] = ''
		if(!this.metadata.variables.hasOwnProperty(var_name)){
			this.metadata.variables[var_name] = variable_obj
		}
	}

	delete_conditions_from_edge(label_id, selected){
		console.log("container deleting conditions")
		let keep = []
		for(const el of this.metadata.conditions[label_id]){
			if(selected.indexOf(el.cond_str) != -1){
				//get the ui group first before (potentially) deleting the variable
				var uig = this.metadata.variables[el.prop].ui_group

				//delete
				this.metadata.variables[el.prop].appearances[label_id] -= 1
				//currently all variables should always have these trackers even if empty
				//not sure how to handle ui group
				// if(this.metadata.variables[el.prop].appearances[label_id] == 0){
				// 	delete this.metadata.variables[el.prop].appearances[label_id]
				// 	if(Object.keys(this.metadata.variables[el.prop].appearances).length == 0){
				// 		//there are no more appearances of this variable so delete it from metadata
				// 		//variable tracking
				// 		delete this.metadata.variables[el.prop]
				// 		//ui groups
				// 		var pos = this.metadata.dt_ui_groups[uig].indexOf(el.prop)
				// 		this.metadata.dt_ui_groups[uig].splice(pos, 1)
				// 	}
				// }
			} else {
				keep.push(el)
			}
		}
   		// this.metadata.conditions[label_id].forEach(function(el){
       	// 	if(selected.indexOf(el.cond_str) != -1){
		// 		//get the ui group first before (potentially) deleting the variable
		// 		var uig = this.metadata.variables[el.prop].ui_group

		// 		//delete
		// 		this.metadata.variables[el.prop].appearances[label_id] -= 1
		// 		if(this.metadata.variables[el.prop].appearances[label_id] == 0){
		// 			delete this.metadata.variables[el.prop].appearances[label_id]
		// 			if(Object.keys(this.metadata.variables[el.prop].appearances).length == 0){
		// 				//there are no more appearances of this variable so delete it from metadata
		// 				//variable tracking
		// 				delete this.metadata.variables[el.prop]
		// 				//ui groups
		// 				var pos = this.metadata.dt_ui_groups[uig].indexOf(el.prop)
		// 				this.metadata.dt_ui_groups[uig].splice(pos, 1)
		// 			}
		// 		}
		// 	} else {
		// 		keep.push(el)
		// 	}
		// })
		this.metadata.conditions[label_id] = keep
	}


	add_unit_to_layer(layer_name, unit, unit_name = unit.name){
		console.log(`adding unit ${unit.name} to ${layer_name} with name ${unit_name}`)
		this.layers[layer_name].add_unit(unit, unit_name)
		this.resolve_inputs()
	}

	update_graph_validity(){
		let root_nodes = this.cy.nodes().roots()
		let valid = true
		let reasons = []
		if(root_nodes.length == 0){
			reasons.push("The model has no root node")
			valid = false;
		}
		if(root_nodes.length > 1){
			reasons.push("The model has multiple root nodes")
			valid = false;
		}
		this.graph_state.valid = valid
		this.graph_state.message = reasons
		this.graph_state.root = valid ? root_nodes[0].id() : undefined
		return valid
	}

	run (input = {}, scoped_input = {}) {
		// run each layer
		//update state between layers with result of previous
		if(this.graph_state.valid == false){
			throw new ModelExecutionError(`The model structure is not valid`)
		}
		console.log("running model")
		const root = this.cy.getElementById(this.graph_state.root)
		const result = this.traverse_from(root, input, scoped_input)
		this.state = result.updated_input
		return result.result
	}

	traverse_from(root_node, user_input, scoped_input){
		let result = {}
		//run the root node
		let layer_r = this.layers[root_node.id()].run(user_input, scoped_input)
		user_input = this.update_inputs(user_input, layer_r)
		result[root_node.id()] = layer_r

		//begin traversal
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
			
			//run the current node
			let layer_r = this.layers[next_src].run(user_input, scoped_input)
			user_input = this.update_inputs(user_input, layer_r)
			result[next_src] = layer_r

			path_nodes.push(next_src)
			path_edges = path_edges.concat(can_reach.reachable_ids[next_src])
			options = this.get_targets_from(next_node)

			can_reach = this.conditions_met(next_node, options, user_input)
			console.log(can_reach)
			reachable_ids = Object.keys(can_reach.reachable_ids) //was _.keys()
			missing_per_step.push(can_reach.missing)
		}
		let res = {reachable_ids:reachable_ids, next_node:next_node, path_nodes:path_nodes, path_edges:path_edges, path_missing: missing_per_step}
		res['result'] = result
		res['updated_input'] = user_input
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
	    }, this)

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



	update_inputs(current, updates){
		let input = Object.assign(current, updates);
		return input
	}

	resolve_inputs(){
		this.inputs = {'conflict': {}, 'usable': {}}
		let seen = {}
		let name;
		for (const [layer_name, layer_variables] of Object.entries(this.variables)) {
			//key is a layer name, value is layer.variables which itself is {name:{props}}
			for (const [uname, udata] of Object.entries(layer_variables)) {
				for (const [vname, vdata] of Object.entries(udata)) {
					if(!seen.hasOwnProperty(vname)){
						//type0 is a shortcut to get the unique type used if types.size == 0
						//without converting the set to an array
						name = `${layer_name}-${uname}`
						seen[vname] = {'appears': [], 'types': new Set(), 'type0': vdata.type}
					}
					seen[vname]['appears'].push(name)
					seen[vname]['types'].add(vdata.type)
				}
			}
		}

		let ob;
		for (const [key, value] of Object.entries(seen)) {
			if(value.types.size === 1){
				ob = {type: value.type0, appears: value.appears, state: undefined, name: key}
				if(value.appears.length > 1){
					ob['state'] = 'warn'
				} else {
					ob['state'] = 'good'
				}
				this.inputs.usable[key] = ob
				this.create_variable_meta(key, value.type0)
			} else {
				ob = {type: '', appears: value.appears, state: 'conflict', name:key}
				this.inputs.conflict[key] = ob
				this.create_variable_meta(key, '')
			}
			
		}
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

	add_unit(unit, unit_name = unit.name ) {
		/*
		add a tree and it's variables to the layer
		cannot currently handle overwriting an existing unit name
		as this would require removing the old unit with that name then adding this one
		and there is no way to remove a unit yet
		*/
		if(this.units.hasOwnProperty(unit_name)){
			throw new AddUnitError(`Unit name exists: ${unit_name}`)
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
		this.output_type = this.model.output_type //default to the type of the model, can be edited later
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
				if(this.metadata.variables.hasOwnProperty(el) && this.metadata.variables[el].required == true ){
		        	let val = model_input[el]
		        	let type = this.metadata.variables[el].value_type
			        if ( type == 'num' && isNaN(val) || type == 'bool' && val === '' || type == 'str' && val == ''){
						missing.push(el)
						this.model_eval_log.push("Missing required input: " + el)
			        }
				}
		    }, this)
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
	    }, this)

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

	is_ok(){
		return this.status == "OK"
	}
}

export class DummyModel extends Model{
	constructor(num_variables = [], bool_variables = []){
		super()
		this.model_class = "DummyModel"
		//normally the variables would be inferred from the graph 
		//for testing just set them in constructor since there is no graph
		this.variables = this.configure_variables(num_variables, bool_variables)
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