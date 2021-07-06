import React from 'react';
import {Unit, Layer, DummyModel, EsynDecisionTree, ModelState} from './script.js';
import { GraphContainer } from './GraphContainer.js';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from "cytoscape";
import Select from 'react-select';
import CsvDownloader from 'react-csv-downloader';
import CSVReader from 'react-csv-reader'
import styled from 'styled-components'
import { useTable, usePagination } from 'react-table'


class ContainerNotRecognisedError extends Error {
	constructor(message) {
	  super(message);
	  this.name = "ContainerNotRecognisedError";
	}
}

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

export class ListOfItems extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const listItems = this.props.items.map((name) =>
    // Correct! Key should be specified inside the array.
    <li key={name}>{name}</li>
  );
    return (
      <ul>
        {listItems}
      </ul>
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
        <p>Unit Name: {this.props.unit_name}</p>
        <p>Model Name: {this.props.unit.name}</p>
        <p>Output type: {this.props.unit.output_type}</p>
        <p>Unit Varaibles:</p>
        <ul>
          {listItems}
        </ul>
      <ModelStateView modelstate={this.props.result}></ModelStateView>
      </div>
    );
  }
}

export class UnitResultView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {

    return (
      <div>
        <p>{this.props.unit_name} ({this.props.unit.name}) </p>
        <ModelStateView modelstate={this.props.result}></ModelStateView>
      </div>
    );
  }
}

export class ModelStateView extends React.Component {
  constructor(props) {
    super(props);
  }

  static defaultProps = {
    modelstate: new ModelState,
  }

  render() {
    const status = this.props.modelstate.status
    const msg = this.props.modelstate.message
    const val = String(this.props.modelstate.value)
    return (
      <p>
      Unit result: {status}, {val} ({msg})
      </p>
    );
  }
}

export class UnitAvailableView extends React.Component {
  constructor(props) {
    super(props);

    this.handleDelete = this.handleDelete.bind(this)
  }

  handleDelete(){
    this.props.handleDelete(this.props.unit_key)
  }

  render() {
    const variables = Object.keys(this.props.unit.variables)
    const listItems = variables.map((var_name) =>
      // Correct! Key should be specified inside the array.
      <ListItem key={var_name} name={var_name} />
    );
    return (
      <div className="card available-unit-card">
      <div className="card-header">
        {this.props.unit.name}
      </div>
      <div className="card-body">
      <p>Output type: {this.props.unit.output_type}</p>
      <p>Calculator mode: {this.props.unit.model.metadata.calculator_mode}</p>
      <p>Unit Varaibles:</p>
        <ul>
          {listItems}
        </ul>
      </div>
      <div className="card-footer">
      <button type="button" className="btn btn-danger btn-sm" onClick={this.handleDelete}>Delete</button>
      </div>
      </div>
    );
  }
}

export class EsynAvailableView extends React.Component {
  constructor(props) {
    super(props);

    this.handleCreate = this.handleCreate.bind(this)
  }

  handleCreate(){
    console.log("trying to create a unit for project", this.props.unit.projectid)
    this.props.handleUnitAdded(this.props.unit.projectid, this.props.unit_key)
  }

  render() {

    return (
      <div className="card available-unit-card">
      <div className="card-header">
        {this.props.unit_key}
      </div>
      <div className="card-body">
        Last edited: {this.props.unit.last_edited}
      <button onClick={this.handleCreate}>Create unit</button>
      </div>
      <div className="card-footer">
      </div>
      </div>
    );
  }
}

export class EsynAvailableRow extends React.Component {
  constructor(props) {
    super(props);

    this.handleCreate = this.handleCreate.bind(this)
  }

  handleCreate(){
    console.log("trying to create a unit for project", this.props.project.projectid)
    this.props.handleUnitAdded(this.props.project.projectid, this.props.project.label)
  }

  render() {
    const btn_label = this.props.name_taken ? "Name in use" : "Create unit"
    return (
      <tr key={this.props.i}><td>{this.props.project.label}</td><td>{this.props.project.last_edited}</td><td><button onClick={this.handleCreate} disabled={this.props.name_taken}>{btn_label}</button></td></tr>
    );
  }
}

export class EsynAvailableTable extends React.Component {
  constructor(props) {
    super(props);
  }

  renderTableHeader() {
    let header = ["Name", "Last Modified", "Actions"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
 }

 renderTableData() {
   let listItems = []
   let i = 0
   const existing = new Set(this.props.existing)
    for(const [pg, proj] of Object.entries(this.props.projects)){
      listItems.push(<tr key={i}><td colSpan={3}><b>{pg}</b></td></tr>)
      i += 1
      for(const project of proj){
        listItems.push(<EsynAvailableRow key={i} project={project} handleUnitAdded={this.props.handleUnitAdded} name_taken={existing.has(project.label)}></EsynAvailableRow>)
        i += 1
      }
    }


   return ( listItems )
  }


  render() {

    return (
      <div>
      <table id='esyn-available-projects' className="model-input-table table">
        <tbody>
          <tr>{this.renderTableHeader()}</tr>
          {this.renderTableData()}
        </tbody>
      </table>
      </div>
    );
  }
  
}

export class UnitAdderView extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const l = els.layer.value
    const u = els.unit.value
    const n = els.name.value == "" ? u : els.name.value
    console.log(`send request to add ${u} to ${l} with name ${n}`)
    this.props.handleUnitAdded(u, l, n)
  }

  render() {
    const layeropts = this.props.layers.map((x) => <option key={x}>{x}</option>)
    const unitopts = this.props.units.map((x) => <option key={x}>{x}</option>)
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group row">
        <label htmlFor='adder-unit-select' className="col-sm-2 col-form-label">
        Add Unit 
        </label>
        <div className="col-sm-10">
        <select id='adder-unit-select' className="custom-select" onChange={this.handleChange} name="unit">
          {unitopts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-layer-select' className="col-sm-2 col-form-label">
        To Layer
        </label>
        <div className="col-sm-10">
        <select id='adder-layer-select' className="custom-select" onChange={this.handleChange} name="layer">
          {layeropts}
        </select> 
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-name-select' className="col-sm-2 col-form-label">
        With name
        </label>
        <div className="col-sm-10">
        <input type="text" name="name" id='adder-name-select' className="form-control"></input>
        </div>
        </div>

        <input type="submit" value="Add to model" className="btn btn-primary btn-block"/>
      </form>
    );
  }
}

export class GraphContainerNodeControls extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const l = els.layer.value
    const u = els.unit.value
    const n = els.name.value == "" ? u : els.name.value
    console.log(`send request to add ${u} to ${l} with name ${n}`)
    this.props.handleUnitAdded(u, l, n)
  }

  render() {
    const layeropts = this.props.layers.map((x) => <option key={x}>{x}</option>)
    const unitopts = this.props.units.map((x) => <option key={x}>{x}</option>)
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group row">
        <label htmlFor='adder-unit-select' className="col-sm-2 col-form-label">
        Add Unit 
        </label>
        <div className="col-sm-10">
        <select id='adder-unit-select' className="custom-select" onChange={this.handleChange} name="unit">
          {unitopts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-compute-select' className="col-sm-2 col-form-label">
        To Compute Node
        </label>
        <div className="col-sm-10">
        <select id='adder-compute-select' className="custom-select" name="layer">
          {layeropts}
        </select> 
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-name-select' className="col-sm-2 col-form-label">
        With name
        </label>
        <div className="col-sm-10">
        <input type="text" name="name" placeholder="Selected unit name" id='adder-name-select' className="form-control"></input>
        </div>
        </div>

        <input type="submit" value="Add to model" className="btn btn-primary btn-block"/>
      </form>
    );
  }
}

export class GraphContainerEdgeControls extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const s = els.layer1.value
    const t = els.layer2.value

    this.props.handleEdgeAdded(s, t)
  }

  render() {
    const layeropts = this.props.layers.map((x) => <option key={x}>{x}</option>)
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group row">
        <label htmlFor='adder-source-select' className="col-sm-2 col-form-label">
        Source
        </label>
        <div className="col-sm-10">
        <select id='adder-source-select' className="custom-select" onChange={this.handleChange} name="layer1">
          {layeropts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-target-select' className="col-sm-2 col-form-label">
        Target
        </label>
        <div className="col-sm-10">
        <select id='adder-target-select' className="custom-select" onChange={this.handleChange} name="layer2">
          {layeropts}
        </select> 
        </div>
        </div>

        <input type="submit" value="Add to model" className="btn btn-primary btn-block"/>
      </form>
    );
  }
}

export class GraphContainerConditionControls extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleValueChange = this.handleValueChange.bind(this);
    this.state ={
      type:"blank",
      condition_value: undefined
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const variable = els['cond-var-select'].value
    const operation = els['cond-op-select'].value
    const value_raw = els['cond-value'].value
    const type = this.state.type
    let value
    if(type === 'radio'){
      value = value_raw
    } else if(type === 'number') {
      value = parseFloat(value_raw)
    } else {
      value = value_raw
    }
    const ok = this.props.handleConditionAdded(this.props.label_id, variable, operation, value, type)
    if(ok){
      event.target.reset()
    }
  }

  handleValueChange(value) {
    this.setState({'condition_value': value})
  }

  handleChange(event){
    const target = event.target;

    const name = target.value;
    let type
    console.log("checking type for ", name)
    if(this.props.variables.hasOwnProperty(name)){
      type = this.props.variables[name].type
    } else {
      type = 'blank'
    }
    
    this.setState({type: type})
  }

  render() {
    const variable_opts = Object.keys(this.props.variables).map((x) => <option key={x}>{x}</option>)
    const ops = ['=', '!=', '>', '>=', '<', '<=']
    const operator_opts = ops.map((x) => <option key={x}>{x}</option>)
    const type = this.state.type
    const id_true = `cond_value_true`
    const id_false = `cond_value_false`
    const id_unknown = `cond_value_unknown`

    //work out what the value type is
    let in_el

    if(type == "num"){
      in_el = <input type="number" name='cond-value' className="form-check-input"  />
    } else if(type == 'bool'){
      in_el = (<div>
        <div className="form-check">
        <input
          id={id_true}
          type="radio"
          name='cond-value'
          value="True"
          className="form-check-input"
        />
        <label htmlFor={id_true} className="form-check-label">
        True
      </label>
      </div>
      
      <div className="form-check">
      <input
        id={id_false}
        type="radio"
        name='cond-value'
        value="False"
        className="form-check-input"
      />
      <label htmlFor={id_false} className="form-check-label">
      False
      </label>
      </div>
      
      <div className="form-check">
      <input
        id={id_unknown}
        type="radio"
        name='cond-value'
        value="" //an empty string is unknown for a bool var
        className="form-check-input"
      />
      <label htmlFor={id_unknown} className="form-check-label">
      Unknown
    </label>
    </div>
    </div>)
    } else if(type=='str'){
      in_el = <input type="text" name='cond-value' className="form-check-input"  />
    } else {
      in_el = <input type="text" name='cond-value' className="form-check-input" disabled='disabled'/>
    }
    return (
      <form onSubmit={this.handleSubmit} id='condition_edit_form'>
        <div className="form-group row">
        <label htmlFor='cond-var-select' className="col-sm-2 col-form-label">
        Variable
        </label>
        <div className="col-sm-10">
        <select id='cond-var-select' className="custom-select" onChange={this.handleChange} name="variable_name">
          <option></option>
          {variable_opts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='cond-op-select' className="col-sm-2 col-form-label">
        Operator
        </label>
        <div className="col-sm-10">
        <select id='cond-op-select' className="custom-select" name="variable_name">
          {operator_opts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='cond-val-select' className="col-sm-2 col-form-label">
        Value
        </label>
        <div className="col-sm-10">
        {in_el}
        </div>
        </div>

        <input type="submit" value="Add to model" className="btn btn-primary btn-block"/>
      </form>
    );
  }
}

export class GraphContainerConditionList extends React.Component {
  constructor(props) {
    super(props);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.state = {'selected': []}
  }

  handleDelete() {
    this.props.handleDelete(this.props.label_id, this.state.selected)
  }

  handleChange(event){
    const sel = event.target.selectedOptions
    let opts = [],
    opt;
    let len = sel.length;
    for (let i = 0; i < len; i++) {
      opt = sel[i].value;
      opts.push(opt);
    }
    this.setState({'selected':opts})
  }

  render() {
    const n_conditions = this.props.conditions.length
    const conds = this.props.conditions.map((x) => <option key={x.cond_str}>{x.cond_str}</option>)
    return (
      <div>
        Conditions: {n_conditions}
      <select id='cond-list-select' multiple="multiple" onChange={this.handleChange}>{conds}</select>
      <button onClick={this.handleDelete}>Delete Selected</button>
      </div>
    );
  }
}

export class UnitLinkView extends React.Component {
  constructor(props) {
    /*
    layers
    links
    variables = state.container.inputs.usable
    */
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onLayerChange = this.onLayerChange.bind(this);
    this.state = {layer:undefined}
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const l = els.layer.value
    const u = els.unit.value
    const v = els.variable.value
    console.log(`send request to link ${u} to ${v} in layer ${l}`)
    const ok = this.props.handleLinkAdded(l, u, v)
    return ok
  }

  onLayerChange(event) {
    this.setState({'layer': event.target.value})
  }

  renderTableHeader() {
    let header = ["Variable", "Used", "Linked", "Actions"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
  }

 renderTableData() {
  const linked_vars = this.props.links.get_linked_variables()
  const listItems = linked_vars.map((vname) =>
    // Correct! Key should be specified inside the array.
    <tr key={vname}><td>
      {vname}
      </td>
      <td>{this.props.variables[vname].appears.join(', ')}</td>
      <td>{this.props.links.get_variable_str(vname)}</td>
      <td><button className="btn btn-sm btn-warning" onClick={() => this.props.handleLinkDeleted(vname)}>Unlink</button></td></tr>
  );

   return ( listItems )
  }

  render() {
    const variableopts = [<option key={''}>Select a variable</option>].concat(Object.keys(this.props.variables).map((x) => <option key={x}>{x}</option>))
    const layeropts = [<option key={''}>Select a layer</option>].concat(Object.keys(this.props.layer2units).map((x) => <option key={x}>{x}</option>))
    let unitopts = []
    if (this.props.layer2units.hasOwnProperty(this.state.layer)){
      unitopts = this.props.layer2units[this.state.layer].map((x) => <option key={x}>{x}</option>)
    }
    
    // const variableopts = 
    return (
      <div>
      <form onSubmit={this.handleSubmit}>
        <div className="form-group row">
        <label htmlFor='link-var-select' className="col-sm-2 col-form-label">
        Link value of variable
        </label>
        <div className="col-sm-10">
        <select id='link-var-select' className="custom-select" name="variable">
          {variableopts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='link-layer-select' className="col-sm-2 col-form-label">
        To result from node:
        </label>
        <div className="col-sm-10">
        <select id='link-layer-select' className="custom-select" onChange={this.onLayerChange} name="layer" value={this.state.layer} >
          {layeropts}
        </select> 
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='link-unit-select' className="col-sm-2 col-form-label">
        Unit:
        </label>
        <div className="col-sm-10">
        <select id='link-unit-select' className="custom-select" onChange={this.handleChange} name="unit">
          {unitopts}
        </select> 
        </div>
        </div>

        <input type="submit" value="Add to model" className="btn btn-primary btn-block"/>
      </form>
      <table className="model-input-table table">
        <tbody>
          <tr>{this.renderTableHeader()}</tr>
          {this.renderTableData()}
        </tbody>
      </table>
      </div>
    );
  }
}

export class ComputeNodeView extends React.Component {
  constructor(props) {
    super(props);
    this.handleRename = this.handleRename.bind(this);
    this.handleUnitRename = this.handleUnitRename.bind(this);
    this.handleUnitDelete = this.handleUnitDelete.bind(this);
  }

  handleRename(){
    const new_name = document.getElementById('layer-rename-value').value
    const old_name = this.props.layer_data.name
    console.log('sending rename from',old_name,'to',new_name)
    this.props.handleNodeRename(old_name, new_name)
    document.getElementById('layer-rename-value').value = ''
  }

  handleUnitRename(){
    //send to
    //this.props.handleUnitRenameInLayer()
    const new_name = document.getElementById('new_unit_name_in_layer').value
    const old_name = document.getElementById('old_unit_name_in_layer').value
    const done = this.props.handleUnitRenameInLayer(this.props.layer_data.name, old_name, new_name)
    if(done){
      document.getElementById('new_unit_name_in_layer').value = ''
    }
  }
  
  handleUnitDelete(){
    const old_name = document.getElementById('old_unit_name_in_layer').value
    this.props.handleUnitDeleteInLayer(this.props.layer_data.name, old_name)
  }

  render() {
    const name = this.props.node_id
    let current_unit_names
    if(this.props.layer_data !== undefined){
      current_unit_names = Object.keys(this.props.layer_data.units).map((x) => <option key={x}>{x}</option>)
    }
    
    return (
      <div>
      <p>Compute {this.props.node_id}</p>
      <input id='layer-rename-value' type='text' defaultValue={name}></input>
      <button className='btn btn-primary' onClick={this.handleRename}>Rename Node</button>
      <LayerViewQuick layer={this.props.layer_data} renameUnit={this.props.handleUnitRenameInLayer}/>
      <p>Rename a unit in this layer</p>
      <select id='old_unit_name_in_layer'>{current_unit_names}</select>
      <input type='text' placeholder="New name" id='new_unit_name_in_layer'></input>
      <button type='button' onClick={this.handleUnitRename} className='btn btn-success'>Rename</button>
      <button type='button' onClick={this.handleUnitDelete} className='btn btn-danger'>Delete</button>
      </div>
    );
  }
}

export class LabelNodeView extends React.Component {
  constructor(props) {
    /*
    node_id
    handleConditionAdded
    handleConditionDeleted
    variables (from Workspace.state.user_input)
    conditions
    handleNodeDeleted
    */
    super(props);
    this.handleDelete = this.handleDelete.bind(this);
  }

  handleDelete(){
    this.props.handleNodeDeleted(this.props.node_id)
  }

  render() {
    const n_conditions = this.props.conditions.length
    return (
      <div>
      <p>Label {this.props.node_id}</p>
      <button type="button" className="btn btn-danger" onClick={this.handleDelete}>Delete Edge</button>
      <h4>Conditions</h4>
      <h5>Add condition</h5>
      <GraphContainerConditionControls 
      handleConditionAdded={this.props.handleConditionAdded} 
      variables={this.props.variables}
      label_id={this.props.node_id}
      >
      </GraphContainerConditionControls>
      <h5>Current conditions {n_conditions}</h5>
      <GraphContainerConditionList 
      conditions={this.props.conditions}
      handleDelete={this.props.handleConditionDeleted}
      label_id={this.props.node_id}
      ></GraphContainerConditionList>
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
    if(this.props.layer === undefined){
      return (<p>Empty</p>)
    }
    const units = Object.keys(this.props.layer.units)
    const listItems = units.map((unit_name) =>
      // Correct! Key should be specified inside the array.
      <li key={unit_name}><UnitView key={unit_name} unit_name={unit_name} unit={this.props.layer.units[unit_name]} result={this.props.layer.state[unit_name]}/></li>
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

export class LayerResultView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if(this.props.layer === undefined){
      return (<p>Empty</p>)
    }
    const units = Object.keys(this.props.layer.units)
    const listItems = units.map((unit_name) =>
      // Correct! Key should be specified inside the array.
      <li key={unit_name}><UnitResultView key={unit_name} unit_name={unit_name} unit={this.props.layer.units[unit_name]} result={this.props.layer.state[unit_name]}/></li>
    );

    return (
      <div>
        <p>{this.props.layer.name} ({this.props.layer.size} units)</p>
          <ul>
            {listItems}
          </ul> 
      </div>
    );
  }
}

export class LayerViewQuick extends React.Component {
  constructor(props) {
    super(props);
  }

  renderTableHeader() {
    let header = ["Name", "Unit", "Actions"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
  }

 renderTableData() {
  const units = Object.keys(this.props.layer.units)
  const listItems = units.map((unit_name) =>
    // Correct! Key should be specified inside the array.
    <tr key={unit_name}><td>
      {unit_name}
      </td><td>{this.props.layer.units[unit_name].name}</td>
      <td>actions/warnings</td></tr>
  );

   return ( listItems )
  }


  render() {

    if(this.props.layer === undefined){
      return (<p>Empty</p>)
    }
    return (
      // <div>
      //   <p>Unit: {this.props.unit_name} ({this.props.unit.name})</p>
      //   <p>Output type: {this.props.unit.output_type}</p>
      //   <p>Unit Varaibles: {variables.length}</p>
      // <ModelStateView modelstate={this.props.result}></ModelStateView>
      // </div>
      <table id='selected-node-contains' className="model-input-table table">
        <tbody>
          <tr>{this.renderTableHeader()}</tr>
          {this.renderTableData()}
        </tbody>
      </table>
    );
  }
  
}

export class ContainerView extends React.Component {
  constructor(props) {
    super(props);
  
  }
  static defaultProps = {
    container: new GraphContainer(),
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

export class RuleListRow extends React.Component {
  constructor(props) {
    super(props);

  }

  render() {
    let then
    if(this.props.rule['then'].hasOwnProperty('str')){
        then = this.props.rule['then']['set_variable'] + " = " + this.props.rule['then']['str']
    } else{
        then = "Input not valid"
    }
    return (
      <tr key={this.props.i}>
        <td>{this.props.name}</td>
        <td>{this.props.rule.if_str}</td>
        <td>{then}</td>
        <td>
          <button className="btn btn-danger btn-sm" onClick={() => this.props.handleDelete(this.props.name)}>Delete</button>
          </td>
        </tr>
    );
  }
}

export class RuleList extends React.Component {
  constructor(props){
    super(props);
  }

  renderTableHeader() {
    let header = ["Rule", "Condition", "Output", "Actions"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
 }

 renderTableData() {
   let listItems = []
   let i = 0
   //for a header row listItems.push(<tr key={i}><td colSpan={3}><b>{pg}</b></td></tr>); i++
    for(const [rule_name, rule] of Object.entries(this.props.rules)){
      listItems.push(<RuleListRow key={i} name={rule_name} rule={rule} handleDelete={this.props.handleDelete}></RuleListRow>)
      i += 1
    }
   return ( listItems )
  }


  render() {

    return (
      <div>
        <h4>Current Calculators and Rules</h4>
      <table id='re-active-rule-list' className="model-input-table table">
        <tbody>
          <tr>{this.renderTableHeader()}</tr>
          {this.renderTableData()}
        </tbody>
      </table>
      </div>
    );
  }
}

export class RuleEditor extends React.Component {
  constructor(props){
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const rule_name = els.rule_name.value
    const if_str = els.rule_string.value
    const then_str = "not-valid"
    const then_rule = ""
    const set_val_of = ""

    const ok = this.props.handleAdded(rule_name, if_str, then_str, set_val_of, then_rule)
    if(ok){
      event.target.reset()
    }
  }

  render() {


    return (
      <div>
        <h4>Add Rule</h4>

        <br />
        <form onSubmit={this.handleSubmit}>

        <div className="form-group row">
        <label htmlFor='re-rule-name' className="col-sm-2 col-form-label">
        Rule Name
        </label>
        <div className="col-sm-10">
        <input type="text" name="rule_name" id="re-rule-name" className="form-control" placeholder="Text"></input>
        </div>
        </div>


        <div className="form-group row">
        <label htmlFor='re-rule-string' className="col-sm-2 col-form-label">
        Do not run IF:
        </label>
        <div className="col-sm-10">
        <input type="text" name="rule_string" id="re-rule-string" className="form-control" placeholder="Formula"></input>
        </div>
        </div>

        <input type="submit" value="Create Rule" className="btn btn-primary btn-block"/>

      </form>
      </div>

    )
  }
}

export class CalculatorEditor extends React.Component {
  constructor(props){
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(event) {
    event.preventDefault();
    let els = event.target.elements
    const rule_name = els.rule_name.value
    const if_str = els.rule_string.value
    const then_str = "set-val"
    const then_rule = els.rule_value.value
    const set_val_of = els.set_val_of.value


    const ok = this.props.handleAdded(rule_name, if_str, then_str, set_val_of, then_rule)
    if(ok){
      event.target.reset()
    }
  }

  render() {


    const varopts = this.props.variables.map((x) => <option key={x} value={x}>{x}</option>)

    return (
      <div>
        <h4>Add Calculator</h4>

        <br />
        <form onSubmit={this.handleSubmit}>

        <div className="form-group row">
        <label htmlFor='ce-rule-name' className="col-sm-2 col-form-label">
        Calculator Name
        </label>
        <div className="col-sm-10">
        <input type="text" name="rule_name" id="ce-rule-name" className="form-control" placeholder="Text"></input>
        </div>
        </div>


        <div className="form-group row">
        <label htmlFor='ce-rule-string' className="col-sm-2 col-form-label">
        IF
        </label>
        <div className="col-sm-10">
        <input type="text" name="rule_string" id="ce-rule-string" className="form-control" placeholder="Formula"></input>
        </div>
        </div>


        <div className="form-group row">
        <label htmlFor='ce-set-val-of' className="col-sm-2 col-form-label">
        Then set value of
        </label>
        <div className="col-sm-10">
        <select id='ce-set-val-of' className="custom-select" name="set_val_of">
          {varopts}
        </select>
        </div>
        </div>


        <div className="form-group row">
        <label htmlFor='ce-rule-value' className="col-sm-2 col-form-label">
        Set value to
        </label>
        <div className="col-sm-10">
        <input type="text" name="rule_value" id="ce-rule-value" className="form-control" placeholder="Formula"></input>
        </div>
        </div>

        <input type="submit" value="Create Calculator" className="btn btn-primary btn-block"/>

      </form>
      </div>

    )
  }
}

export class ResultsView extends React.Component {
  constructor(props) {
    super(props);
  
  }
  static defaultProps = {
    container: new GraphContainer(),
  }

  render() {
    const layers = this.props.container.layer_order
    let listItems = layers.map((layer_name) =>
      // Correct! Key should be specified inside the array.
      // <ListItem key={layer_name} name={layer_name} />
      <li key={layer_name}><LayerResultView key={layer_name} layer={this.props.container.layers[layer_name]} /></li>
    );
    if (listItems.length == 0){
      listItems = [<li key={1}>Nothing to display</li>]
    }

    return (
      <div className="containerresultview">
        <p>Full Results</p>        
        <ul>
          {listItems}
        </ul>
      </div>
    );
  }
}

export class VariableUIGroups extends React.Component {
  constructor(props) {
    super(props);
    this.state = {selectedGroup: null, selectedVariable: null}
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleSubmitUIGroups = this.handleSubmitUIGroups.bind(this)
  }

  handleChangeGroup = (selectedOption) => {
	  this.setState({ selectedGroup: selectedOption });
	}
  
	handleChangeVariable = (selectedOption) => {
	  this.setState({ selectedVariable: selectedOption });
	}

  handleSubmit(event){
    event.preventDefault();
	  let els = event.target.elements
	  const group_name = els.new_group_name.value
  
	  const ok = this.props.handleGroupAdded(group_name)
	  if(ok){
		  event.target.reset()
	  }
  }

  handleSubmitUIGroups(event){
    event.preventDefault();
    const variables = this.state.selectedVariable.map((x) => x.value)
	  const group = this.state.selectedGroup.value
    const ok = this.props.handleUIGroupUpdate(group, variables)
	  if(ok){
		  this.setState({selectedGroup: null, selectedVariable: null})
	  }
  }

  render() {
    const groups = Object.keys(this.props.groups)
    let listItems = groups.map((group_name) =>
      // Correct! Key should be specified inside the array.
      // <ListItem key={layer_name} name={layer_name} />
        <ul key={group_name}>
      <li >{group_name}</li>
      <ListOfItems items={this.props.groups[group_name]}/>
      </ul>
      
    );
    if (listItems.length == 0){
      listItems = [<li key={1}>Nothing to display</li>]
    }

    //list of variables for multiselect
    let listVariables = this.props.variables.map((var_name) =>
      ({value:var_name, label:var_name})
     );
    
    let listGroups = Object.keys(this.props.groups).map((group_name) =>
     ({value:group_name, label:group_name})
    );


    return (
      <div>
        <form onSubmit={this.handleSubmit}>
  
        <div className="form-group row">
        <label htmlFor='new_ui_group' className="col-sm-2 col-form-label">
        New UI Group
        </label>
        <div className="col-sm-10">
        <input type="text" name="new_group_name" id="new_ui_group" className="form-control" placeholder="New group name"></input>
        </div>
        </div>
        <input type="submit" value="Add" className="btn btn-primary btn-block"/>
        </form>

        <p>Current groups</p>        
        
          {listItems}
        

        <h5>Assign groups</h5>
        <form>
		  <div className="form-group row">
		  <label htmlFor='multi-variable-select' className="col-sm-2 col-form-label">
		  Select Variables
		  </label>
		  <div id="multi-variable-select" className="col-sm-10">
		  <Select
			 onChange={this.handleChangeVariable}
			 options={listVariables}
			 isMulti
			 closeMenuOnSelect={false}
       value={this.state.selectedVariable}
		   />
		  </div>
		  </div>
		  
		  <div className="form-group row">
		  <label htmlFor='multi-group-select' className="col-sm-2 col-form-label">
		  Select Group
		  </label>
		  <div className="col-sm-10">
			<div id="multi-group-select">
			<Select
			 onChange={this.handleChangeGroup}
			 options={listGroups}
       value={this.state.selectedGroup}
		   />
		   </div>
		  </div>
		  </div>
				 
		   <button className="btn btn-primary btn-block" onClick={this.handleSubmitUIGroups}>Update</button>
		   </form>
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
    let value
 
    if(target.type === 'radio'){
      value = target.value
    } else if(target.type === 'number') {
      value = parseFloat(target.value)
    } else {
      value = target.value
    }

    const name = target.name;
    //console.log('handlechange', name, value)
    this.props.onChange(name, value);
  }

  renderTableHeader() {
    let header = ["Variable", "Value", "Link", "Calculator"]
    return header.map((key, index) => {
       return <th key={index}>{key}</th>
    })
 }

 renderTableData() {
   let listItems = []
   let in_el, gr;
   //TODO change this to use props.dt_ui_groups
   for (const [group, vs] of Object.entries(this.props.dt_ui_groups)){
      //label row
      gr = `___${group}___`
      listItems.push(<tr key={gr}>
        <td><strong>{group}</strong></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>)
      //variable rows
      for (const key of vs) {
        if (this.props.inputs.hasOwnProperty(key)) {
          const element = this.props.inputs[key];
          const { name, type, value, state } = element
          const id_true = `${name}_true`
          const id_false = `${name}_false`
          const id_unknown = `${name}_unknown`
          const set_by = this.props.unit2input.get_variable_str(name)
          let calc_by = this.props.variable2calculator[name] === undefined ?  [] : this.props.variable2calculator[name]
          const calculated_by = calc_by.join(', ')
          //console.log('creating input el for ',name, type, value)
          let badge
          if(state == "warn"){
           badge = <span className="badge badge-pill badge-warning">Warning</span>
          } else {
           badge = <span></span>
          }
         if(type == "num"){
             in_el = <input type="number" name={name} value={value} className="form-check-input" onChange={this.handleChange} />
         } else if(type == 'bool'){
             in_el = (<div>
               <div className="form-check">
               <input
                 id={id_true}
                 type="radio"
                 name={name}
                 value="True"
                 checked={value === "True"}
                 className="form-check-input"
                 onChange={this.handleChange} 
               />
               <label htmlFor={id_true} className="form-check-label">
               True
             </label>
             </div>
             
             <div className="form-check">
             <input
               id={id_false}
               type="radio"
               name={name}
               value="False"
               checked={value === "False"}
               className="form-check-input"
               onChange={this.handleChange} 
             />
             <label htmlFor={id_false} className="form-check-label">
             False
           </label>
           </div>
           
           <div className="form-check">
           <input
             id={id_unknown}
             type="radio"
             name={name}
             value=""
             checked={value === ""}
             className="form-check-input"
             onChange={this.handleChange} 
           />
           <label htmlFor={id_unknown} className="form-check-label">
           Unknown
         </label>
         </div>
         </div>)
         } else {
             in_el = <input type="text" name={name} value={value} className="form-check-input" onChange={this.handleChange} />
         }
         listItems.push(<tr key={name}>
           <td>{name}{badge}</td>
           <td>{in_el}</td>
           <td>{set_by}</td>
           <td>{calculated_by}</td>
         </tr>)
        }
      }
   }
   
   return ( listItems )
}

  render() {    
    return (
      <div>
            <table id='model-input' className="model-input-table table">
               <tbody>
                  <tr>{this.renderTableHeader()}</tr>
                  {this.renderTableData()}
               </tbody>
            </table>
         </div>
    )
  }
}

class FileInput extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.fileInput = React.createRef();
    this.state ={
      file:null,
      content:null
    }
  }
  handleSubmit(event) {
    event.preventDefault();
    this.setState({file:this.fileInput.current.files[0]})
    const fname = this.fileInput.current.files[0].name
    var reader = new FileReader();
		//define function to run when reader is done loading the file
    reader.onloadend = () => {
      if(this.props.mode == "EsynDecisionTree"){
        let esyn_model = new EsynDecisionTree(JSON.parse(reader.result))
        let esyn_unit = new Unit(fname, esyn_model)
        this.props.handleUpload(esyn_unit)
        this.setState({content:esyn_unit})
      } else if(this.props.mode == "Workspace"){
        let ws = JSON.parse(reader.result)
        this.props.handleUpload(ws)
        this.setState({content:ws})
      } else {
        console.log("upload type not implemented")
      }
      
    }
    reader.readAsText(this.fileInput.current.files[0])
  }


  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          Upload {this.props.msg}:
          <input type="file" ref={this.fileInput} />
        </label>
        <br />
        <button type="button" className="btn btn-primary" type="submit">Upload</button>
      </form>
    );
  }
}

// export class TypedInputView extends React.Component {
//   constructor(props) {
//     super(props);
//     this.handleChange = this.handleChange.bind(this)
//   }

//   handleChange(event) {    
//     const target = event.target;
//     let value
//     console.log("TIV", target.type)
//     console.log("TIV value", target.value)
 
//     if(target.type === 'radio'){
//       value = target.value
//     } else if(target.type === 'number') {
//       value = parseFloat(target.value)
//     } else {
//       value = target.value
//     }

//     const name = target.name;
//     //console.log('handlechange', name, value)
//     this.props.onChange(value);
//   }

//   render() {
//     const type = this.props.type
//     const name = this.props.name
//     const value = this.props.value
//     const id_true = `${name}_true`
//     const id_false = `${name}_false`
//     const id_unknown = `${name}_unknown`
//     let in_el

//     if(type == "num"){
//       in_el = <input type="number" name={name} value={value} className="form-check-input" onChange={this.handleChange} />
//   } else if(type == 'bool'){
//       in_el = (<div>
//         <div className="form-check">
//         <input
//           id={id_true}
//           type="radio"
//           name={name}
//           value="True"
//           checked={value === "True"}
//           className="form-check-input"
//           onChange={this.handleChange} 
//         />
//         <label htmlFor={id_true} className="form-check-label">
//         True
//       </label>
//       </div>
      
//       <div className="form-check">
//       <input
//         id={id_false}
//         type="radio"
//         name={name}
//         value="False"
//         checked={value === "False"}
//         className="form-check-input"
//         onChange={this.handleChange} 
//       />
//       <label htmlFor={id_false} className="form-check-label">
//       False
//     </label>
//     </div>
    
//     <div className="form-check">
//     <input
//       id={id_unknown}
//       type="radio"
//       name={name}
//       value="Unknown"
//       checked={value === "Unknown"}
//       className="form-check-input"
//       onChange={this.handleChange} 
//     />
//     <label htmlFor={id_unknown} className="form-check-label">
//     Unknown
//   </label>
//   </div>
//   </div>)
//   } else if(type=='str'){
//       in_el = <input type="text" name={name} value={value} className="form-check-input" onChange={this.handleChange} />
//     } else {
//       in_el = <input type="text" name={name} className="form-check-input" disabled='disabled'/>
//     }
//     return (
//       in_el
//     )
//   }
// }

export class MultiSelect extends React.Component {
  constructor(props){
    super(props)
    this.state = {selectedOption: null, selectedLayer: null}
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleChange = (selectedOption) => {
    this.setState({ selectedOption: selectedOption });
  }

  handleChangeLayer = (selectedOption) => {
    this.setState({ selectedLayer: selectedOption });
  }

  handleSubmit () {
    const selected = this.state.selectedOption.map((x) => x.value)
    const layer = this.state.selectedLayer.value
    this.props.handleSubmit(selected, layer)
  }

  render () {
    let listItems = []
    for(const unit_name of this.props.options){
      listItems.push({value:unit_name, label:unit_name})
    }

    let listLayers = []
    for(const layer_name of this.props.layers){
      listLayers.push({value:layer_name, label:layer_name})
    }

    
    return (
      <div>
        <form>
        <div className="form-group row">
        <label htmlFor='multi-unit-select' className="col-sm-2 col-form-label">
        Select Units
        </label>
        <div id="multi-unit-select" className="col-sm-10">
        <Select
           onChange={this.handleChange}
           options={listItems}
           isMulti
           closeMenuOnSelect={false}
         />
        </div>
        </div>
        
        <div className="form-group row">
        <label htmlFor='multi-layer-select' className="col-sm-2 col-form-label">
        Select Compute Node
        </label>
        <div className="col-sm-10">
          <div id="multi-layer-select">
          <Select
           onChange={this.handleChangeLayer}
           options={listLayers}
         />
         </div>
        </div>
        </div>
               
         <button className="btn btn-primary btn-block" onClick={this.handleSubmit}>Add to model</button>
         </form>  
      </div>
    )
  }
}

function BatchTable({ columns, data }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page

    // The rest of these things are super handy, too ;)
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 },
    },
    usePagination
  )

  // Render the UI for your table
  return (
    <>
    <table className="table table-bordered" {...getTableProps()}>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
    </table>
    <div className="pagination">
    <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
      {'<<'}
    </button>{' '}
    <button onClick={() => previousPage()} disabled={!canPreviousPage}>
      {'<'}
    </button>{' '}
    <button onClick={() => nextPage()} disabled={!canNextPage}>
      {'>'}
    </button>{' '}
    <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
      {'>>'}
    </button>{' '}
    <span>
      Page{' '}
      <strong>
        {pageIndex + 1} of {pageOptions.length}
      </strong>{' '}
    </span>
    <span>
      | Go to page:{' '}
      <input
        type="number"
        defaultValue={pageIndex + 1}
        onChange={e => {
          const page = e.target.value ? Number(e.target.value) - 1 : 0
          gotoPage(page)
        }}
        style={{ width: '100px' }}
      />
    </span>{' '}
    <select
      value={pageSize}
      onChange={e => {
        setPageSize(Number(e.target.value))
      }}
    >
      {[10, 20, 30, 40, 50].map(pageSize => (
        <option key={pageSize} value={pageSize}>
          Show {pageSize}
        </option>
      ))}
    </select>
  </div>
  </>
  )
}
const Styles = styled.div`
padding: 1rem;

.pagination {
  padding: 0.5rem;
}
`

function BatchTableView({raw_columns, raw_data}) {
  const columns = React.useMemo(() => raw_columns, [raw_columns])
  // const columns = React.useMemo(
  //   () => [
  //     {
  //       Header: 'Column 1',
  //       accessor: 'col1', 
  //     },
  //     {
  //       Header: 'Column 2',
  //       accessor: 'col2',
  //     },
  //   ],
  //   []
  // )

    const data = React.useMemo(() => raw_data, [raw_data])
  // const data = React.useMemo(
  //   () => [
  //     {
  //       col1: 'Hello',
  //       col2: 'World',
  //     },
  //     {
  //       col1: 'react-table',
  //       col2: 'rocks',
  //     },
  //     {
  //       col1: 'whatever',
  //       col2: 'you want',
  //     },
  //   ],
  //   []
  // )

  return (
    <>
    <Styles>
      <BatchTable columns={columns} data={data} />
    </Styles>
    <CsvDownloader datas={raw_data} filename="batch_mode_results"
        extension=".csv">
          <button className='btn btn-primary'>Download</button>
    </CsvDownloader>
    </>
  )
}

export class Workspace extends React.Component {
  constructor(props) {
    super(props);


    const all_good = Object.keys(this.props.container.inputs.usable)
    let all_inputs = {}
    for (const key of all_good) {
      all_inputs[key] = Object.assign({ 'value':''}, this.props.container.inputs.usable[key])
    }

    // const all_layers = Object.keys(this.props.container.layers)
    // let all_results = {}
    // for (const key of all_layers) {
      
    // }

    this.state = {
      container: this.props.container,
      available_units: {},
      user_input: all_inputs,
      fileDownloadUrl: null,
      selected_node_name: "",
      selected_node: undefined,
      selected_node_is_label: undefined,
      esyn_token: '',
      esyn_project_grps: [],
      batch_dataset: [],
      batch_header: []
    }
    //this.container = this.props.container

    this.handleUnitAdded = this.handleUnitAdded.bind(this);
    this.handleEdgeAdded = this.handleEdgeAdded.bind(this);
    this.handleEdgeDeleted = this.handleEdgeDeleted.bind(this);
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.handleUnitUpload = this.handleUnitUpload.bind(this);
    this.handleWorkspaceUpload = this.handleWorkspaceUpload.bind(this);
    this.handleProjectNameChange = this.handleProjectNameChange.bind(this);
    this.handleAvailableUnitDeleted  = this.handleAvailableUnitDeleted.bind(this);
    this.handleConditionAdded = this.handleConditionAdded.bind(this);
    this.handleConditionDeleted = this.handleConditionDeleted.bind(this);
    this.handleAPIkey = this.handleAPIkey.bind(this);
    this.createUnitFromEsyn = this.createUnitFromEsyn.bind(this);
    this.rename_layer = this.rename_layer.bind(this);
    this.handleMultipleUnitsAdded = this.handleMultipleUnitsAdded.bind(this)
    this.handleUnitRenameInLayer = this.handleUnitRenameInLayer.bind(this);
    this.handleUnitDeleteInLayer = this.handleUnitDeleteInLayer.bind(this);
    this.handleLinkAdded = this.handleLinkAdded.bind(this);
    this.handleLinkDeleted = this.handleLinkDeleted.bind(this);
    this.addCalculatorToContiner = this.addCalculatorToContiner.bind(this);
    this.deleteCalculatorFromContainer = this.deleteCalculatorFromContainer.bind(this);
    this.handleBatchUpload = this.handleBatchUpload.bind(this);
    this.handleUIGroupAdded = this.handleUIGroupAdded.bind(this);
    this.handleUIGroupUpdate = this.handleUIGroupUpdate.bind(this);
    this.updateInputObjectFromContainer = this.updateInputObjectFromContainer.bind(this);
  }
  static defaultProps = {
    container: new GraphContainer()
  }

  updateInputObjectFromContainer(c, reset){
    //could add a new mode to keep old values if the variable still exists, otherwise reset
    //so that when a unit is deleted the current values for remaining variables aren't lost
    let all_inputs
    if(reset){
      console.log("UI resetting user input")
      all_inputs = {}
    } else {
      console.log("UI merging user input")
      all_inputs = this.state.user_input
    }

      for (const key of Object.keys(c.inputs.usable)) {
        if(!all_inputs.hasOwnProperty(key)){
          all_inputs[key] = Object.assign({ 'value':''}, c.inputs.usable[key])
        } else {
          all_inputs[key] = Object.assign(all_inputs[key], c.inputs.usable[key])
        }
      }
      return all_inputs
  }

  handleUIGroupAdded(name){
    let c = this.state.container
    let ok = c.add_dt_ui_group(name)
    if(ok){
      this.setState({container:c})
    }
    return ok
  }

  handleUIGroupUpdate(group, variables){
    let c = this.state.container
    let ok = c.update_dt_ui_group(group, variables)
    if(ok){
      this.setState({container:c})
    }
    return ok
  }

  handleUnitAdded(unit_name, layer_name, name_in_layer = unit_name){
    /*
    unit_name : name of the unit in this.state.available_units
    layer_name : name of a layer in this.container.layers
    name_in_layer : the name to use for the unit in the layer, defaults to unit_name
    
    */
    let c = this.state.container
    //c.layers[layer_name].add_unit(this.state.available_units[unit_name])
    console.log("trying to add unit", unit_name, "to", layer_name, "the unit:", this.state.available_units[unit_name])
    let can_add = true
    if(!c.layers.hasOwnProperty(layer_name)){
      console.log("layer does not exist", layer_name)
      can_add = false
    }
    if(!this.state.available_units.hasOwnProperty(unit_name)){
      console.log("unit does not exist", unit_name)
      can_add = false
    }

    if(can_add){
      c.add_unit_to_layer(layer_name, this.state.available_units[unit_name], name_in_layer)

      let all_inputs = this.updateInputObjectFromContainer(c)
  
      this.setState({container: c, user_input: all_inputs})
    }
  }


  handleMultipleUnitsAdded(unit_names, layer_name){
    //unit_names : list of names of the units to add from this.state.available_units
    //layer_name : name of a layer in this.container.layers
    //the name_in_layer (as in handleUnitAdded) can only be set when a single unit is added
    let can_add = true
    let c = this.state.container
    if(!c.layers.hasOwnProperty(layer_name)){
      console.log("layer does not exist", layer_name)
      can_add = false
    }
    unit_names.forEach((name) => {
      if(!this.state.available_units.hasOwnProperty(name)){
        console.log("unit does not exist", name)
        can_add = false
      }
    })

    if(can_add){
      console.log("layer and unit names are valid")
      let do_update = true
      let ok
      for(const name of unit_names){
        console.log(`trying to add ${name} to ${layer_name}`)
        try {
          ok = c.add_unit_to_layer(layer_name, this.state.available_units[name])
          console.log(ok)
        }
        catch(err) {
          console.log(err)
          do_update = false
        }
      }
      if(do_update){
        console.log("no errors adding units, merge onto user input")
        let all_inputs = this.updateInputObjectFromContainer(c, false)

        //should only setstate if all units were added successfully
        console.log('update app state')
        this.setState({container: c, user_input: all_inputs})
      } else {
        alert("selected units cannot be added")
      }
    }
    
  }

  handleUnitRenameInLayer(layer, old_name, new_name){
    let c = this.state.container
    const ok = c.rename_unit_in_layer(layer, old_name, new_name)
    if(ok){
      let all_inputs = this.updateInputObjectFromContainer(c, false)
  
      this.setState({container: c, user_input: all_inputs})
    } else {
      alert("This name cannot be used")
    }
    return ok
  }

  handleUnitDeleteInLayer(layer, unit_name){
    let c = this.state.container
    const ok = c.delete_unit_from_layer(layer, unit_name)
    if(ok){
      console.log("core deleted unit from layer, update state")
      let all_inputs = this.updateInputObjectFromContainer(c, true)
      console.log("setting container",c)
      this.setState({container: c, user_input: all_inputs})
    } else {
      alert("Failed to delete unit")
    }
    return ok
  }

  handleLinkAdded(layer_name, unit_name, variable_name){
    let c = this.state.container
    const ok = c.link_input_to_unit(variable_name, unit_name, layer_name)
    if(ok){
      this.setState({container:c})
    } else {
      alert("could not create link")
    }
    return ok
  }

  handleLinkDeleted(variable_name){
    let c = this.state.container
    const ok = c.unlink_input(variable_name)
    if(ok){
      this.setState({container:c})
    } else {
      alert("could not delete link")
    }
    return ok
  }

  handleEdgeAdded(source_layer, target_layer){
    let c = this.state.container
    let can_add = true

    c.add_edge(source_layer, target_layer, [])

    this.setState({container: c})
    
  }

  handleEdgeDeleted(label_id){
    let c = this.state.container

    c.delete_labelnode(label_id)

    this.setState({container: c})
    this.handleNodeSelected()
  }

  handleUnitUpload(unit){
    const name = unit.name;
    const au = this.state.available_units
    au[name] = unit
    this.setState({available_units: au})
  }

  createUnitFromEsyn(project_id, project_name){
    //make API call to get actual project data
    var details =  { action: 'getProjectFromToken',
                    token: this.state.esyn_token,
                    projectid: parseInt(project_id)
                  }
  
    let formBody = [];
    for (var property in details) {
      let encodedKey = encodeURIComponent(property);
      let encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    

    fetch("https://esyn.rosalind.kcl.ac.uk/public.php", { method: 'post', mode: 'cors', headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formBody})
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result)
          let esyn_model = new EsynDecisionTree(result)
          let esyn_unit = new Unit(project_name, esyn_model)
          this.handleUnitUpload(esyn_unit)
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            tokenAPIloaded: true,
            tokenDataAPIerror: true //doesn't do anything
          });
          console.log(error)
      }
    )

  }

  handleWorkspaceUpload(ws){
    console.log("uploaded workspace", ws)
    //create Unit of correct type for every unit in .available_units
    const au = {}
    let m, u, mj
    for(const [au_name, au_data] of Object.entries(ws.available_units)){
      if(au_data.model_class == 'DummyModel'){
        console.log("TODO save/load methods for DummyModel")
        //m = new DummyModel()
        //u = new Unit(au_name, m)
      } else if(au_data.model_class == 'EsynDecisionTree'){
        m = new EsynDecisionTree(au_data.model.model_json, au_data.model.network_name)
        u = new Unit(au_name, m)
        au[au_name] = u
      } else {
        console.log("cannot load model with class", au_data.model_class)
      }
    }

    //load the container
    let c
    if(ws.container.container_type == "Graph"){
      c = new GraphContainer([], '')
      c.load(ws.container)
      console.log("container is loaded", c)
    }
    //no longer attempt to load plain container
    // } else if(ws.container.container_type == "Plain") {
    //   c = new Container([], '')
    //   c.load(ws.container)
    //   console.log("container is loaded", c)
    // } 
    else {
      throw new ContainerNotRecognisedError("uploaded container type not valid")
    }
    

    //user inputs
    let all_inputs = this.updateInputObjectFromContainer(c, true)
    
    //set workspace state
    this.setState({'available_units': au, 'container': c, 'user_input': all_inputs})
  }

  handleFieldChange(fieldId, value) {
    //console.log("handlefieldchange", fieldId, value)
    let s = this.state.user_input
    s[fieldId].value = value
    //console.log(s)
    this.setState({ user_input: s});
  }

  handleProjectNameChange({ target }){
    const { checked, name, type, value } = target;
    //console.log("changing name to", value)
    let c = this.state.container
    c.name = value
    this.setState({container: c})
  }

  handleAvailableUnitDeleted(unit_key){
    let au = this.state.available_units
    if(au.hasOwnProperty(unit_key)){
      delete au[unit_key]
      this.setState({available_units: au})
    }
  }

  handleNodeSelected(node){
    if(node === undefined){
      this.setState({selected_node: '', selected_node_name: undefined, selected_node_is_label: undefined})
    } else {
      this.setState({selected_node: node, selected_node_name: node.id(), selected_node_is_label: node.hasClass('labelnode')})
    }
  }

  handleConditionAdded(label_id, variable, operation, value, value_type){
    console.log('adding condition', variable, operation, value, value_type)
    
    let c = this.state.container
    const added = c.add_condition_to_edge(label_id, variable, operation, value, value_type)
    if(added){
      this.setState({container: c})
    }
    return added
    
  }
  handleConditionDeleted(label_id, to_delete){    
    console.log("workspace send delete command")
    let c = this.state.container
    c.delete_conditions_from_edge(label_id, to_delete)
    this.setState({container: c})
    
  }

  addCalculatorToContiner(rule_name, if_str, then_str, set_val_of, then_rule = ""){
    console.log("workspace adding rule with name", rule_name)
    let c = this.state.container
    let rule = {}
    rule['if_str'] = if_str
    rule['then_str'] = then_str
    rule['name'] = rule_name
    rule['then'] = {}

    if(rule['then_str'] == 'set-val'){
        rule['then']['str'] = then_rule
        rule['then']['set_variable'] = set_val_of
    }

    const res = c.add_rule(rule)
    if(res){
      this.setState({container: c})
    } else {
      alert("there was an error adding the rule")
    }
    return res
  }

  deleteCalculatorFromContainer(rule_name){
    console.log("workspace deleting rule with name", rule_name)
    let c = this.state.container

    const res = c.delete_rule(rule_name)
    if(res){
      this.setState({container: c})
    } else {
      alert("there was an error deleting the rule")
    }
    return res
  }

  handleBatchUpload(data, fileInfo){
    console.dir(data, fileInfo)
    let header_upload = Object.keys(data[0])
    // .map((name) => {
    //   return {Header: name, accessor: name,}
    // })
    let variables = Object.keys(this.state.container.inputs.usable)
    let layers = this.state.container.variables
    let output_header = this.make_batch_header(variables, layers, header_upload)

    //run model
    let result
    let all_results = []
    for (const row of data) {
      try {
        result = this.state.container.run(row) 
      } catch (error) {
        result = {'meta': "Unknown model error"}
      }
      
      all_results.push(Object.assign(row, this.make_batch_result_row(result)))
    }
    

    this.setState({batch_dataset: all_results, batch_header: output_header})
  }

  make_batch_header(variables, layers, header_upload){
    //merge uploaded header with all model variables
    const allVarNames = new Set([
      ...variables,
      ...header_upload
    ]);
    const allVarNamesArray = [...allVarNames];
    let header = allVarNamesArray.map((name) => {
      return {Header: name, accessor:  name,}
    })
    let part, n
    for (const [layer_name, units] of Object.entries(layers)) {
        part = Object.keys(units).map((unit_name) => {
          n = `TE-${layer_name}-${unit_name}`
          return {Header: n, accessor: n,}
        })
        header = header.concat(part)
    }
    header.push({Header: 'TE-meta-state', accessor: 'TE-meta-state',})
    return header
  }

  make_batch_result_row(result){
    let res = {}
    let n
    res['TE-meta-state'] = result['meta']
    if(result['meta'] == 'OK'){
      for (const [layer_name, unit_names] of Object.entries(result.result)) {
        for (const [unit_name, unit_res] of Object.entries(unit_names)) {
          n = `TE-${layer_name}-${unit_name}`
          res[n] = unit_res
        }
      }
    }
    return res
  }

  get_project_groups(esyn_projects){
    let project_grps = {}
    for(const project of esyn_projects){
      if(project.type == 'DecisionTree'){
        if(!project_grps.hasOwnProperty(project.group)){
          project_grps[project.group] = []
        }
        project_grps[project.group].push(project)
      }
    }
    return project_grps
  }

  handleAPIkey(){
    const api_key = document.getElementById('esyn_api_key').value

    var details =  { action: 'listProjectsFromToken',
                    token: api_key
                  }
  
    let formBody = [];
    for (var property in details) {
      let encodedKey = encodeURIComponent(property);
      let encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    

    fetch("https://esyn.rosalind.kcl.ac.uk/public.php", { method: 'post', mode: 'cors', headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formBody})
      .then(res => res.json())
      .then(
        (result) => {
          const project_groups = this.get_project_groups(result);
          this.setState({
            tokenAPIloaded: true,
            esyn_token: api_key,
            esyn_project_grps: project_groups
          });
          console.log(result);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            tokenAPIloaded: true,
            esyn_token: api_key,
            tokenAPIerror: true //doesn't do anything
          });
          console.log(error)
      }
    )
  }

  download_workspace(){
    //const ws = JSON.stringify(this.state)
    const container_string = this.state.container.save()
    const ws = {}
    ws['container'] = container_string
    //console.log(ws)
    //console.log(JSON.stringify(ws))

    const au = {}
    let s
    for(const u in this.state.available_units){
      s = this.state.available_units[u].save()
      au[u] = s 
    }
    //console.log(au)
    //console.log(JSON.stringify(au))
    ws['available_units'] = au
    const dl = JSON.stringify(ws)
    const blob = new Blob([dl]);
    const fileDownloadUrl = URL.createObjectURL(blob);
    this.setState ({fileDownloadUrl: fileDownloadUrl}, 
      () => {
        this.dofileDownload.click(); 
        URL.revokeObjectURL(fileDownloadUrl);  // free up storage--no longer needed.
        this.setState({fileDownloadUrl: ""})
    })
  }


  fetch_models(){
    //get available models from some db
    const m = [1, 2, 3, 4, 5]
    let models = {}, name, bv
    for(const i in m){
      name = 'Loaded Unit ' + String(i)
      bv = 'boolvar_' + String(i)
      let md = new Unit(name, new DummyModel(['x', 'y', i], [bv]))
      models[name] = md 
    }
    const au = {available_units: models}
    this.setState(au)
  }

  get_safe_layer_name(){
    let base = "Layer_"
    let i = 0
    let ln = base + String(i)
    while(this.state.container.layers.hasOwnProperty(ln)){
      i += 1
      ln = base + String(i)
    }
    return ln;
  }

  add_layer(){
    const ln = this.get_safe_layer_name()
    let c = this.state.container
    let l = new Layer(ln)
    c.add_layer(l)
    this.setState({container: c})
  }

  delete_layer(){
    const to_delete = document.getElementById("delete_layer_select").value
    let c = this.state.container
    c.delete_layer(to_delete)
    this.setState({container: c})
  }

  rename_layer(old_name, new_name){
    let c = this.state.container
    let success = c.rename_layer(old_name, new_name)
    if(success){
      //somehow reset the node view
      this.handleNodeSelected()
      this.setState({container: c})
    } else {
      alert("could not rename")
    }
    
  }

  run_model(){
    let input = {}
    for (const key in this.state.user_input) {
      if (this.state.user_input.hasOwnProperty(key)) {
        const element = this.state.user_input[key];
        if(element.type == "bool"){
          if(element.value == "True"){
            input[key] = true
          } else if (element.value == "False"){
            input[key] = false
          } else {
            input[key] = "" //as in esyn engine
          }
        } else {
          //str and int are already the correct type
          input[key] = element.value
        }
      }
    }
    const result = this.state.container.run(input)
    this.setState({result: result.result})
  }

  render() {
    const model_can_build = Object.keys(this.state.container.inputs.conflict).length == 0;
    let hide = ""
    let input_badge
    if(!model_can_build){
      hide = "hidden"
      input_badge = <span className="badge badge-danger">Error</span>
    } else {
      input_badge = <span className="badge badge-success">Ready</span>
    }
    const project_name = this.state.container.name
    const n_available_units = Object.keys(this.state.available_units).length
    const current_layers_opts = Object.keys(this.state.container.layers).map((x) => <option key={x}>{x}</option>)
    const graph_els = this.state.container.graph_els
    //console.log("container has graph els", graph_els)
    const layout = {name: 'cose'}

    let node_contents
    const node_is_label = this.state.selected_node_is_label
    const something_selected = this.state.selected_node_name !== undefined
    if(something_selected){
      if(!node_is_label){
        node_contents = <ComputeNodeView 
          node_id={this.state.selected_node_name} 
          layer_data={this.state.container.layers[this.state.selected_node_name]}
          handleNodeRename={this.rename_layer}
          handleUnitRenameInLayer={this.handleUnitRenameInLayer}
          handleUnitDeleteInLayer={this.handleUnitDeleteInLayer}
          ></ComputeNodeView>
      } else {
        node_contents = <LabelNodeView 
          node_id={this.state.selected_node_name}
          handleConditionAdded={this.handleConditionAdded}
          handleConditionDeleted={this.handleConditionDeleted}
          variables={this.state.user_input}
          conditions={this.state.container.metadata.conditions[this.state.selected_node_name]}
          handleNodeDeleted={this.handleEdgeDeleted}
          ></LabelNodeView>
      }
    }
    

    const listItems = Object.keys(this.state.available_units).map((unit_name) => 
    <UnitAvailableView key={unit_name} unit_key={unit_name} unit={this.state.available_units[unit_name]} handleDelete={this.handleAvailableUnitDeleted} /> 
    );    

    let layer2units = {}
    for(const [layer_name, layer_data] of Object.entries(this.state.container.layers)){
      layer2units[layer_name] = Object.keys(layer_data['units'])
    }

    const papaparseOptions = {
      header: true,
    }
    

    return (
      <div className="container">
        <div className="row">
          <div className="col">
          <div className="form-group row">
          <label htmlFor="project_name" className="col-sm-2 col-form-label">Project:</label>
          <div className="col-sm-10">
          <input id="project_name" type='text' value={project_name} onChange={this.handleProjectNameChange} className="form-control edit-text" placeholder="Project name"></input>
          </div>
          </div>
          </div>
          </div>

        <div className="row">
          <div className='col'>
        <nav>
          <div className="nav nav-tabs" id="nav-tab" role="tablist">
          <a className="nav-item nav-link active" id="nav-home-tab" data-toggle="tab" href="#nav-home" role="tab" aria-controls="nav-home" aria-selected="true">Model Design</a>
          <a className="nav-item nav-link" id="nav-workspace-detail-tab" data-toggle="tab" href="#nav-workspace-detail" role="tab" aria-controls="nav-workspace-detail" aria-selected="false">Model Detail</a>
            <a className="nav-item nav-link" id="nav-units-tab" data-toggle="tab" href="#nav-units" role="tab" aria-controls="nav-units" aria-selected="false">Available Units <span className="badge badge-light">{n_available_units}</span></a>
            <a className="nav-item nav-link" id="nav-user-input-tab" data-toggle="tab" href="#nav-user-input" role="tab" aria-controls="nav-user-input" aria-selected="false">Model Input {input_badge}</a>
            <a className="nav-item nav-link" id="nav-batch-tab" data-toggle="tab" href="#nav-batch" role="tab" aria-controls="nav-batch" aria-selected="false">Batch Mode</a>
            <a className="nav-item nav-link" id="nav-rules-tab" data-toggle="tab" href="#nav-rules" role="tab" aria-controls="nav-rules" aria-selected="false">Calculators and Rules</a>
            <a className="nav-item nav-link" id="nav-settings-tab" data-toggle="tab" href="#nav-settings" role="tab" aria-controls="nav-settings" aria-selected="false">Settings</a>
            <a className="nav-item nav-link" id="nav-save-workspace-tab" data-toggle="tab" href="#nav-save-workspace" role="tab" aria-controls="nav-save-workspace" aria-selected="false">Save/Load</a>
            <a className="nav-item nav-link" id="nav-testing-tab" data-toggle="tab" href="#nav-testing" role="tab" aria-controls="nav-testing" aria-selected="false">Testing</a>
          </div>
        </nav>
        </div>
        </div>

        <div className='row mt-1'>
          <div className="col tab-content" id="nav-tabContent">

          <div className="tab-pane fade" id="nav-units" role="tabpanel" aria-labelledby="nav-units-tab">
          <div className="row mt-1">
          <div className="col">
          <FileInput mode="EsynDecisionTree" handleUpload={this.handleUnitUpload} msg="an Esyn DecisionTree"></FileInput>
          </div>
          </div>

          <div className="row mt-1">
          <div className="col">
            <label htmlFor="esyn_api_key">Esyn API Key</label>
          <input type='text' id='esyn_api_key'></input>
          <button onClick={this.handleAPIkey}>Link API Key</button>
          </div>
          </div>

          <div className="row mt-1">
            <div className="col">
            <EsynAvailableTable projects={this.state.esyn_project_grps} handleUnitAdded={this.createUnitFromEsyn} existing={Object.keys(this.state.available_units)}></EsynAvailableTable>
                </div>
            </div>

          <div className='row mt-1'>
            <div className='col'>
            <h3>Units available in workspace: {n_available_units}</h3>
            </div>
          </div>
          <div className="row mt-1">
            <div className="col card-columns">
                {listItems}
                </div>
            </div>

          </div>

          <div className="tab-pane fade" id="nav-rules" role="tabpanel" aria-labelledby="nav-rules-tab">
          <div className="row mt-1">
          <div className="col">
          <div>
            <h4>Edit calculators and rules</h4>

            <p>Calculators infer missing values based on user input. Rules determine when the model is valid.</p>

            <p>You can refer to variables in your model by including the name in single quotes e.g.</p>
            <pre>IF: 'var_a' &gt; 5 and ('x' &lt; 10 or 'y' &gt; 15)</pre>
            
            </div>
          
          </div>
          </div>

          <div className="row mt-3">
          <div className="col">
          <RuleEditor handleAdded={this.addCalculatorToContiner}></RuleEditor>
          </div>
          </div>

          <div className="row mt-3">
          <div className="col">
          <CalculatorEditor variables={Object.keys(this.state.container.inputs.usable)} handleAdded={this.addCalculatorToContiner}></CalculatorEditor>
          </div>
          </div>

          <div className="row mt-3">
          <div className="col">
          <RuleList rules={this.state.container.metadata.dt_rules} handleDelete={this.deleteCalculatorFromContainer}></RuleList>
          </div>
          </div>

          <div className="row mt-3">
          <div className="col">
          <h4>Create link to variable</h4>
              <p>Add and remove links from a compute unit in a node and a variable in the overall model. When a variable is linked to a unit, the value of the variable is set to the output of the unit.</p>
              <UnitLinkView
              handleLinkAdded={this.handleLinkAdded} 
              handleLinkDeleted={this.handleLinkDeleted} 
              layer2units={layer2units} 
              links={this.state.container.unit2input}
              variables={this.state.container.inputs.usable}
              //change to existing layer-unit pairs not all layers and available units
              //send in the ID2name2D object to list current links
              //need functions for add, delete links

              ></UnitLinkView>
          </div>
          </div>

          </div>


          <div className="tab-pane fade" id="nav-save-workspace" role="tabpanel" aria-labelledby="nav-save-workspace-tab">
          <div className="row mt-1">
          <div className="col">
          <button type="button" className="btn btn-primary" onClick={() => this.download_workspace()}>Save</button>
          <a className="hidden" download="Workspace.json" href={this.state.fileDownloadUrl} ref={e=>this.dofileDownload = e}>download it</a>
          <FileInput mode="Workspace" handleUpload={this.handleWorkspaceUpload} msg="a saved Workspace"></FileInput>
          </div>
          </div>
          </div>


          <div className="tab-pane fade" id="nav-testing" role="tabpanel" aria-labelledby="nav-testing-tab">
          <div className="row mt-1">
          <div className="col">
          <button type="button" className="btn btn-primary" onClick={() => this.fetch_models()}>Load dummy models to workspace</button>
          </div>
          </div>
          </div>

          <div className="tab-pane fade show active" id="nav-home" role="tabpanel" aria-labelledby="nav-home-tab">
          <div className="row mt-1">
          <div className="col">
            <CytoscapeComponent
              elements={graph_els} 
              style={ { width: '600px', height: '600px', backgroundColor: "lightblue"} }
              cy={cy => {
                cy.unbind("tap"); //unbinding is necessary or get one listener per node added
                cy.unbind("add")
                cy.on('tap', 'node', evt => {
                  var node = evt.target;
                  this.handleNodeSelected(node)
                });
                cy.on('add', 'node', _evt => {
                  cy.layout(layout).run()
                  cy.fit()
                });
                // cy.on('resize', _evt => {
                //   cy.layout(layout).run()
                //   cy.fit()
                // })
              }
              }
              stylesheet={[
                {
                  selector: 'node.compute',
                  style: {
                    label: 'data(label)'
                  }
                },
                {
                  selector: 'node.labelnode',
                  style: {
                    'text-valign': 'center',
                    'label': 'data(conditions_label)', 
                    'shape': 'square',
                    'text-wrap': 'wrap',
                    'text-max-width': 200,
                    'width': 20,
                    'height': 20,
                    'text-background-color': '#FFFFFF',
                    'text-background-opacity': 1,
                    'text-background-padding': 3
                    
                  }
                },
                {
                  selector: 'edge',
                  style: {
                    'width': 3,
                    'line-color': '#000',
                    "curve-style": "straight"
                  }
                },
                {
                  selector: 'edge.directed',
                  style: {
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#000000'
                  }
                }
              ]}
              
            />
          </div>
          <div className="col">
            <h4>Selected: {this.state.selected_node_name}</h4>
            <h4>Node contents</h4>
            {node_contents}
          </div>
          </div>
          <div className="row mt-1">
          <div className="col">
              
              <h4>Graph structure</h4>
              <h5>Nodes</h5>
              <button type="button" className='btn btn-primary' onClick={() => this.add_layer()}>Add Compute Node</button>
              <br />
              <select id="delete_layer_select">{current_layers_opts}</select>
              <button type="button" className='btn btn-danger' onClick={() => this.delete_layer()}>Delete Compute Node</button>

              <h5>Add Edges</h5>
                <GraphContainerEdgeControls handleEdgeAdded={this.handleEdgeAdded} layers={this.state.container.layer_order}></GraphContainerEdgeControls>

              <h4>Compute units</h4>
              <h5>Add single unit to graph</h5>
              <p>By default a unit will keep its own name in a node. You can override that name locally.</p>
                <GraphContainerNodeControls handleUnitAdded={this.handleUnitAdded} layers={this.state.container.layer_order} units={Object.keys(this.state.available_units)}></GraphContainerNodeControls>

              <h5>Add multiple units to graph</h5>
              <p>Add multiple compute units to a node at once. They will use their default names. You can edit the name later by selecting the node. </p>
              <MultiSelect 
              options={Object.keys(this.state.available_units)}
              layers={this.state.container.layer_order}
              handleSubmit={this.handleMultipleUnitsAdded}
              ></MultiSelect>
                
          </div>
          </div>
          </div>

          <div className="tab-pane fade" id="nav-settings" role="tabpanel" aria-labelledby="nav-settings-tab">
          <div className="row mt-1">
            <div className="col">
              <h4>Settings</h4>
              <VariableUIGroups 
                groups={this.state.container.metadata.dt_ui_groups}
                handleGroupAdded={this.handleUIGroupAdded}
                variables={Object.keys(this.state.container.inputs.usable)}
                handleUIGroupUpdate={this.handleUIGroupUpdate}
                ></VariableUIGroups>
            </div>
            </div>

          </div>


          <div className="tab-pane fade" id="nav-workspace-detail" role="tabpanel" aria-labelledby="nav-workspace-detail-tab">
          <div className="row mt-1">
            <div className="col">

            <ContainerView container={this.state.container}></ContainerView>
            </div>
            </div>

            {/* <div className="row mt-1">
            <div className="col">
            <div className="card border-dark text-center mb-3 add-layer-box" >
              <div className="card-body text-secondary" onClick={() => this.add_layer()}>
                <h1>+</h1>
                <p>Add new layer</p>
              </div>
            </div>
            </div>
            </div> */}
          </div>

          <div className="tab-pane fade" id="nav-batch" role="tabpanel" aria-labelledby="nav-batch-tab">
          <div className="row mt-1">
            <div className="col">
            <h1>Batch Mode</h1>
            <div>
              <h3>Template</h3>
              <p>Download a batch data template for this model</p>
              <CsvDownloader columns={Object.keys(this.state.container.inputs.usable)} filename="batch_mode_header"
        extension=".csv">
          <button className='btn btn-primary'>Get Template</button>
        </CsvDownloader>
            </div>
            </div>
            </div>

            <div className="row mt-1">
          <div className="col">
              <h3>Upload</h3>
              <p>Upload batch data as a csv file. The model will run automatically.</p>
              <CSVReader onFileLoaded={this.handleBatchUpload} label="Select a batch file " parserOptions={papaparseOptions}/>
            </div>
            </div>

            <div className="row mt-1">
          <div className="col">
              <h3>Results</h3>
              <BatchTableView raw_columns={this.state.batch_header} raw_data={this.state.batch_dataset}></BatchTableView>
            </div>
            </div>


            </div>
          


          <div className="tab-pane fade" id="nav-user-input" role="tabpanel" aria-labelledby="nav-user-input-tab">

          <div className="row mt-1">
          <div className="col">
          <p>Model input</p>
          <p>Model can build: {model_can_build.toString()}</p>
          </div>
        </div>

          <div className="row mt-1">
          <div className="col">
            <button type="button" className="btn btn-success" onClick={() => this.run_model()} disabled={!model_can_build}>Run</button>
          </div>
        </div>

        <div className="row mt-1">
          <div className="col">
            <ResultsView container={this.state.container}></ResultsView>
          </div>
        </div>

        

          <div className="row mt-1">
          <div className="col">
          <div className={hide}>
        <ContainerInputManualView inputs={this.state.user_input} onChange={this.handleFieldChange} 
        unit2input={this.state.container.unit2input}
        variable2calculator={this.state.container.get_calculator_targets()}
        dt_ui_groups={this.state.container.metadata.dt_ui_groups}
        
        ></ContainerInputManualView>
        </div>
          </div>
        </div>

          </div>
          </div>
        </div>


      </div>
    );
  }
}

export class ToolView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {

    return (
      <div className="container">
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <a className="navbar-brand" href="#">TreeEngine-0.0.1a</a>
      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav">
          <li className="nav-item active">
            <a className="nav-link" href="#">Home <span className="sr-only">(current)</span></a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#">Features</a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#">Pricing</a>
          </li>
          <li className="nav-item">
            <a className="nav-link disabled" href="#">Disabled</a>
          </li>
        </ul>
      </div>
    </nav>
    <Workspace container={this.props.container}></Workspace>

    <div className='row mt-1'>
      <div className='col'>
      &#169; Copyright 2021 Dan Bean
      </div>
    </div>
    </div>
    );
  }
}

