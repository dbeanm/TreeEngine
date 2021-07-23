/*
below is testing related
*/

class DummyModel extends Model{
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

// test with l = test()
function test(){
	let l = new Layer(name='layer1')
	let t1 = new Unit('tree1', new DummyModel(['a']))
	let t2 = new Unit('tree2', new DummyModel(['b']))
	let t3 = new Unit('tree3', new DummyModel(['a', 'b']))
	l.add_unit(t1, 'my own tree name') // override tree's own name
	l.add_unit(t2) //name in layer should default to internal name from tree
	l.add_unit(t3)
	let result = l.run({'a': 1, 'b': 2})
	console.log("variables required over all units in layer", l.variables)
	console.log('layer result', result)
	return l
}


function test2(){
	//b conflicts in layer 1
	//a is used in both layers
	let l1 = new Layer(name='layer1')
	let t11 = new Unit('l1_tree1', new DummyModel(['a', 'b']))
	let t12 = new Unit('l1_tree2', new DummyModel(['b']))
	l1.add_unit(t11) // override tree's own name
	l1.add_unit(t12)

	let l2 = new Layer(name='layer2')
	let t21 = new Unit('l2_tree1', new DummyModel(['a', 'c']))
	l2.add_unit(t21) // override tree's own name
	let c = new Container([l1, l2])
	return c
}


function test_unit_specific_input(){
	//test that unit specific inputs overwrite and supplement globals
	//a is shared, be is overwritten per layer
	let l1 = new Layer(name='layer1')
	let t11 = new Unit('l1_tree1', new DummyModel(['a', 'b']))
	let t12 = new Unit('l1_tree2', new DummyModel(['a', 'b']))
	l1.add_unit(t11) // override tree's own name
	l1.add_unit(t12)
	let result = l1.run({'a': 1}, {'l1_tree1': {'b':1000}, 'l1_tree2': {'b':1}})
	console.log(result)
	return l1
}

function container_test(){
	//b conflicts in layer 1
	//layer 2 uses both outputs from layer 1
	let l1 = new Layer(name='layer1')
	let t11 = new Unit('l1_tree1', new DummyModel(['a', 'b']))
	let t12 = new Unit('l1_tree2', new DummyModel(['b']))
	l1.add_unit(t11) 
	l1.add_unit(t12)

	let l2 = new Layer(name='layer2')
	let t21 = new Unit('l2_tree1', new DummyModel(['l1_tree2', 'l1_tree1']))
	l2.add_unit(t21) // override tree's own name
	let c = new Container([l1, l2])

	//run
	let inp = {'a': 1, 'b': 2, 'c': 3}
	c.run(inp)
	return c
}


function quicktree_test(){
	let a = new QuickTree([['a','b'], ['b','c'], ['b','d'],['a','dddd']])
	let l1 = new Layer(name='layer1')

	let t11 = new Unit('l1_tree1', new DummyModel(['a', 'b']))
	let t12 = new Unit('l1_quicktree', a)
	l1.add_unit(t11) 
	l1.add_unit(t12)

	return l1
}

function esyn_test_1(){
	let g = {"metadata":"{\"nodecounter\":5,\"edgecounter\":4,\"place\":{\"start\":1,\"a is one\":1,\"a is not one\":1},\"transition\":{},\"contains\":{},\"isa\":{},\"disperse\":{},\"k\":{},\"citations\":{},\"systems\":{},\"conditions\":{\"n3\":[{\"operation\":\"=\",\"prop\":\"a\",\"value\":\"1\",\"value_type\":\"num\",\"cond_str\":\"a = 1\"}],\"n4\":[{\"operation\":\"else\",\"prop\":\"\",\"value\":\"\",\"value_type\":\"\",\"cond_str\":\" else \"}]},\"variables\":{\"a\":{\"value_type\":\"num\",\"required\":false,\"appearances\":{\"n3\":1},\"ui_group\":\"\"},\"\":{\"value_type\":\"\",\"required\":false,\"appearances\":{\"n4\":1},\"ui_group\":\"\"}},\"dt_ui_groups\":{\"\":[\"a\",\"\"]},\"dt_rules\":{},\"dt_description\":\"\",\"dt_version\":2}","Network0":"{\"nodes\":[{\"data\":{\"id\":\"n0\",\"name\":\"start\",\"marking\":1,\"conditions_label\":\"\"},\"position\":{\"x\":489.203125,\"y\":44},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"place\"},{\"data\":{\"id\":\"n1\",\"name\":\"a is one\",\"marking\":1,\"conditions_label\":\"\"},\"position\":{\"x\":418.203125,\"y\":139},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"place\"},{\"data\":{\"id\":\"n2\",\"name\":\"a is not one\",\"marking\":1,\"conditions_label\":\"\"},\"position\":{\"x\":589.203125,\"y\":144},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"place\"},{\"data\":{\"id\":\"n3\",\"name\":\"\",\"marking\":0,\"conditions_label\":\"a = 1\"},\"position\":{\"x\":454.203125,\"y\":101},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"labelnode\"},{\"data\":{\"id\":\"n4\",\"name\":\"\",\"marking\":0,\"conditions_label\":\" else \"},\"position\":{\"x\":541.703125,\"y\":87.5},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"labelnode\"}],\"edges\":[{\"data\":{\"id\":\"e0\",\"source\":\"n0\",\"target\":\"n3\",\"multiplicity\":1,\"conditions\":[],\"conditions_label\":\"\"},\"position\":{},\"group\":\"edges\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"normal\"},{\"data\":{\"id\":\"e1\",\"source\":\"n3\",\"target\":\"n1\",\"multiplicity\":1,\"conditions\":[],\"conditions_label\":\"\"},\"position\":{},\"group\":\"edges\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"directed\"},{\"data\":{\"id\":\"e2\",\"source\":\"n0\",\"target\":\"n4\",\"multiplicity\":1,\"conditions\":[],\"conditions_label\":\"\"},\"position\":{},\"group\":\"edges\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"normal\"},{\"data\":{\"id\":\"e3\",\"source\":\"n4\",\"target\":\"n2\",\"multiplicity\":1,\"conditions\":[],\"conditions_label\":\"\"},\"position\":{},\"group\":\"edges\",\"removed\":false,\"selected\":false,\"selectable\":false,\"locked\":false,\"grabbable\":true,\"classes\":\"directed\"}]}"}

	let e = new EsynDecisionTree(g)

	return e
}