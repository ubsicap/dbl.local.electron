// @flow
import * as React from 'react';
import { logHelpers } from '../helpers/log.helpers';

logHelpers.setupRendererErrorLogs();

type Props = {
  children: React.Node
};

export default class App extends React.Component<Props> {
  props: Props;

  render() {
    const { children } = this.props;
    return <React.Fragment>{children}</React.Fragment>;
  }
}
