import React from 'react';
import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.scss';
import { userService } from './services/user.service';
import { dblDotLocalService } from './services/dbl_dot_local.service';

const { app } = require('electron').remote;

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  const { registerObserver } = require('react-perf-devtool'); // eslint-disable-line global-require
  registerObserver();
}

async function ensureDblDotLocal() {
  try {
    return await dblDotLocalService.health();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      // try to start local dbl_dot_local.exe process if it exists.
      const dblDotLocalExecPath = getDblDotLocalExecPath();
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
  }
}

function getDblDotLocalExecCwd() {
  const appPath = app.getAppPath();
  const cwd = (process.env.NODE_ENV === 'production' ?
    path.join(appPath, 'dbl_dot_local') :
    path.join(__dirname, '..', 'resources', 'extraFiles', 'dbl_dot_local'));
  return cwd;
}

function getDblDotLocalExecPath() {
  return path.join(getDblDotLocalExecCwd(), 'dbl_dot_local.exe');
}

const store = configureStore();
userService.logout().catch((error) => {
  console.log(error);
}).then(() => renderApp()).catch();

renderApp();
async function renderApp() {
  await ensureDblDotLocal();
  render(
    <AppContainer>
      <Root store={store} history={history} />
    </AppContainer>,
    document.getElementById('root')
  );

  if (module.hot) {
    module.hot.accept('./containers/Root', () => {
      const NextRoot = require('./containers/Root'); // eslint-disable-line global-require
      render(
        <AppContainer>
          <NextRoot store={store} history={history} />
        </AppContainer>,
        document.getElementById('root')
      );
    });
  }
}
