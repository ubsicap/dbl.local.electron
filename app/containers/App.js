// @flow
import * as React from 'react';
import log from 'electron-log';
import { history } from '../store/configureStore';
import { ipcRendererConstants } from '../constants/ipcRenderer.constants';
import { logHelpers } from '../helpers/log.helpers';

const { ipcRenderer } = require('electron');

ipcRenderer.on(ipcRendererConstants.KEY_IPC_NAVIGATE, (event, url) => {
  history.push(url);
});

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
