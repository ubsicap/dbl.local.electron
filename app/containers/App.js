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
      const appPage = path.join(__dirname, 'app.html');
      const feedbackWindow = browserWindowService.openInNewWindow(
        appPage,
        navigationConstants.NAVIGATION_SUBMIT_HELP_TICKET
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
