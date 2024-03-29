import React from 'react';
import { useTable, usePagination } from 'react-table'

export class HaemTreatmentExtractor extends React.Component {
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

    fetch(`${this.props.host}treatmentgrid/ping`, { method: 'post', mode: 'cors', headers: {'Content-Type': 'application/json'},
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

  get_treatments(){
    ///treatmentgrid/get/treatments
    fetch(`${this.props.host}treatmentgrid/get/treatments`, { method: 'post', mode: 'cors', headers: {'Content-Type': 'application/json'}})
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

  extract(){
    const url = `${this.props.host}treatmentgrid/extract`;
    const data = this.getData()
    console.log("submitted grid:", data)
    fetch(url, {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}}).then(function(response) {
      response.text().then(function(res) {
        console.log(res)
      });
    });

    fetch(url, {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}}).then((response) => response.json()).
      then((new_result) => {
        console.log(new_result)
        this.update(data, new_result)
      },
      (error) => {
        console.log(error)
        this.update(data, {error: true, error_message: "external plugin returned invalid response"})
      });
  }

  getData(){
    let table=document.getElementById("treatmentgrid")
    let ins, sel, r
    let d = []
    for(const row of table.rows){
      r = {}
      ins = row.getElementsByTagName('input')
      sel = row.getElementsByTagName('select')
      for(const x of ins){
        r[x.name] = x.value
      }
      for(const x of sel){
        //ES6 magic for getting all selected options in a multi select
        if(x.name == "regimen"){
          r[x.name] = [...x.options].filter(o => o.selected).map(v => v.value)
        } else {
          r[x.name] = x.value
        }
        
      }
      if(Object.keys(r).length !== 0){
        r['cycles'] = parseInt(r['cycles'])
        d.push(r)
      }
    }
    return {'grid': d}
  }

  add_row(){
    
    let table=document.getElementById("treatmentgrid").getElementsByTagName('tbody')[0];
    let row = table.insertRow(-1)
    let pos = 0
    let line = row.insertCell(pos) 
    line.innerHTML = `<select name="line">
      <option value="1">1</option><option value="1a">1a</option><option value="1b">1b</option><option value="1c">1c</option><option value="1d">1d</option><option value="2">2</option><option value="2a">2a</option><option value="2b">2b</option><option value="2c">2c</option><option value="2d">2d</option><option value="3">3</option><option value="3a">3a</option><option value="3b">3b</option><option value="3c">3c</option><option value="3d">3d</option><option value="4">4</option><option value="4a">4a</option><option value="4b">4b</option><option value="4c">4c</option><option value="4d">4d</option><option value="5">5</option><option value="5a">5a</option><option value="5b">5b</option><option value="5c">5c</option><option value="5d">5d</option></select>
    `
    pos += 1

    let treatment = row.insertCell(pos)
    treatment.innerHTML = `
      <select name="regimen" multiple>
      <option value="?">?</option><option value="ASCT">ASCT</option><option value="Carfilzomib">Carfilzomib</option><option value="Cisplatin">Cisplatin</option><option value="Cyclophosphamide">Cyclophosphamide</option><option value="Daratumumab">Daratumumab</option><option value="Dexamethasone">Dexamethasone</option><option value="Doxorubicin">Doxorubicin</option><option value="Etoposide">Etoposide</option><option value="Ixazomib">Ixazomib</option><option value="Lenalidomide">Lenalidomide</option><option value="Melphalan">Melphalan</option><option value="Melphalan_HD">Melphalan_HD</option><option value="Panobinostat">Panobinostat</option><option value="Pomalidomide">Pomalidomide</option><option value="Predinosolone">Predinosolone</option><option value="Thalidomide">Thalidomide</option><option value="Velcade">Velcade</option><option value="Vorinostat">Vorinostat</option><option value="Bendamastine">Bendamastine</option><option value="Idarubicin">Idarubicin</option><option value="Cytaribine">Cytaribine</option><option value="Isatuximab">Isatuximab</option><option value="Imid - other">Imid - other</option><option value="PI - other">PI - other</option><option value="Alk - other">Alk - other</option><option value="Top - other">Top - other</option><option value="CD38 - other">CD38 - other</option><option value="HDAC - other">HDAC - other</option><option value="Steroid - other">Steroid - other</option>
      <option value="VTD">VTD</option><option value="HD Melphalan">HD Melphalan</option><option value="RCD">RCD</option><option value="Daratumamab">Daratumamab</option><option value="PBD">PBD</option><option value="DT_PACE">DT_PACE</option><option value="CTDa">CTDa</option><option value="VCDa">VCDa</option><option value="Main Len">Main Len</option><option value="MUK4">MUK4</option><option value="Main Vorinostat">Main Vorinostat</option><option value="Myeloma XI _ RCDa">Myeloma XI _ RCDa</option><option value="Pom_Dex">Pom_Dex</option><option value="MUK5">MUK5</option><option value="DVD">DVD</option><option value="CTD">CTD</option><option value="Myeloma XI _ CTD">Myeloma XI _ CTD</option><option value="Car_Dex">Car_Dex</option><option value="VMP">VMP</option><option value="Off Talcr">Off Talcr</option><option value="Len_Dex_Ixa">Len_Dex_Ixa</option><option value="Cyclo_Pred">Cyclo_Pred</option><option value="Bendamustine">Bendamustine</option><option value="Len_Dex">Len_Dex</option><option value="PBDa">PBDa</option><option value="Len">Len</option><option value="BCPa">BCPa</option><option value="ESHAP">ESHAP</option><option value="Idarubicin">Idarubicin</option><option value="Myeloma XI_Len_Vor">Myeloma XI_Len_Vor</option><option value="Ixa_Cyclo_Dex">Ixa_Cyclo_Dex</option><option value="Car_Len_Dex">Car_Len_Dex</option><option value="Isa_Pom_Dex">Isa_Pom_Dex</option><option value="Dara_Vel_Thal_Dex">Dara_Vel_Thal_Dex</option>
      </select>
    `
    pos += 1

    let cycles = row.insertCell(pos) 
    cycles.innerHTML = `<select name="cycles">
      <option value=1>1</option>
      <option value=2>2</option>
      <option value=3>3</option>
      <option value=4>4</option>
      <option value=5>5</option>
      <option value=6>6</option>
    `
    pos += 1

    let startDate = row.insertCell(pos)
    startDate.innerHTML = `
         <input type="month" name="start">
    `
    pos += 1

    let endDate = row.insertCell(pos)
    endDate.innerHTML = `
    <input type="month" name="end">
    `
    pos += 1

    let response = row.insertCell(pos)
    response.innerHTML = `
      <select name="best_response">
         <option value="Not assessed">Not assessed</option>
         <option value="VGPR">VGPR</option>
       </select>
    `
    pos += 1

    let relapse = row.insertCell(pos)
    relapse.innerHTML = `
    <select name="relapse"><option value="no">No</option><option value="Yes">Yes</option></select>
    `
    pos += 1

    let relapseDate = row.insertCell(pos)
    relapseDate.innerHTML = `
    <input type="month" name="relapse_date">
    `
    pos += 1

  }

  reset(){
    let table=document.getElementById("treatmentgrid").getElementsByTagName('tbody')[0];
    table.innerHTML = ""
    this.props.onChange({'plugin': this.props.plugin_name}) //intentionally undefined
    this.setState({error: false, message: ""})
  }

  render() {
    let hide = this.props.enabled ? "" : "hidden"
    
    return (
<div className={hide}>
<div className="card">
  <h5 className="card-header">Treatment extractor</h5>
  <div className="card-body">
  <table id="treatmentgrid" className="table">
    <thead>
		<tr><th>Line</th>
			<th>Treatment</th>
      <th>Cycles</th>
			<th>Start</th>
			<th>End</th>
			<th>Best response</th>
			<th>Relapse</th>
			<th>Relapse date</th>
		</tr>
    </thead>
    <tbody></tbody>


    </table>
      <button onClick={() => this.add_row()}>Add Line</button>
      <button onClick={() => this.extract()}>Extract</button>
      <button onClick={() => this.reset()}>Reset</button>
      <button onClick={() => this.test()}>Test ping</button>
      <button onClick={() => this.get_treatments()}>Test treatments</button>
      <p>{this.state.error_message}</p>
  </div>
  <div className="card-footer text-muted">
    This content is provided by the plugin HaemTreatmentExtractor@v0.0.1
  </div>
</div>

      
      
      </div>
    );
  }
}
