import React from 'react';
import {Unit, Layer, DummyModel, Container} from './script.js';

function ListItem(props) {
  // Correct! There is no need to specify the key here:
  return <li>{props.name}</li>;
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
    this.state = this.props.container
    this.container = this.props.container
  }
  static defaultProps = {
    container: new Container()
  }

  test(){
    let c = this.container
    const n = String(c.layer_order.length)
    let l3 = new Layer('Test Layer ' + n)
    let t31 = new Unit('Test Unit ' + n, new DummyModel(['x', 'y']))
    l3.add_unit(t31)
    c.add_layer(l3)
    this.setState(c)
  }

  render() {
    const layers = this.state.layer_order
    const listItems = layers.map((layer_name) =>
      // Correct! Key should be specified inside the array.
      // <ListItem key={layer_name} name={layer_name} />
      <li key={layer_name}><LayerView key={layer_name} layer={this.state.layers[layer_name]} /></li>
    );
    return (
      <div>
        <p>Model Container</p>
        <button onClick={() => this.test()}>test</button>
        <p>Layers ({layers.length}):</p>
        <ul>
          {listItems}
        </ul>
      </div>
    );
  }
}