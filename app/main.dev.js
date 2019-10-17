/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow } from 'electron';
// import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import path from 'path';
import MenuBuilder from './menu';
import { autoUpdaterServices } from './main-process/autoUpdater.services';
import { navigationConstants } from './constants/navigation.constants';
import { logHelpers } from './helpers/log.helpers';

/*
export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
*/

let mainWindow = null;

// Disable caching resources to avoid unexpected behavior when exporting metadata.xml and resources
// see https://github.com/electron/electron/issues/1720
// and https://github.com/scramjs/scram-engine/issues/5#issuecomment-222323820
app.commandLine.appendSwitch('--disable-http-cache');

logHelpers.setupLogFile(__dirname, 'debug', 'error');
log.info('Main App starting...');

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      nativeWindowOpen: true
    }
  });

  mainWindow.loadURL(
    `file://${__dirname}/app.html#${navigationConstants.NAVIGATION_WORKSPACES}`
  );

  /*
     waiting until 'dom-ready' avoids startup errors related to devtools server extension
     https://github.com/LN-Zap/zap-desktop/pull/500
  */
  mainWindow.webContents.on('dom-ready', async () => {
    mainWindow.webContents.closeDevTools();
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      await installExtensions();
    }
  });

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    const myAutoUpdater = autoUpdaterServices.setupAutoUpdater(mainWindow);
    myAutoUpdater.logger.info(
      `logger level? ${myAutoUpdater.logger.transports.file.level}`
    );
    if (process.env.NODE_ENV === 'development') {
      myAutoUpdater.updateConfigPath = path.join(
        __dirname,
        'dev-app-update.yml'
      );
    } else {
      myAutoUpdater.updateConfigPath = path.join(
        __dirname,
        '..',
        '..',
        'app-update.yml'
      );
    }
    myAutoUpdater.logger.info('Request checkForUpdatesAndNotify');
    myAutoUpdater.checkForUpdatesAndNotify();
    myAutoUpdater.logger.info(
      // eslint-disable-next-line no-underscore-dangle
      `autoUpdater config path: ${myAutoUpdater._appUpdateConfigPath}`
    );
    attachDebugger();
  });

  function sendErrorToMainWindow({
    url,
    method,
    status,
    statusText,
    mimeType
  }) {
    return (err, data) => {
      log.error({
        method,
        url,
        status,
        statusText,
        mimeType,
        responseBody: data.body
      });
    };
  }

  /* Adapted from https://discuss.atom.io/t/electron-intercept-http-request-response-on-browserwindow/21868/7 */
  function attachDebugger() {
    const debug = mainWindow.webContents.debugger;
    debug.attach('1.1');
    debug.on('message', (event, method, params) => {
      //  outer context: let firstShotReloaded = false;
      /*
      if (!firstShotReloaded && method === 'Network.responseReceived') {
        // XXX did not find any other way for first page load
        firstShotReloaded = true;
        mainWindow.webContents.reload();
      }
      */
      if (
        method === 'Network.responseReceived' &&
        params.response.status !== 200
      ) {
        const { url, status, statusText, mimeType } = params.response;
        debug.sendCommand(
          'Network.getResponseBody',
          { requestId: params.requestId },
          sendErrorToMainWindow({
            url,
            status,
            statusText,
            mimeType,
            method: params.response.requestHeadersText.split(' ')[0]
          })
          /*
          (err, data) => {
            log.error({ err, data });
            /*
            if (err && err.code === undefined) {
              // XXX may check data.base64encoded boolean and decode ? Maybe not here...
              // if (data.base64encoded) ... Buffer.from(data.body, 'base64');
              log.error({ err, data });
              // this.$store.dispatch('updateStaticSource', data.body);
            }
          } */
        );
      }
    });
    debug.sendCommand('Network.enable');
  }

  mainWindow.on('focus', () => {
    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMainMenu();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  /*
  mainWindow.onerror = err => {
    // log.error(JSON.stringify(err));
  };

  process.on('uncaughtException', err => {
    // log.error(JSON.stringify(err));
  });
   */
  /*
  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
  */
});
