import React from 'react';

export class DummyExtractor extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let hide = this.props.enabled ? "" : "hidden"

    return (
      <div className={hide}>
      <p>Dummy extractor</p>
      </div>
    );
  }
}