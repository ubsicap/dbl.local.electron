import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';
import { navigationConstants } from './constants/navigation.constants';

const store = configureStore();

const unlisten = history.listen((location, action) => {
  // location is an object like window.location
  if (location.pathname === navigationConstants.NAVIGATION_WORKSPACES) {
    store.dispatch({
      type: navigationConstants.NAVIGATION_ACTIVITY,
      url: navigationConstants.NAVIGATION_WORKSPACES,
      workspace: null
    });
  }
});

const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  const { registerObserver } = require('react-perf-devtool'); // eslint-disable-line global-require
  registerObserver();
}

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    // eslint-disable-next-line global-require
    const NextRoot = require('./containers/Root').default;
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
