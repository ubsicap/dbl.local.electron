// @flow
import fs from 'fs-extra';
import uuidv1 from 'uuid/v1';
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
import { utilities } from '../utils/utilities';

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
      feedbackWindow.webContents.once('dom-ready', async () => {
        const { appState } = this.props;
        const appStateFilePath = await createAppStateAttachment(appState);
        feedbackWindow.webContents.send(
          ipcRendererConstants.KEY_IPC_ATTACH_APP_STATE_SNAPSHOT,
          appStateFilePath
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

async function createAppStateAttachment(appState) {
  const app = servicesHelpers.getApp();
  const tempPath = app.getPath('temp');
  const uuid1 = uuidv1();
  const uid = uuid1.substr(0, 5);
  const appStateFilePath = utilities.normalizeLinkPath(
    path.join(tempPath, `appState-${uid}.json`)
  );
  /*
    items,
    allBundles,
    addedByBundleIds
   */
  const { navigation, bundles, ...restAppState } = appState;
  const { items, allBundles, addedByBundleIds, ...restBundleData } = bundles;
  const MAX_ITEMS = 20;
  const trimmedItems =
    items.length <= MAX_ITEMS ? items : items.slice(0, MAX_ITEMS);
  const trimmedAllBundles =
    items.length <= MAX_ITEMS ? allBundles : allBundles.slice(0, MAX_ITEMS);
  const lastNavigation = navigation[navigation.length - 1];
  const { bundle: lastBundleIdVisited = {} } = lastNavigation || {};
  const trimmedAddedByBundleIds =
    items.length <= MAX_ITEMS
      ? addedByBundleIds
      : { [lastBundleIdVisited]: addedByBundleIds[lastBundleIdVisited] };
  const trimmedBundles = {
    ...restBundleData,
    items: trimmedItems,
    allBundles: trimmedAllBundles,
    addedByBundleIds: trimmedAddedByBundleIds
  };
  const trimmedAppState = {
    navigation,
    ...restAppState,
    bundles: trimmedBundles
  };
  await fs.writeFile(
    appStateFilePath,
    JSON.stringify(trimmedAppState, null, 1)
  );
  return appStateFilePath;
}
