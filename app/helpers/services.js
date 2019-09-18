import path from 'path';
import xml2js from 'xml2js';

export const servicesHelpers = {
  handleResponseAsReadable,
  getApp,
  getIsMainProcess,
  getDialog,
  getCurrentWindow,
  getElectronShared
};
export default servicesHelpers;

function handleResponseAsReadable(response) {
  if (!response.ok) {
    if (response.message === 'Failed to fetch' || typeof response.text !== 'function') {
      const error = { text: () => response.message };
      return Promise.reject(error);
    }
    return Promise.reject(response);
  }
  return response;
}


const electron = require('electron');

const { remote = {} } = electron;

export function getApp() {
  const app = remote.app || electron.app;
  return app;
}

function getIsMainProcess() {
  return Boolean(electron.app);
}

export function getElectronShared() {
  if (remote.app) {
    return remote;
  }
  if (electron.app) {
    return electron;
  }
}

export function getCurrentWindow() {
  if (getIsMainProcess()) {
    const { BrowserWindow } = electron;
    return BrowserWindow.getAllWindows()[0];
  }
  return remote.getCurrentWindow();
}

export function getDialog() {
  const { dialog } = getElectronShared();
  return dialog;
}

export function getResourcePath(extraFilesPath: array) {
  // https://github.com/chentsulin/electron-react-boilerplate/issues/1047#issuecomment-319359165
  const app = getApp();
  const isMainProcess = getIsMainProcess();
  const resourcesPath = path.resolve(app.getAppPath(), '../');
  const anotherParentDirectory = isMainProcess ? '..' : '';
  // console.log(resourcesPath);
  const reportsCssPath = (process.env.NODE_ENV === 'production' ?
    path.join(resourcesPath, ...extraFilesPath) :
    path.join(__dirname, anotherParentDirectory, '..', 'resources', ...extraFilesPath));
  // console.log(cwd);
  return reportsCssPath;
}

export function parseAsJson(content) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser();
    parser.parseString(content, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
