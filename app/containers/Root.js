// @flow
import { PersistGate } from 'redux-persist/integration/react';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import type { Store } from '../reducers/types';
import Routes from '../Routes';

const theme = createMuiTheme({
  typography: {
    useNextVariants: true
  }
});

type Props = {
  store: Store,
  persistor: {},
  history: {}
};

export default class Root extends Component<Props> {
  render() {
    const { store, history, persistor } = this.props;
    return (
      <MuiThemeProvider theme={theme}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ConnectedRouter history={history}>
              <Routes />
            </ConnectedRouter>
          </PersistGate>
        </Provider>
      </MuiThemeProvider>
    );
  }
}
