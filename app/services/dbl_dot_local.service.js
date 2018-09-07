import fs from 'fs-extra';
import path from 'path';
import childProcess from 'child_process';
import log from 'electron-log';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { authHeader } from '../helpers';

export const dblDotLocalService = {
  health,
  htmlBaseUrl,
  newBundleMedia,
  sessionAddTasks,
  createNewBundle,
  ensureDblDotLocal,
  getDblDotLocalConfigFilePath,
  importConfigXml,
  exportConfigXml
};
export default dblDotLocalService;

const UX_API = 'ux';
const SESSION_API = 'session';

function health(method = 'GET') {
  const requestOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/health`, requestOptions);
}

async function htmlBaseUrl() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${UX_API}/html-base-url`, requestOptions);
    return handlResponseAsReadable(response);
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function newBundleMedia() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${UX_API}/new-bundle-media`, requestOptions);
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function sessionAddTasks(innerTasks) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `xml=<tasks> ${encodeURIComponent(innerTasks)} </tasks>`
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${SESSION_API}/add-tasks`;
  try {
    const response = await fetch(url, requestOptions);
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

function createNewBundle(medium) {
  return sessionAddTasks(`<createNewBundle><medium>${medium}</medium></createNewBundle>`);
}

function handlResponseAsReadable(response) {
  if (!response.ok) {
    if (response.message === 'Failed to fetch') {
      const error = { text: () => response.message };
      return Promise.reject(error);
    }
    return Promise.reject(response);
  }
  return response;
}

async function ensureDblDotLocal() {
  try {
    return await dblDotLocalService.health();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      const configXmlFile = dblDotLocalService.getDblDotLocalConfigFilePath();
      const doesConfigExists = await fs.exists(configXmlFile);
      if (!doesConfigExists) {
        const browserWindow = getCurrentWindow();
        importConfigXml(browserWindow);
        const doesConfigExistsAgain = await fs.exists(configXmlFile);
        if (!doesConfigExistsAgain) {
          browserWindow.close();
          return;
        }
      }
      startDblDotLocalSubProcess();
    }
  }
}

function startDblDotLocalSubProcess() {
  // try to start local dbl_dot_local.exe process if it exists.
  const dblDotLocalExecPath = getDblDotLocalExecPath();
  console.log(dblDotLocalExecPath);
  if (fs.exists(dblDotLocalExecPath)) {
    const cwd = getDblDotLocalExecCwd();
    const subProcess = childProcess.execFile(dblDotLocalExecPath, {
      cwd
    }, (err, data) => {
      console.log(err);
      log.error(`dbl_dot_local.exe (terminated): ${err}`);
      console.log(`dbl_dot_local.exe: ${data.toString()}`);
    });
    /*
    subProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    */
    subProcess.stderr.on('data', (data) => {
      // log.error(data);
      console.log(`dbl_dot_local.exe: ${data}`);
    });
  }
}

function getDblDotLocalExecCwd() {
  // https://github.com/chentsulin/electron-react-boilerplate/issues/1047#issuecomment-319359165
  const app = getApp();
  const isMainProcess = Boolean(electron.app);
  const resourcesPath = path.resolve(app.getAppPath(), '../');
  const anotherParentDirectory = isMainProcess ? '..' : '';
  // console.log(resourcesPath);
  const cwd = (process.env.NODE_ENV === 'production' ?
    path.join(resourcesPath, 'extraFiles', 'dbl_dot_local') :
    path.join(__dirname, anotherParentDirectory, '..', 'resources', 'extraFiles', 'dbl_dot_local'));
  // console.log(cwd);
  return cwd;
}

const electron = require('electron');

const { remote = {} } = electron;

function getApp() {
  const app = remote.app || electron.app;
  return app;
}

function getCurrentWindow() {
  const func = remote.getCurrentWindow || electron.getCurrentWindow;
  return func();
}

function getDialog() {
  const dialog = remote.dialog || electron.dialog;
  return dialog;
}

function getDblDotLocalConfigFilePath() {
  return path.join(getDblDotLocalExecCwd(), 'config.xml');
}

function getDblDotLocalExecPath() {
  return path.join(getDblDotLocalExecCwd(), 'dbl_dot_local.exe');
}

function getConfigXmlDefaultFolder() {
  const app = getApp();
  const downloadsFolder = app.getPath('downloads');
  const defaultPath = path.join(downloadsFolder, 'config.xml');
  return defaultPath;
}

function importConfigXml(browserWindow) {
  const defaultPath = getConfigXmlDefaultFolder();
  const dialog = getDialog();
  const filePaths = dialog.showOpenDialog(
    browserWindow,
    {
      title: 'Select config.xml for dbl_dot_local',
      defaultPath,
      filters: [
        { name: 'XML files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    }
  );
  if (!filePaths) {
    return;
  }
  const [newSourceFilePath] = filePaths;
  const destination = dblDotLocalService.getDblDotLocalConfigFilePath();
  const newConfigFile = fs.readFileSync(newSourceFilePath);
  fs.writeFileSync(destination, newConfigFile);
  dialog.showMessageBox(
    browserWindow,
    { message: `Imported ${newSourceFilePath}\n\nPlease restart.` }
  );
  browserWindow.close();
}

function exportConfigXml(browserWindow) {
  const defaultPath = getConfigXmlDefaultFolder();
  const dialog = getDialog();
  const destinationFileName = dialog.showSaveDialog(
    browserWindow,
    {
      title: 'Select folder to save config.xml',
      defaultPath,
      filters: [
        { name: 'XML files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
  );
  if (!destinationFileName) {
    return;
  }
  const sourceFilePath = dblDotLocalService.getDblDotLocalConfigFilePath();
  const activeConfigFile = fs.readFileSync(sourceFilePath);
  fs.writeFileSync(destinationFileName, activeConfigFile);
  const { shell } = electron;
  shell.showItemInFolder(destinationFileName);
}
