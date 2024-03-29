import 'bootstrap/dist/css/bootstrap.min.css';
import $ from 'jquery';
import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import ReactDOM from 'react-dom';
import './index.css';
import {GraphContainer} from './GraphContainer'
import {ToolView} from './App';
import reportWebVitals from './reportWebVitals';

if (process.env.NODE_ENV === 'production'){
  console.log = function(){}
}

// ReactDOM.render(
//   <UnitView unit={new Unit('tree1', new DummyModel(['a']))}/>,
//   document.getElementById('root')
// );

// let l = new Layer('layer1')
// let t1 = new Unit('tree1', new DummyModel(['a']))
// let t2 = new Unit('tree2', new DummyModel(['b']))
// let t3 = new Unit('tree3', new DummyModel(['a', 'b']))
// l.add_unit(t1, 'my own tree name') // override tree's own name
// l.add_unit(t2) //name in layer should default to internal name from tree
// l.add_unit(t3)
  
// ReactDOM.render(
//   <LayerView layer={l}/>,
//   document.getElementById('root2')
// );


// let l1 = new Layer('layer1')
// let t11 = new Unit('l1_tree1', new DummyModel(['a', 'b']))
// let t12 = new Unit('l1_tree2', new DummyModel(['b']))
// l1.add_unit(t11) 
// l1.add_unit(t12)
// let l2 = new Layer('layer2')
// let t21 = new Unit('l2_tree1', new DummyModel(['l1_tree2', 'l1_tree1']))
// l2.add_unit(t21) // override tree's own name
// let c = new Container([l1, l2])

// ReactDOM.render(
//   <ContainerView container={c}/>,
//   document.getElementById('root3')
// );

// ReactDOM.render(
//   <Workspace project_name={'my new project'} container={c}/>,
//   document.getElementById('root4')
// );

// let l1 = new Layer('layer1')

//let c = new Container([])
let c = new GraphContainer()
// let l = new Layer("L1")
// c.add_layer(l)
// let l2 = new Layer("L2")
// c.add_layer(l2)
// c.add_edge('L1', 'L2', [])

ReactDOM.render(
  <ToolView container={c} available_plugins={['HaemTreatmentExtractor', 'CytogeneticsExtractor', 'DummyExtractor']}/>,
  document.getElementById('root4')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
