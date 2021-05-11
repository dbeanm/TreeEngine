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