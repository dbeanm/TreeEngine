import React from 'react';
import {Unit, Layer, DummyModel, Container, EsynDecisionTree, ModelState} from './script.js';

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
        Add unit 
        </label>
        <div className="col-sm-10">
        <select id='adder-unit-select' className="custom-select" onChange={this.handleChange} name="unit">
          {unitopts}
        </select>
        </div>
        </div>

        <div className="form-group row">
        <label htmlFor='adder-layer-select' className="col-sm-2 col-form-label">
        To layer 
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
       const { name, type, value, state } = element
       const id_true = `${name}_true`
       const id_false = `${name}_false`
       const id_unknown = `${name}_unknown`
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
          value="Unknown"
          checked={value === "Unknown"}
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
      </tr>)
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
      fileDownloadUrl: null
    }
    //this.container = this.props.container

    this.handleUnitAdded = this.handleUnitAdded.bind(this);
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.handleUnitUpload = this.handleUnitUpload.bind(this);
    this.handleWorkspaceUpload = this.handleWorkspaceUpload.bind(this);
    this.handleProjectNameChange = this.handleProjectNameChange.bind(this);
    this.handleAvailableUnitDeleted  = this.handleAvailableUnitDeleted.bind(this);

  }
  static defaultProps = {
    container: new Container()
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

      let all_inputs = this.state.user_input
      for (const key of Object.keys(c.inputs.usable)) {
        if(!this.state.user_input.hasOwnProperty(key)){
          all_inputs[key] = Object.assign({ 'value':''}, c.inputs.usable[key])
        } else {
          all_inputs[key] = Object.assign(all_inputs[key], c.inputs.usable[key])
        }
      }
  
      this.setState({container: c, user_input: all_inputs})
    }
  }

  handleUnitUpload(unit){
    const name = unit.name;
    const au = this.state.available_units
    au[name] = unit
    this.setState({available_units: au})
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
    let c = new Container([], '')
    c.load(ws.container)
    console.log("container is loaded", c)

    //user inputs
    let all_inputs = {}
    for (const key of Object.keys(c.inputs.usable)) {
      if(!this.state.user_input.hasOwnProperty(key)){
        all_inputs[key] = Object.assign({ 'value':''}, c.inputs.usable[key])
      } else {
        all_inputs[key] = Object.assign(all_inputs[key], c.inputs.usable[key])
      }
    }
    
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
    this.setState({result: result})
  }

  render() {
    const model_can_build = Object.keys(this.state.container.inputs.conflict).length == 0;
    let hide = ""
    let input_badge
    if(!model_can_build){
      hide = "hidden"
      input_badge = <span class="badge badge-danger">Error</span>
    } else {
      input_badge = <span class="badge badge-success">Ready</span>
    }
    const project_name = this.state.container.name
    const n_available_units = Object.keys(this.state.available_units).length

    const listItems = Object.keys(this.state.available_units).map((unit_name) =>
    <UnitAvailableView key={unit_name} unit_key={unit_name} unit={this.state.available_units[unit_name]} handleDelete={this.handleAvailableUnitDeleted} />
    
    );
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
          <div class="nav nav-tabs" id="nav-tab" role="tablist">
          <a class="nav-item nav-link active" id="nav-workspace-detail-tab" data-toggle="tab" href="#nav-workspace-detail" role="tab" aria-controls="nav-workspace-detail" aria-selected="true">Model Detail</a>
            <a class="nav-item nav-link" id="nav-home-tab" data-toggle="tab" href="#nav-home" role="tab" aria-controls="nav-home" aria-selected="false">Model Design</a>
            <a class="nav-item nav-link" id="nav-units-tab" data-toggle="tab" href="#nav-units" role="tab" aria-controls="nav-units" aria-selected="false">Available Units <span class="badge badge-light">{n_available_units}</span></a>
            <a class="nav-item nav-link" id="nav-user-input-tab" data-toggle="tab" href="#nav-user-input" role="tab" aria-controls="nav-user-input" aria-selected="false">Model Input {input_badge}</a>
            <a class="nav-item nav-link" id="nav-save-workspace-tab" data-toggle="tab" href="#nav-save-workspace" role="tab" aria-controls="nav-save-workspace" aria-selected="false">Save/Load</a>
            <a class="nav-item nav-link" id="nav-testing-tab" data-toggle="tab" href="#nav-testing" role="tab" aria-controls="nav-testing" aria-selected="false">Testing</a>
          </div>
        </nav>
        </div>
        </div>

        <div className='row mt-1'>
          <div class="col tab-content" id="nav-tabContent">
          <div class="tab-pane fade" id="nav-home" role="tabpanel" aria-labelledby="nav-home-tab">
              <div className="row">
              <div className="col">
              <h4>Add unit to model</h4>
                <UnitAdderView handleUnitAdded={this.handleUnitAdded} layers={this.state.container.layer_order} units={Object.keys(this.state.available_units)}></UnitAdderView>
              </div>
            </div>

            <div className="row mt-1">
            <div className="col">
              <h4>Layers</h4>
              <button type="button" className="btn btn-primary btn-block" onClick={() => this.add_layer()}>Create new layer</button>
            </div>
            </div>

          </div>


          <div class="tab-pane fade" id="nav-units" role="tabpanel" aria-labelledby="nav-units-tab">
          <div className="row mt-1">
          <div className="col">
          <FileInput mode="EsynDecisionTree" handleUpload={this.handleUnitUpload} msg="an Esyn DecisionTree"></FileInput>
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


          <div class="tab-pane fade" id="nav-save-workspace" role="tabpanel" aria-labelledby="nav-save-workspace-tab">
          <div className="row mt-1">
          <div className="col">
          <button type="button" className="btn btn-primary" onClick={() => this.download_workspace()}>Save</button>
          <a className="hidden" download="Workspace.json" href={this.state.fileDownloadUrl} ref={e=>this.dofileDownload = e}>download it</a>
          <FileInput mode="Workspace" handleUpload={this.handleWorkspaceUpload} msg="a saved Workspace"></FileInput>
          </div>
          </div>
          </div>


          <div class="tab-pane fade" id="nav-testing" role="tabpanel" aria-labelledby="nav-testing-tab">
          <div className="row mt-1">
          <div className="col">
          <button type="button" className="btn btn-primary" onClick={() => this.fetch_models()}>Load dummy models to workspace</button>
          </div>
          </div>
          </div>


          <div class="tab-pane fade show active" id="nav-workspace-detail" role="tabpanel" aria-labelledby="nav-workspace-detail-tab">
          <div className="row mt-1">
            <div className="col">

            <ContainerView container={this.state.container}></ContainerView>
            </div>
            </div>

            <div className="row mt-1">
            <div className="col">
            <div className="card border-dark text-center mb-3 add-layer-box" >
              <div className="card-body text-secondary" onClick={() => this.add_layer()}>
                <h1>+</h1>
                <p>Add new layer</p>
              </div>
            </div>
            </div>
            </div>
          </div>

          


          <div class="tab-pane fade" id="nav-user-input" role="tabpanel" aria-labelledby="nav-user-input-tab">

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
          <div className={hide}>
        <ContainerInputManualView inputs={this.state.user_input} onChange={this.handleFieldChange}></ContainerInputManualView>
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
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <a class="navbar-brand" href="#">TreeEngine-0.0.1a</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item active">
            <a class="nav-link" href="#">Home <span class="sr-only">(current)</span></a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#">Features</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#">Pricing</a>
          </li>
          <li class="nav-item">
            <a class="nav-link disabled" href="#">Disabled</a>
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

