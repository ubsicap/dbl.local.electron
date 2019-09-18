// @flow
import * as React from 'react';
import log from 'electron-log';
import { logHelpers } from '../helpers/log.helpers';

logHelpers.setupRendererErrorLogs();
log.info('UI starting...');

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
