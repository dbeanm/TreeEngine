import * as Terror from './Error.js'
import cytoscape from "cytoscape" //from "./cytoscape.esm.min.js"
import {compileExpression} from "filtrex"
import {ModelState, Layer, ID2Name, ID2Name2D} from './script.js';
import CytoscapeComponent from 'react-cytoscapejs';
/*
Once a layer has been added to a container it should not be edited directly
instead use the container functions to control the layer, which guarantees the container also updates
*/

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
		this.metadata.calculator_mode = 'missing'
		this.model_eval_log = []
		this.id2name = new ID2Name()
		this.unit2input = new ID2Name2D()
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
		s['unit2input'] = this.unit2input.map
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
		this.model_eval_log = []
		this.cy.elements().remove()
		this.cy.add(config.graph)
		this.update_graph_validity()
		this.update_graph_els()
		this.unit2input = new ID2Name2D(config.unit2input)

		for(const r of Object.keys(this.metadata.dt_rules)){
			//console.log("adding rule", r, this.metadata.dt_rules[r])
			this.add_rule(this.metadata.dt_rules[r])
		}

		//calculator mode
		//old model format did not have this so set a default if absent
		if(!this.metadata.hasOwnProperty('calculator_mode')){
			this.metadata.calculator_mode = "missing"
		} 

	}

	add_layer(layer, name = layer.name){
		if(this.layers.hasOwnProperty(name)){
			throw new Terror.AddLayerError(`Layer name exists: ${name}`)
		} else {
			//add node to graph
			this.cy.add({
				group: 'nodes',
				data: {id: name, label: name},
				classes: 'compute'
			})
			this.update_graph_els()
			this.update_graph_validity()
			this.layers[name] = layer
			this.variables[name] = layer.variables
			this.layer_order = Object.keys(this.layers)
			this.resolve_inputs()
		}
	}

	delete_layer(name){
		console.log("GraphContainer deleting a layer", name)
		if(!this.layers.hasOwnProperty(name)){
			return false
		}
		delete this.layers[name]
		delete this.variables[name]
		this.layer_order = Object.keys(this.layers)

		//update cy
		let selected = this.cy.getElementById(name)
		let neighborhood = selected.neighborhood()
		let labels = neighborhood.filter('.labelnode')
		for(const lab of labels){
			this.delete_labelnode(lab.id())
		}
		selected = selected.union(neighborhood)
		selected.remove()
		this.update_graph_els()
		this.update_graph_validity()
		this.resolve_inputs()
		//update links - must be after inputs resolved so links can be flushed
		this.unit2input.delete_layer(name, Object.keys(this.inputs.usable))

		return true
	}

	rename_layer(old_name, new_name){
		console.log('GraphContainer trying to rename layer from', old_name,'to',new_name)
		if(this.layers.hasOwnProperty(new_name)){
			throw new Terror.AddLayerError(`Layer name already exists: ${new_name}`)
		} else if(!this.layers.hasOwnProperty(old_name)){
			//TODO change to better error class
			throw new Terror.AddLayerError(`No layer exists with current name: ${old_name}`)
		} else {
			//get the old node
			let old_node = this.cy.getElementById(old_name)

			//add new node to graph
			this.cy.add({
				group: 'nodes',
				data: {id: new_name, label: new_name},
				classes: 'compute'
			})
			//move edges from all current labelnodes for oldname to newname
			const incomers = old_node.incomers('edge') //to change target
			const outgoers = old_node.outgoers('edge') //to change source
			let new_edges = []
			let edge
			incomers.forEach((element) => {
				edge = {
					group: 'edges',
					data: {source: element.source().id(), target: new_name},
					classes: 'directed'
				}
				new_edges.push(edge)
			});
			outgoers.forEach((element) => {
				edge = {
					group: 'edges',
					data: {source: new_name, target: element.target().id()}
				}
				new_edges.push(edge)
			});
			this.cy.add(new_edges)
			let selected = incomers.union(outgoers)
			selected.remove()

			//copy metadata
			this.layers[new_name] = this.layers[old_name]
			this.variables[new_name] = this.variables[old_name]
			this.layers[new_name].rename(new_name) //update layer internal name
			//update links
			this.unit2input.rename_layer(old_name, new_name)

			//delete the old node
			this.delete_layer(old_name)
			// console.log("els are now")
			const els_now = this.cy.json()['elements']
			// console.log(els_now)
			console.log( CytoscapeComponent.normalizeElements(els_now))
			return true
		}
	}

	delete_labelnode(label_id){
		console.log("GraphContainer deleting a labelnode", label_id)
		//handle variables
		let conds = this.metadata.conditions[label_id]
		let cond_strs = conds.map((x) => x.cond_str)
		this.delete_conditions_from_edge(label_id, cond_strs) //selected is a list of conditions to delete
	
		//the edge will be deleted so delete conditions metadata
		delete this.metadata.conditions[label_id]

		//delete the node
		this.cy.getElementById(label_id).remove()
		this.update_graph_els()
		this.update_graph_validity()
	
	}

	

	add_edge(layer1, layer2, conditions = []){
		// layer1, layer2: layer NAMES
		/*
		TODO get a list of disallowed values for layer2
		e.g. any parent node in the hierarchy
		*/
		if(layer1 === layer2){
			throw new Terror.AddEdgeError(`Edge not allowed`)
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
			data: {conditions_label: ""},
			classes: 'labelnode',
			
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
				this.update_condition_label(label_id)
				this.update_graph_els()
				return true
			}
			
		} else if(this.inputs.usable.hasOwnProperty(condition_obj['prop'])){
			console.log("cannot create a condition for a conflicted variable")
			return false
		} else {
			//if changed to allow new variables to be created this way, then 
			//remember to update_condition_label or move this branch into the current one that
			//actually adds the condition
			console.log("variable does not exist", condition_obj['prop'])
			return false
		}
		
		/*
		?? TODO ??
		// in esyn there is an else here to create the variable if it does not exist
		*/


	}

	update_condition_label(id){
		let label = ""
		let edge = this.cy.getElementById(id)
		this.metadata.conditions[id].forEach(function(el){
			label = label + el.cond_str + "\n"
		})
		label = label.slice(0, -1) // remove trailing chars
		edge.data('conditions_label', label)
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

	delete_conditions_from_edge(label_id, selected, refresh_graph=true){
		//by default this will automatically trigger this.update_graph_els but can be disabled e.g. for use in a loop
		//in that case update_graph_els should be manually used afterwards
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
		this.update_condition_label(label_id)
		if(refresh_graph){
			this.update_graph_els()
		}
	}


	add_unit_to_layer(layer_name, unit, unit_name = unit.name){
		console.log(`adding unit ${unit.name} to ${layer_name} with name ${unit_name}`)
		let ok = true
		try {
			this.layers[layer_name].add_unit(unit, unit_name)
		} catch (error) {
			ok = false
		}
		if(ok){
			console.log('unit added, resolving inputs')
			this.resolve_inputs()
			return true
		} else {
			console.log("cannot add unit to layer")
			return false
		}
		
	}

	delete_unit_from_layer(layer_name, unit_name){
		console.log(`deleting unit ${unit_name} from ${layer_name}`)
		try {
			this.layers[layer_name].delete_unit(unit_name)
		}
		catch (err) {
			console.log(err)
			return false
		}
		this.resolve_inputs()
		//update links
		this.unit2input.delete_unit(layer_name, unit_name, Object.keys(this.inputs.usable))
		return true
	}

	rename_unit_in_layer(layer_name, old_name, new_name){
		console.log(`renaming unit ${old_name} to ${new_name} in layer ${layer_name}`)
		let ok
		try {
			ok = this.layers[layer_name].rename_unit(old_name, new_name)
		}
		catch(err){
			console.log(err)
			return false
		}
		//only update link if rename actually happened
		//since that rename was ok then the link rename must also be
		if(ok){
			this.unit2input.rename_unit(layer_name, old_name, new_name)
		}
		//even if rename failed it should always be safe to resolve inputs
		this.resolve_inputs()
		return ok
	}

	link_input_to_unit(variable_name, unit_name, layer_name){
		//TODO check the variable type matches the output type of the unit
		//check all of the arguments are valid
		const l_ok = this.layers.hasOwnProperty(layer_name)
		let u_ok = false
		if(l_ok){
			//if the layer is valid, check it has a unit with this name
			u_ok = this.layers[layer_name].units.hasOwnProperty(unit_name)
		}
		const v_ok = this.inputs.usable.hasOwnProperty(variable_name)
		const checks_pass = l_ok && u_ok && v_ok
		if(!checks_pass){
			console.log(`checks passed: variable ${v_ok}, unit ${u_ok}, layer ${l_ok}`)
			return false
		}
		let ok
		try {
			this.unit2input.add(layer_name, unit_name, variable_name)
			ok = true
		}
		catch(err){
			console.log(err)
			ok = false
		}
		return ok
	}

	unlink_input(variable_name){
		let ok = this.unit2input.delete_link(variable_name)
		return ok
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

		//this error is now just returned as part of the state to make batch runs easier
		// if(this.graph_state.valid == false){
		// 	throw new Terror.ModelExecutionError(`The model structure is not valid`)
		// }
		
		console.log("running model")
		let checks = this.pre_run_checks(input, false) //currently aren't required variables here
		console.log("pre run checks", checks)
		let model_input = checks.model_input;
		let seen, result
		if(checks.can_run){
			const root = this.cy.getElementById(this.graph_state.root)
			result = this.traverse_from(root, model_input, scoped_input)
			result['meta'] = 'OK'
			//check for nodes that did not run, set state accordingly
			//the nodes that run are ALL in result.path_nodes and ONLY in result.path_nodes
			seen = new Set(result.path_nodes)
			this.state = result.updated_input
		} else {
			seen = new Set()
			this.state = model_input
			result = {'result': 'did not run'}
			result['meta'] = 'Model Error'
		}
		
		const all_layers = Object.keys(this.layers)
		let difference = new Set(
			all_layers.filter(x => !seen.has(x)));
		let ms
		for(const l of difference){
			this.layers[l].reset_state()
			result.states[l] = {}
			for(const u of Object.keys(this.layers[l].units)){
				ms = new ModelState()
				ms.set_none("NotInPath")
				result.states[l][u] = ms
			}
		}
		
		console.log("GraphContainer result", result)
		
		return result
	}

	traverse_from(root_node, user_input, scoped_input){
		let result = {}
		let states = {}
		//run the root node
		let layer_r = this.layers[root_node.id()].run(user_input, scoped_input)
		user_input = this.update_inputs(user_input, root_node.id(), layer_r.results)
		result[root_node.id()] = layer_r.results
		states[root_node.id()] = layer_r.states

		//begin traversal
		console.log("GraphContainer is running")
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
			console.log("GraphContainer continue to", next_src)
			next_node = this.cy.$('#' + next_src)
			
			//run the current node
			let layer_r = this.layers[next_src].run(user_input, scoped_input)
			user_input = this.update_inputs(user_input, next_src, layer_r.results)
			result[next_src] = layer_r.results
			states[next_src] = layer_r.states

			path_nodes.push(next_src)
			path_edges = path_edges.concat(can_reach.reachable_ids[next_src])
			options = this.get_targets_from(next_node)

			can_reach = this.conditions_met(next_node, options, user_input)
			console.log('GraphContainer can reach', can_reach)
			reachable_ids = Object.keys(can_reach.reachable_ids) //was _.keys()
			missing_per_step.push(can_reach.missing)
		}
		let res = {reachable_ids:reachable_ids, next_node:next_node, path_nodes:path_nodes, path_edges:path_edges, path_missing: missing_per_step}
		res['result'] = result
		res['updated_input'] = user_input
		res['states'] = states
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

			val = input[el]
			type = this.metadata.variables[el].value_type
			if ( type == 'num' && isNaN(val)  ||  type == 'num' && val === '' || type == 'bool' && val === '' || type == 'str' && val == ''){
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
		        	val = model_input[el]
		        	type = this.metadata.variables[el].value_type
			        if ( type == 'num' && isNaN(val) || type == 'num' && val === '' || type == 'bool' && val === '' || type == 'str' && val == ''){
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
				console.log("new value",calculated[r.then.set_variable])
	            //should check here that the function worked

	        } else {
	            console.log('not running set-val rule', el)
	        }
	    }, this)
	    return calculated
	}

	get_value_of_calculators(user_input){
		//get the return value of each calculator by variable as a string, useful for UI
		//output is {VARIABLE: [STRING]}
		let rules = this.get_rules_by_type()
		let calculated = {}
		let r, do_then, set, cv, s
		for (const calc of rules.set_val_rules) {
			r = this.metadata.dt_rules[calc]
			do_then = r.if(user_input)
			set = r.then.set_variable
			if(do_then == 1){
				cv = r.then.fn(user_input)
				s = `${calc}->${cv}`
				if(calculated.hasOwnProperty(set)){
					calculated[set].push(s)
				} else {
					calculated[set] = [s]
				}
				
			}
		}
		return calculated
	}


	add_rule(rule){
		let can_add = true
		try {
			rule['if'] = compileExpression(rule['if_str']);
		} catch (error) {
			can_add = false
		}
	    
	    // handle THEN
	    if(rule['then_str'] == 'set-val'){
			try {
				rule['then']['fn'] = compileExpression(rule['then']['str']);
			} catch (error) {
				can_add = false
			}
	        
	    }
	    if(rule['then_str'] == 'not-valid') {
	        rule['then']['fn'] = this.rule_input_invalid
	    }
	    //update metadata
		if(can_add){
			this.metadata.dt_rules[rule['name']] = rule
	    	console.log('rule created')
		}
		return can_add
	}

	delete_rule(rule_name){
		if(this.metadata.dt_rules.hasOwnProperty(rule_name)){
			delete this.metadata.dt_rules[rule_name]
			return true
		}
		return false
	}


	rule_input_invalid(){
	    return true;
	}

	get_calculator_targets(){
		let calcs = this.get_rules_by_type()['set_val_rules']
		let tgts = {}
		let t
		for(const name of calcs){
			t = this.metadata.dt_rules[name].then.set_variable
			if(!tgts.hasOwnProperty(t)){
				tgts[t] = [name]
			} else {
				tgts[t].push(name)
			}
		}
		return tgts
	}



	update_inputs(current, layer_name, updates){
		//check for a link
		const linked = this.unit2input.get_layer(layer_name)
		for(const [unit_name, variable_names] of Object.entries(linked)){
			for(const variable of variable_names){
				current[variable] = updates[unit_name]
			}
		}
		//let input = Object.assign(current, updates);
		return current
	}

	resolve_inputs(){
		this.inputs = {'conflict': {}, 'usable': {}}
		this.variables = {}
		console.log("finding variables")
		//initialise this.variables from layers
		for (const layer_name of Object.keys(this.layers)){
			this.variables[layer_name] = this.layers[layer_name].variables
		}
		
		let seen = {}
		let name;
		for (const [layer_name, layer_variables] of Object.entries(this.variables)) {
			//key is a layer name, value is layer.variables which itself is {name:{props}}
			for (const [uname, udata] of Object.entries(layer_variables)) {
				for (const [vname, vdata] of Object.entries(udata)) {
					if(!seen.hasOwnProperty(vname)){
						//type0 is a shortcut to get the unique type used if types.size == 0
						//without converting the set to an array
						seen[vname] = {'appears': [], 'types': new Set(), 'type0': vdata.type}
					}
					name = `${layer_name}-${uname}`
					seen[vname]['appears'].push(name)
					seen[vname]['types'].add(vdata.type)
				}
			}
		}

		console.log("checking variable conflicts")
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

		//now check that none of the metadata.conditions refers to a variable not in the refreshed
		//list of usable variables
		console.log("check conditions for missing/error variables")
		let to_delete
		let refresh_labels = false
		for(const [label_id, conds] of Object.entries(this.metadata.conditions)){
			to_delete = conds.filter(c => !this.inputs.usable.hasOwnProperty(c.prop)).map(x => x.cond_str)
			if(to_delete.length != 0){
				console.log("removed condition using deleted variable in label", label_id)
				this.delete_conditions_from_edge(label_id, to_delete, false)
				refresh_labels = true
			}
		}
		if(refresh_labels){
			//if we changed any labels, update the graph once at the end
			this.update_graph_els()
		}

		//check for dt_ui_groups that contain variables that no longer exist
		//and make sure every variable is in a group
		console.log("updating ui groups")
		let has_group = []
		let updated_ui_grps = {}
		for(const [grp, members] of Object.entries(this.metadata.dt_ui_groups)){
			updated_ui_grps[grp] = []
			for(const m of members){
				if(seen.hasOwnProperty(m)){
					has_group.push(m)
					updated_ui_grps[grp].push(m)
				} else {
					console.log('variable', m, 'no longer exists, removing from ui group', grp)
				}
			}
		}
		for (const v of Object.keys(seen)) {
			if(has_group.indexOf(v) === -1){
				updated_ui_grps[''].push(v)
			}
		}
		this.metadata.dt_ui_groups = updated_ui_grps
		console.log("done resolving inputs")
	}

	add_dt_ui_group(name){
		if(this.metadata.dt_ui_groups.hasOwnProperty(name)){
			return false
		}
		this.metadata.dt_ui_groups[name] = []
		return true
	}

	update_dt_ui_group(group, variables){
		//check that all the variables exist
		let vs = variables.filter((v) => this.inputs.usable.hasOwnProperty(v))
		let v2g = this.get_ui_groups()
		
		//if the group does not already exist, add it
		if(!this.metadata.dt_ui_groups.hasOwnProperty(group)){
			this.metadata.dt_ui_groups[group] = []
		}
		let cpy = Object.assign({}, this.metadata.dt_ui_groups)

		let oldgrp
		for(const v of vs){
			//only add if not already in
			if(cpy[group].indexOf(v) === -1){
				//put in new group
				cpy[group].push(v)
				//remove from old group
				oldgrp = v2g[v]
				cpy[oldgrp] = cpy[oldgrp].filter(item => item !== v)
			}
		}

		this.metadata.dt_ui_groups = cpy
		return true
	}

	get_ui_groups(){
		let m = {}
		for(const [g, vs] of Object.entries(this.metadata.dt_ui_groups)){
			for(const v of vs){
				if(!m.hasOwnProperty(v)){
					m[v] = [g]
				}
				else {
					m[v].push(g)
				}
			}
		}
		return m
	}
}