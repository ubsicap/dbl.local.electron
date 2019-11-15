// @flow
import * as React from 'react';
import { connect } from 'react-redux';
import path from 'path';
import log from 'electron-log';
import { history } from '../store/configureStore';
import { ipcRendererConstants } from '../constants/ipcRenderer.constants';
import { logHelpers } from '../helpers/log.helpers';
import { browserWindowService } from '../services/browserWindow.service';
import { navigationConstants } from '../constants/navigation.constants';
import { servicesHelpers } from '../helpers/services';

const { ipcRenderer } = require('electron');

ipcRenderer.on(ipcRendererConstants.KEY_IPC_NAVIGATE, (event, url) => {
  history.push(url);
});

logHelpers.setupRendererErrorLogs();
log.info('UI starting...');

type Props = {
  appState: {},
  children: React.Node
};

function mapStateToProps(state) {
  return {
    appState: state
  };
}

class App extends React.Component<Props> {
  props: Props;

  componentWillMount() {
    ipcRenderer.on(ipcRendererConstants.KEY_IPC_OPEN_SEND_FEEDBACK, () => {
      const currentWindow = servicesHelpers.getCurrentWindow();
      if (
        currentWindow.webContents
          .getURL()
          .includes(navigationConstants.NAVIGATION_SUBMIT_HELP_TICKET)
      ) {
        return; // don't open a new window
      }
      const app = servicesHelpers.getApp();
      const appPath =
        process.env.NODE_ENV === 'production'
          ? path.join(app.getAppPath(), 'app')
          : `${__dirname}`;
      const feedbackWindow = browserWindowService.openInNewWindow(
        `file://${appPath}/app.html#${
          navigationConstants.NAVIGATION_SUBMIT_HELP_TICKET
        }`
      );
      feedbackWindow.webContents.once('dom-ready', () => {
        const { appState } = this.props;
        feedbackWindow.webContents.send(
          ipcRendererConstants.KEY_IPC_ATTACH_APP_STATE_SNAPSHOT,
          appState
        );
      });
    });
  }

  render() {
    const { children } = this.props;
    return <React.Fragment>{children}</React.Fragment>;
  }
}

export default connect(mapStateToProps)(App);
