import React from 'react';

export class CytogeneticsExtractor extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let hide = this.props.enabled ? "" : "hidden"

    return (
      <div className={hide}>
      <p>Cytogenetics extractor</p>
      </div>
    );
  }
}
