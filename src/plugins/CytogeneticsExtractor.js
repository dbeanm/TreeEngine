import React from 'react';

export class CytogeneticsExtractor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: false,
      message: ''
    }

    this.extract = this.extract.bind(this);
    this.update = this.update.bind(this);
  }

  test() {

    fetch(`${this.props.host}karyotype/ping`, { method: 'post', mode: 'cors', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id:10})})
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result)
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          console.log(error)
      }
    )

  }

  extract(karyotype){
    const url = `${this.props.host}karyotype/extract`;
    const data = {'karyotype_string': karyotype}
    console.log("submitted karyotype:", data)
    fetch(url, {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}}).then((response) => response.json()).
      then((new_result) => {
        console.log(new_result)
        this.update(karyotype, new_result)
      },
      (error) => {
        console.log(error)
        this.update(karyotype, {error: true, error_message: "external plugin returned invalid response"})
      });
  }

  update(input, new_result){
    let error_state, error_msg
    if(typeof new_result !== 'object' || new_result === undefined){
      error_state = true
      error_msg = "Error with external plugin server"      
    } else {
      error_state = new_result.error
      error_msg = new_result.error_message
    }
	  let update = {'input': input, 'output': new_result.result, 'plugin': this.props.plugin_name}
    this.setState({error: error_state, message: error_msg})
	  this.props.onChange(update)
  }

  reset(){
    document.getElementById('cyex_karyotype_str').value = ""
    this.props.onChange({'plugin': this.props.plugin_name}) //intentionally undefined
    this.setState({error: false, message: ""})
  }

  render() {
    let hide = this.props.enabled ? "" : "hidden"

    return (
<div className={hide}>
      <div class="card">
  <h5 class="card-header">Cytogenetics extractor</h5>
  <div class="card-body">
  <div className="form-group row">
          <label htmlFor="cyex_karyotype_str" className="col-sm-2 col-form-label">Karyotype:</label>
          <div className="col-sm-10">
          <input id="cyex_karyotype_str" type='text' className="form-control edit-text" placeholder="Karyotype string" onChange={(e) => this.extract(e.target.value)}></input>
          </div>
          </div>
      <button onClick={() => this.test()}>Ping</button>
      <button onClick={() => this.reset()}>Reset</button>
      <p>{this.state.message}</p>
  </div>
  <div class="card-footer text-muted">
    This content is provided by the plugin CytogeneticsExtractor@v0.0.1
  </div>
</div>
      
      </div>
    );
  }
}
