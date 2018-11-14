import fs from 'fs-extra';
import path from 'path';
import childProcess from 'child_process';
import xml2js from 'xml2js';
import log from 'electron-log';
import dblDotLocalConstants from '../constants/dblDotLocal.constants';
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
  getWorkspacesDir,
  convertConfigXmlToJson,
  updateConfigXmlWithNewPaths,
  updateAndWriteConfigXmlSettings,
  startEventSource,
  getEntryRevisions
};
export default dblDotLocalService;

const UX_API = 'ux';
const SESSION_API = 'session';

function health(method = 'GET') {
  const requestOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return fetch(`${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/health`, requestOptions);
}

async function htmlBaseUrl() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(`${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/html-base-url`, requestOptions);
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
    const response = await fetch(`${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/new-bundle-media`, requestOptions);
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function getEntryRevisions(dblId) {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(`${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/dbl/entry-revisions/${dblId}`, requestOptions);
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
  const url = `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${SESSION_API}/add-tasks`;
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
  // try to start local dbl_dot_local_app process if it exists.
  const dblDotLocalExecPath = getDblDotLocalExecPath();
  console.log(dblDotLocalExecPath);
  if (!fs.exists(dblDotLocalExecPath)) {
    throw new Error(`Not found: ${dblDotLocalExecPath}`);
  }
  const cwd = getDblDotLocalExecCwd();
  const subProcess = childProcess.spawn(dblDotLocalExecPath, [configXmlFile], {
    cwd,
    stdio: ['ignore', 'ignore', 'pipe'],
    detached: false
  });
  subProcess.stderr.on('data', (data) => {
    // log.error(data);
    console.log(`dbl_dot_local_app: ${data}`);
  });
  ['error', 'close', 'exit'].forEach(event => {
    subProcess.on(event, (code) => {
      const msg = `dbl_dot_local_app (${event}): ${code}`;
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
  const extaFilesPath = ['extraFiles', 'dbl_dot_local_app'];
  const cwd = (process.env.NODE_ENV === 'production' ?
    path.join(resourcesPath, ...extaFilesPath) :
    path.join(__dirname, anotherParentDirectory, '..', 'resources', ...extaFilesPath));
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
  const execName = `dbl_dot_local_app${(process.platform === 'win32' ? '.exe' : '')}`;
  return path.join(getDblDotLocalExecCwd(), execName);
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

function parseAsJson(configFile) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser();
    parser.parseString(configFile, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function convertConfigXmlToJson(workspace) {
  const configXmlPath = dblDotLocalService.getConfigXmlFullPath(workspace);
  const configFile = readFileOrTemplate(configXmlPath);
  return parseAsJson(configFile);
}

function readFileOrTemplate(configXmlPath) {
  if (!fs.existsSync(configXmlPath)) {
    // import config.xml.template
    const templateConfigXml = path.join(dblDotLocalService.getDblDotLocalExecCwd(), 'config.xml.template');
    if (!fs.existsSync(templateConfigXml)) {
      console.log(`Missing ${templateConfigXml}`);
      return null;
    }
    return fs.readFileSync(templateConfigXml);
  }
  return fs.readFileSync(configXmlPath);
}

async function updateConfigXmlWithNewPaths(workspace) {
  const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(workspace);
  const { configXmlSettings: newConfigXmlSettings } =
    dblDotLocalService.updateAndWriteConfigXmlSettings({ workspace, configXmlSettings });
  return { ...newConfigXmlSettings };
}

function updateAndWriteConfigXmlSettings({ configXmlSettings, workspace }) {
  // set paths
  const newConfigXmlSettings = JSON.parse(JSON.stringify(configXmlSettings));
  const { fullPath } = workspace;
  newConfigXmlSettings.settings.storer[0].bundleRootDir[0] = path.join(fullPath, 'bundles');
  newConfigXmlSettings.settings.storer[0].sessionBundleRootDir[0] = path.join(fullPath, 'sessions');
  newConfigXmlSettings.settings.system[0].logDir[0] = path.join(fullPath, 'log');
  const builder = new xml2js.Builder({ headless: true });
  const xml = builder.buildObject(newConfigXmlSettings);
  const configXmlPath = dblDotLocalService.getConfigXmlFullPath(workspace);
  fs.writeFileSync(configXmlPath, xml);
  // console.log(xml); /* security issue for passwords */
  return { xml, configXmlSettings: newConfigXmlSettings };
}

function startEventSource(authToken, getState) {
  const eventSource = new EventSource(`${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/events/${authToken}`);
  console.log(`SSE connected: ${authToken}`);
  eventSource.onmessage = (event) => {
    console.log(event);
  };
  eventSource.onopen = () => {
    console.log('Connection to event source opened.');
  };
  eventSource.onerror = (error) => {
    console.log('EventSource error.');
    console.log(error);
    const evtSource = error.currentTarget;
    const IS_CLOSED = 2;
    const { dblDotLocalConfig: { dblDotLocalExecProcess } } = getState();
    if (!dblDotLocalExecProcess && evtSource.readyState !== IS_CLOSED) {
      evtSource.close();
      console.log('session EventSource closed');
    }
  };
  return eventSource;
}
