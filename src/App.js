import React from 'react';
import {Unit, Layer, DummyModel, Container} from './script.js';

function ListItem(props) {
  // Correct! There is no need to specify the key here:
  return <li>{props.name}</li>;
}

export class InputListItem extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <li>[{this.props.var_state}] Input for {this.props.name} which is a {this.props.var_data.type}</li>
    );
  }
}

export class UnitView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const variables = Object.keys(this.props.unit.variables)
    const listItems = variables.map((var_name) =>
      // Correct! Key should be specified inside the array.
      <ListItem key={var_name} name={var_name} />
    );
    return (
      <div>
        <p>Unit Name: {this.props.unit.name}</p>
        <p>Unit Varaibles:</p>
        <ul>
          {listItems}
        </ul>
      </div>
    );
  }
}

export class UnitAvailableView extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick(){
    this.props.handleUnitAdded(this.props.unit.name)
  }

  render() {
    const variables = Object.keys(this.props.unit.variables)
    const listItems = variables.map((var_name) =>
      // Correct! Key should be specified inside the array.
      <ListItem key={var_name} name={var_name} />
    );
    return (
      // <div>
      //   <p>Unit Name: {this.props.unit.name}</p>
      //   <button type="button" className="btn btn-primary" onClick={this.handleClick}>Add to layer</button>
      //   <p>Unit Varaibles:</p>
      //   <ul>
      //     {listItems}
      //   </ul>
      // </div>

      <div className="card available-unit-card">
      <div className="card-header">{this.props.unit.name} <button type="button" className="btn btn-primary" onClick={this.handleClick}>Add to layer</button></div>
      <div className="card-body">
      <p>Unit Varaibles:</p>
        <ul>
          {listItems}
        </ul>
      </div>
      </div>
    );
  }
}

export class ListAvailableUnits extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const listItems = Object.keys(this.props.units).map((unit_name) =>
      <li key={unit_name}><UnitAvailableView key={unit_name} unit={this.props.units[unit_name]} /></li>
    );

    return (
      <div>
        <p>Available Models:</p>
          <ul>
            {listItems}
          </ul> 
      </div>
    );
  }
}

export class LayerView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const units = Object.keys(this.props.layer.units)
    const listItems = units.map((unit_name) =>
      // Correct! Key should be specified inside the array.
      <li key={unit_name}><UnitView key={unit_name} unit={this.props.layer.units[unit_name]} /></li>
    );

    const conflicts = Array.from(this.props.layer.conflicts)
    let conflictItems;
    if(conflicts.length == 0){
      conflictItems = [<li key={1}>No conflicts</li>]
    } else {
      conflictItems = conflicts.map((var_name) =>
        <li key={var_name}>{var_name}</li>
      );
    }
    return (
      <div>
        <p>Layer Name: {this.props.layer.name}</p>
        <ul> 
          <li>Conflicted Variables ({conflicts.length}):
            <ul>
              {conflictItems}
            </ul>
          </li>
          
          <li>Units Contained ({this.props.layer.size}):
          <ul>
            {listItems}
          </ul> 
          </li>
        </ul>
      </div>
    );
  }
}

export class ContainerView extends React.Component {
  constructor(props) {
    super(props);
  
  }
  static defaultProps = {
    container: new Container(),
  }

  render() {
    const layers = this.props.container.layer_order
    const listItems = layers.map((layer_name) =>
      // Correct! Key should be specified inside the array.
      // <ListItem key={layer_name} name={layer_name} />
      <li key={layer_name}><LayerView key={layer_name} layer={this.props.container.layers[layer_name]} /></li>
    );

    return (
      <div className="containerview">
        <p>Model Container</p>        
        <p>Full input list</p>
        <ContainerVariablesView variables={this.props.container.variables}></ContainerVariablesView>
        <p>Layers ({layers.length}):</p>
        <ul>
          {listItems}
        </ul>
      </div>
    );
  }
}

export class ContainerVariablesView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const all_contained_variables = {}
    let s, ss
    let listItems = []
    let k = 0
    for (const layer_name in this.props.variables) {
      const layer = this.props.variables[layer_name];
      for (const unit_name in layer) {
        const vars_in_unit = layer[unit_name];
        for (const var_name in vars_in_unit) {
          const var_data = vars_in_unit[var_name];
          if(!all_contained_variables.hasOwnProperty(var_data)){
            all_contained_variables[var_name] = []
          }
          s = `as ${var_data.type} in ${layer_name} - ${unit_name}`
          all_contained_variables[var_name].push(s)
          ss = `${var_name} as ${var_data.type} in ${layer_name} - ${unit_name}`
          listItems.push(<ListItem key={k} name={ss} />)
          k += 1
        }
      }
    }
    return (
      <ul>
        {listItems}
      </ul>
    )
  }
}

export class ContainerInputManualView extends React.Component {
  // this component assumes the inputs do not have conflicts
  //it should not be created if there are problems
  constructor(props) {
    super(props);    

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {    
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.props.onChange(name, value);
  }

  renderTableHeader() {
    let header = ["Variable", "Value"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
 }

 renderTableData() {
   let listItems = []
   let in_el;
   for (const key in this.props.inputs) {
     if (this.props.inputs.hasOwnProperty(key)) {
       const element = this.props.inputs[key];
       const { name, type } = element
       //console.log(name, type, element, key)
      if(type == "num"){
          in_el = <input type="number" name={name} value={this.props.inputs[name].value} onChange={this.handleChange} />
      } else if(type == 'bool'){
          in_el = "TODO BOOL"
      } else {
          in_el = <input type="text" name={name} value={this.props.inputs[name].value} onChange={this.handleChange} />
      }
      listItems.push(<tr key={name}>
        <td>{name}</td>
        <td>{in_el}</td>
      </tr>)
     }
   }
   return ( listItems )
}

  render() {    
    return (
      <div>
            <table id='model-input'>
               <tbody>
                  <tr>{this.renderTableHeader()}</tr>
                  {this.renderTableData()}
               </tbody>
            </table>
         </div>
    )
  }
}

export class Workspace extends React.Component {
  constructor(props) {
    super(props);


    const all_good = Object.keys(this.props.container.inputs.usable)
    let all_inputs = {}
    for (const key of all_good) {
      all_inputs[key] = Object.assign({ 'value':undefined}, this.props.container.inputs.usable[key])
    }

    this.state = {
      container: this.props.container,
      available_units: {},
      user_input: all_inputs
    }
    this.container = this.props.container

    this.handleUnitAdded = this.handleUnitAdded.bind(this);
    this.handleFieldChange = this.handleFieldChange.bind(this);

  }
  static defaultProps = {
    container: new Container()
  }

  handleUnitAdded(unit_name, layer_name){
    //testing
    layer_name = 'layer1'
    let c = this.container
    //c.layers[layer_name].add_unit(this.state.available_units[unit_name])
    c.add_unit_to_layer(layer_name, this.state.available_units[unit_name])
    this.setState({container: c})
  }

  handleFieldChange(fieldId, value) {
    //console.log("handlefieldchange", fieldId, value)
    let s = this.state.user_input
    s[fieldId].value = value
    //console.log(s)
    this.setState({ user_input: s});
  }

  fetch_models(){
    //get available models from some db
    const m = [1, 2, 3, 4, 5]
    let models = {}
    for(const i in m){
      let name = 'Loaded Unit ' + String(i)
      let md = new Unit(name, new DummyModel(['x', 'y', i]))
      models[name] = md 
    }
    const au = {available_units: models}
    this.setState(au)
  }

  get_safe_layer_name(){
    let base = "Layer_"
    let i = 0
    let ln = base + String(i)
    while(this.container.layers.hasOwnProperty(ln)){
      i += 1
      ln = base + String(i)
    }
    return ln;
  }

  add_layer(){
    const ln = this.get_safe_layer_name()
    let c = this.container
    let l = new Layer(ln)
    c.add_layer(l)
    this.setState({container: c})
  }

  render() {
    const model_can_build = Object.keys(this.state.container.inputs.conflict).length == 0;

    const listItems = Object.keys(this.state.available_units).map((unit_name) =>
    <div className="col"><UnitAvailableView key={unit_name} unit={this.state.available_units[unit_name]} handleUnitAdded={this.handleUnitAdded}/></div>
    );
    return (
      <div className="container">
        <div className="row">
          <div className="col">
          <p>Project: {this.props.project_name}</p>
          <button type="button" className="btn btn-primary" onClick={() => this.fetch_models()}>Load Models</button>
          </div>
        </div>

        <div className="row">
          <div className="col">
          <p>Model input</p>
          <p>Model can build: {model_can_build.toString()}</p>
        <ContainerInputManualView inputs={this.state.user_input} onChange={this.handleFieldChange}></ContainerInputManualView>
          </div>
        </div>
        

        <div className="row">
            {listItems}
        </div>

        <div className="row">
        <div className="col">

        <ContainerView container={this.state.container}></ContainerView>
        </div>
        </div>

        <div className="row">
        <div className="col">
        <div className="card border-dark text-center mb-3 add-layer-box" >
          <div class="card-body text-secondary" onClick={() => this.add_layer()}>
            <h1>+</h1>
            <p>Add new layer</p>
          </div>
        </div>
        </div>
        </div>

      </div>
    );
  }
}