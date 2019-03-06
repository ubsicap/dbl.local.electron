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

/*
 * from https://github.com/megahertz/electron-log
 * on Linux: ~/.config/<app name>/log.log
 * on OS X: ~/Library/Logs/<app name>/log.log
 * on Windows: %USERPROFILE%\AppData\Roaming\<app name>\log.log
 */
if (process.env.NODE_ENV === 'development') {
  log.transports.file.level = 'debug';
  log.transports.file.file = path.join(__dirname, 'log-dev.txt');
} else {
  log.transports.file.level = 'info';
}
log.info('App starting...');
log.info(`Log file: ${log.transports.file.file}`);

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
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

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
    myAutoUpdater.logger.info('Request checkForUpdatesAndNotify');
    myAutoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on('focus', () => {
    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMainMenu();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.onerror = err => {
    log.error(JSON.stringify(err));
  };

  process.on('uncaughtException', err => {
    log.error(JSON.stringify(err));
  });

  /*
  session.defaultSession.webRequest.onErrorOccurred((details) => {
    log.error(JSON.stringify(details));
  });
   */
  /*
  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
  */
});
