import fs from 'fs-extra';
import path from 'path';
import Store from 'electron-store';
import childProcess from 'child_process';
import xml2js from 'xml2js';
import log from 'electron-log';
// import * as winston from 'winston';
// import { ConsoleForElectron } from 'winston-console-for-electron';
import dblDotLocalConstants from '../constants/dblDotLocal.constants';
import { authHeader } from '../helpers';
import {
  servicesHelpers,
  getApp,
  getResourcePath,
  parseAsJson
} from '../helpers/services';

export const dblDotLocalService = {
  health,
  htmlBaseUrl,
  newBundleMedia,
  sessionAddTasks,
  createNewBundle,
  downloadMetadata,
  startDblDotLocal,
  importConfigXml,
  exportConfigXml,
  getDblDotLocalExecCwd,
  getConfigXmlFullPath,
  getDblDotLocalExecStatus,
  setWorkspacesDir,
  getWorkspacesDir,
  ensureWorkspacesDir,
  getDefaultUserDataWorkspacesFolder,
  convertConfigXmlToJson,
  updateConfigXmlWithNewPaths,
  updateAndWriteConfigXmlSettings,
  startEventSource,
  getEntryRevisions,
  getMapperReport,
  getMappers,
  getUxCanons,
  getIsClosedEventSource,
  getApp
};
export default dblDotLocalService;

/*
const logger = winston.createLogger({
  transports: [
    new ConsoleForElectron({
      prefix: 'winstonConsole',
      stderrLevels: ['error', 'debug'],
      level: 'info'
    })
  ]
});
*/

const UX_API = 'ux';
const SESSION_API = 'session';

function health(method = 'GET') {
  const requestOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return fetch(
    `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/health`,
    requestOptions
  );
}

async function htmlBaseUrl() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/html-base-url`,
      requestOptions
    );
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
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/new-bundle-media`,
      requestOptions
    );
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function getMappers(direction) {
  const requestOptions = {
    method: 'GET',
    headers: { ...authHeader(), 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/mapper/${direction}`,
      requestOptions
    );
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function getMapperReport(direction, uris) {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `uris=${encodeURIComponent(JSON.stringify(uris))}`
  };
  try {
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/mapper/${direction}/report`,
      requestOptions
    );
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function getUxCanons() {
  const requestOptions = {
    method: 'GET',
    headers: { ...authHeader(), 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/${UX_API}/canons`,
      requestOptions
    );
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function getEntryRevisions(dblId) {
  const requestOptions = {
    method: 'GET',
    headers: { ...authHeader(), 'Content-Type': 'application/json' }
  };
  try {
    const response = await fetch(
      `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/dbl/entry-revisions/${dblId}`,
      requestOptions
    );
    return handlResponseAsReadable(response).json();
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

async function sessionAddTasks(innerTasks) {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
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
  return sessionAddTasks(
    `<createNewBundle><medium>${medium}</medium></createNewBundle>`
  );
}

function downloadMetadata(dblId, revision, license) {
  return sessionAddTasks(
    `<downloadMetadata> <entry>${dblId}</entry> <revision>${revision}</revision> <license>${license}</license> </downloadMetadata>`
  );
}

function handlResponseAsReadable(response) {
  return servicesHelpers.handleResponseAsReadable(response);
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
    log.error(error);
  }
}

function startDblDotLocalSubProcess(configXmlFile) {
  // try to start local dbl_dot_local_app process if it exists.
  const dblDotLocalExecPath = getDblDotLocalExecPath();
  log.info(dblDotLocalExecPath);
  if (!fs.exists(dblDotLocalExecPath)) {
    throw new Error(`Not found: ${dblDotLocalExecPath}`);
  }
  const cwd = getDblDotLocalExecCwd();
  const subProcess = childProcess.spawn(dblDotLocalExecPath, [configXmlFile], {
    cwd,
    stdio: ['ignore', 'ignore', 'pipe'],
    detached: false
  });
  subProcess.stderr.on('data', data => {
    // log.error(data);
    log.info(`dbl_dot_local_app: ${data}`);
  });
  ['error', 'close', 'exit'].forEach(event => {
    subProcess.on(event, code => {
      const msg = `dbl_dot_local_app (${event}): ${code}`;
      if (code === null) {
        log.info(msg);
        return;
      }
      log.error(msg);
    });
  });
  return subProcess;
}

function getDblDotLocalExecCwd() {
  return getResourcePath(['extraFiles', 'dbl_dot_local_app']);
}

const electron = require('electron');

const { remote = {} } = electron;

function getElectronShared() {
  if (remote.app) {
    return remote;
  }
  if (electron.app) {
    return electron;
  }
}

function getCurrentWindow() {
  const func = getElectronShared().getCurrentWindow;
  return func();
}

function getDialog() {
  const { dialog } = getElectronShared();
  return dialog;
}

function getFileNameWithOsExtension(
  filename,
  extensionOptions = { win32: '.exe' }
) {
  const execName = `${filename}${extensionOptions[process.platform] || ''}`;
  return execName;
}

function getDblDotLocalExecPath() {
  const execName = getFileNameWithOsExtension('dbl_dot_local_app');
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
  const filePaths = dialog.showOpenDialog(browserWindow, {
    title: 'Select template config.xml',
    defaultPath,
    filters: [
      { name: 'XML files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
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
  const destinationFileName = dialog.showSaveDialog(browserWindow, {
    title: 'Select folder to save config.xml',
    buttonLabel: 'Save',
    defaultPath,
    filters: [
      { name: 'XML files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
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

function getAppSettings() {
  const store = new Store({
    name: 'appSettings',
    defaults: { workspacesLocation: getDefaultUserDataWorkspacesFolder() }
  });
  return store;
}

function setWorkspacesDir(newFolder) {
  getAppSettings().set('workspacesLocation', newFolder);
}

function getAppUserData() {
  return getApp().getPath('userData');
}

function getDefaultUserDataWorkspacesFolder() {
  return path.join(getAppUserData(), 'workspaces');
}

function getWorkspacesDir(defaultFolder) {
  const workspacesLocation = getAppSettings().get('workspacesLocation');
  return workspacesLocation || defaultFolder;
}

function ensureWorkspacesDir() {
  const workspacesLocation = getWorkspacesDir(undefined);
  const defaultWorkspacesLocation = getDefaultUserDataWorkspacesFolder();
  if (workspacesLocation === undefined) {
    setWorkspacesDir(defaultWorkspacesLocation);
  }
}

function convertConfigXmlToJson(workspace) {
  const configXmlPath = dblDotLocalService.getConfigXmlFullPath(workspace);
  const configFileContent = readFileOrTemplate(configXmlPath);
  return parseAsJson(configFileContent);
}

function readFileOrTemplate(configXmlPath) {
  if (!fs.existsSync(configXmlPath)) {
    // import config.xml.template
    const templateConfigXml = path.join(
      dblDotLocalService.getDblDotLocalExecCwd(),
      'config.xml.template'
    );
    if (!fs.existsSync(templateConfigXml)) {
      log.error(`Missing ${templateConfigXml}`);
      return null;
    }
    return fs.readFileSync(templateConfigXml);
  }
  return fs.readFileSync(configXmlPath);
}

async function updateConfigXmlWithNewPaths(workspace) {
  const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
    workspace
  );
  const {
    configXmlSettings: newConfigXmlSettings
  } = dblDotLocalService.updateAndWriteConfigXmlSettings({
    workspace,
    configXmlSettings
  });
  return { ...newConfigXmlSettings };
}

function updateAndWriteConfigXmlSettings({ configXmlSettings, workspace }) {
  // set paths
  const newConfigXmlSettings = JSON.parse(JSON.stringify(configXmlSettings));
  const { fullPath } = workspace;
  const pathToConfigSettingsSystemExecutables = getResourcePath([
    'extraFiles',
    'config_settings_system_executables'
  ]);
  if (
    !newConfigXmlSettings.settings.system[0].executables ||
    !newConfigXmlSettings.settings.system[0].executables[0].sox ||
    !newConfigXmlSettings.settings.system[0].executables[0].ffmpeg
  ) {
    const ffmpegPath = path.join(
      pathToConfigSettingsSystemExecutables,
      path.join('ffmpeg', 'bin', getFileNameWithOsExtension('ffmpeg'))
    );
    const isFfmpegInstalled = fs.existsSync(ffmpegPath);
    newConfigXmlSettings.settings.system[0].executables = {};
    if (isFfmpegInstalled) {
      newConfigXmlSettings.settings.system[0].executables.ffmpeg = [ffmpegPath];
    }
    const soxPath = path.join(
      pathToConfigSettingsSystemExecutables,
      path.join('sox', getFileNameWithOsExtension('sox'))
    );
    const isSoxInstalled = fs.existsSync(soxPath);
    if (isSoxInstalled) {
      newConfigXmlSettings.settings.system[0].executables.sox = [soxPath];
    }
  }
  if (!newConfigXmlSettings.settings.dbl[0].metadataVersions) {
    /* <metadataVersions>
    <read>2.0</read>
    <read>2.1</read>
    <read>2.2</read>
    <read>2.2.1</read>
    <write>2.2.1</write>
      </metadataVersions>
    */
    const metadataVersions = [
      { read: '2.0' },
      { read: '2.1' },
      { read: '2.2' },
      { read: '2.2.1' },
      { write: '2.2.1' }
    ];
    newConfigXmlSettings.settings.dbl[0].metadataVersions = [metadataVersions];
  }
  newConfigXmlSettings.settings.storer[0].bundleRootDir[0] = path.join(
    fullPath,
    'bundles'
  );
  newConfigXmlSettings.settings.storer[0].sessionBundleRootDir[0] = path.join(
    fullPath,
    'sessions'
  );
  newConfigXmlSettings.settings.system[0].logDir[0] = path.join(
    fullPath,
    'log'
  );
  const builder = new xml2js.Builder({ headless: true });
  const xml = builder.buildObject(newConfigXmlSettings);
  const configXmlPath = dblDotLocalService.getConfigXmlFullPath(workspace);
  fs.writeFileSync(configXmlPath, xml);
  // console.log(xml); /* security issue for passwords */
  return { xml, configXmlSettings: newConfigXmlSettings };
}

function startEventSource(authToken, getState) {
  const eventSource = new EventSource(
    `${dblDotLocalConstants.getHttpDblDotLocalBaseUrl()}/events/${authToken}`
  );
  log.info(`SSE connected: ${authToken}`);
  eventSource.onmessage = event => {
    log.info(event);
  };
  eventSource.onopen = () => {
    log.info('Connection to event source opened.');
  };
  eventSource.onerror = error => {
    const { isTrusted, ...rest } = error;
    if (Object.keys(rest).length > 0) {
      log.error('EventSource error:');
      log.error(error);
    }
    const evtSource = error.currentTarget;
    const {
      dblDotLocalConfig: { dblDotLocalExecProcess }
    } = getState();
    if (!dblDotLocalExecProcess && !getIsClosedEventSource(evtSource)) {
      evtSource.close();
      log.info('session EventSource closed');
    }
  };
  return eventSource;
}

function getIsClosedEventSource(eventSource) {
  const IS_CLOSED = 2;
  return eventSource.readyState === IS_CLOSED;
}
