import React from 'react';

export class DummyExtractor extends React.Component {
  constructor(props) {
    super(props);
	
	this.update = this.update.bind(this);
  }

  update(value){
	  let new_result = this.extract(value)
	  let update = {'input': value, 'output': new_result, 'plugin': this.props.plugin_name}
	  this.props.onChange(update)
  }

  extract(input){
	  return {"Number of cytogenetic abnormalities": 1, "Lines of therapy":1, "mask this out": input}
  }

  render() {
    let hide = this.props.enabled ? "" : "hidden"

    return (
      <div className={hide}>
      <p>Dummy extractor</p>
	  <input type="string" onChange={(e) => this.update(e.target.value)}></input>
      </div>
    );
  }
}