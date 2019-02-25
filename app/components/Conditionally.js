import React, { Component } from 'react';

type Props = {
  showHOC: boolean,
  children: React.Node
};

export default class Conditionally extends Component<Props> {
  props: Props;
  render() {
    const { showHOC, children: hoc } = this.props;
    return (
      <React.Fragment>{showHOC ? hoc : hoc.props.children}</React.Fragment>
    );
  }
}
