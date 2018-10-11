import fs from 'fs-extra';
import path from 'path';
import childProcess from 'child_process';
import log from 'electron-log';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { authHeader } from '../helpers';
// import { history } from '../store/configureStore';
// import { navigationConstants } from '../constants/navigation.constants';

export const dblDotLocalService = {
  health,
  htmlBaseUrl,
  newBundleMedia,
  sessionAddTasks,
  createNewBundle,
  startDblDotLocal,
  importConfigXml,
  exportConfigXml,
  getDblDotLocalExecCwd,
  getConfigXmlFullPath,
  getDblDotLocalExecStatus,
  getWorkspacesDir
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
    return handlResponseAsReadable(response).text();
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

async function getDblDotLocalExecStatus() {
  try {
    const isRunning = await dblDotLocalService.health();
    if (isRunning) {
      return { isRunning: true };
    }
  } catch (error) {
    return { isRunning: false, error };
  }
}

async function startDblDotLocal(configXmlFile) {
  try {
    const { isRunning } = await getDblDotLocalExecStatus();
    if (isRunning) {
      return null;
    }
    const doesConfigExist = await fs.exists(configXmlFile);
    if (!doesConfigExist) {
      // history.push(navigationConstants.NAVIGATION_WORKSPACES);
      throw new Error(`Could not find config.xml: ${configXmlFile}`);
    }
    return startDblDotLocalSubProcess(configXmlFile);
  } catch (error) {
    console.log(error);
  }
}

function startDblDotLocalSubProcess(configXmlFile) {
  // try to start local dbl_dot_local.exe process if it exists.
  const dblDotLocalExecPath = getDblDotLocalExecPath();
  console.log(dblDotLocalExecPath);
  if (!fs.exists(dblDotLocalExecPath)) {
    throw new Error(`Not found: ${dblDotLocalExecPath}`);
  }
  const cwd = getDblDotLocalExecCwd();
  const subProcess = childProcess.spawn(dblDotLocalExecPath, [configXmlFile], {
    cwd,
    stdio: [ 'ignore', 'ignore', 'pipe' ],
    detached: false
  });
  subProcess.stderr.on('data', (data) => {
    // log.error(data);
    console.log(`dbl_dot_local.exe: ${data}`);
  });
  ['error', 'close', 'exit'].forEach(event => {
    subProcess.on(event, (code) => {
      const msg = `dbl_dot_local.exe (${event}): ${code}`;
      log.error(msg);
      console.log(msg);
    });
  });
  return subProcess;
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

function getDblDotLocalExecPath() {
  return path.join(getDblDotLocalExecCwd(), 'dbl_dot_local.exe');
}

function getConfigXmlDefaultFolder() {
  const app = getApp();
  const downloadsFolder = app.getPath('downloads');
  const defaultPath = path.join(downloadsFolder, 'config.xml');
  return defaultPath;
}

function importConfigXml(destination) {
  const browserWindow = getCurrentWindow();
  const defaultPath = getConfigXmlDefaultFolder();
  const dialog = getDialog();
  const filePaths = dialog.showOpenDialog(
    browserWindow,
    {
      title: 'Select template config.xml',
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
  const newConfigFile = fs.readFileSync(newSourceFilePath);
  fs.writeFileSync(destination, newConfigFile);
}

function exportConfigXml(sourceFilePath) {
  const browserWindow = getCurrentWindow();
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
  const activeConfigFile = fs.readFileSync(sourceFilePath);
  fs.writeFileSync(destinationFileName, activeConfigFile);
  const { shell } = electron;
  shell.showItemInFolder(destinationFileName);
}

function getConfigXmlFullPath(workspace) {
  const { fullPath: workspaceFullPath } = workspace;
  return path.join(workspaceFullPath, 'config.xml');
}

function getWorkspacesDir() {
  const app = getApp();
  return path.join(app.getPath('userData'), 'workspaces');
}
