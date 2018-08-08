import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';

const { app } = require('electron').remote;

export const dblDotLocalService = {
  health,
  htmlBaseUrl,
  ensureDblDotLocal,
  getDblDotLocalConfigFilePath,
  getDblDotLocalConfigOrigFilePath
};
export default dblDotLocalService;

const UX_API = 'ux';

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
    execFile(dblDotLocalExecPath, {
      cwd
    }, (err, data) => {
      console.log(err);
      console.log(data.toString());
    });
  }
}

function getDblDotLocalExecCwd() {
  // https://github.com/chentsulin/electron-react-boilerplate/issues/1047#issuecomment-319359165
  const resourcesPath = path.resolve(app.getAppPath(), '../');
  const cwd = (process.env.NODE_ENV === 'production' ?
    path.join(resourcesPath, 'extraFiles', 'dbl_dot_local') :
    path.join(__dirname, '..', 'resources', 'extraFiles', 'dbl_dot_local'));
  return cwd;
}

function getDblDotLocalConfigFilePath() {
  return path.join(getDblDotLocalExecCwd(), 'config.xml');
}

function getDblDotLocalConfigOrigFilePath() {
  return path.join(getDblDotLocalExecCwd(), 'config.xml.orig');
}

function getDblDotLocalExecPath() {
  return path.join(getDblDotLocalExecCwd(), 'dbl_dot_local.exe');
}
