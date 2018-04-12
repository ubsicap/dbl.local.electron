// @flow
import React, { Component } from 'react';
import { Provider, connect } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import Routes from '../routes';
import { alertActions } from '../actions';

const { ipcRenderer } = window.require('electron'); // from https://github.com/electron/electron/issues/9920

type Props = {
  store: {},
  history: {},
  authentication: {},
  dispatch: () => void,
  alert: {}
};

const KEY_IPC_USER_AUTHENTICATION = 'userAuthentication';

class Root extends Component<Props> {
  constructor(props) {
    super(props);
    const { dispatch, history, authentication } = this.props;
    // from https://github.com/chentsulin/electron-react-boilerplate/issues/293
    ipcRenderer.on(
      'navigate',
      (evt, route) => {
        if (history.location.pathname === route) {
          return false;
        }
        history.push(route);
      }
    );
    ipcRenderer.send(KEY_IPC_USER_AUTHENTICATION, authentication);
    // console.log('constructor');
    // console.log(authentication);
    history.listen(() => {
      // clear alert on location change
      dispatch(alertActions.clear());
    });
  }

  componentDidUpdate(prevProps) {
    const { authentication } = this.props;
    const prevAuth = JSON.stringify(prevProps.authentication);
    const currentAuth = JSON.stringify(authentication);
    if (prevAuth !== currentAuth) {
      // console.log('componentDidUpdate');
      // console.log(currentAuth);
      ipcRenderer.send(KEY_IPC_USER_AUTHENTICATION, authentication);
    }
  }

  render() {
    const { alert } = this.props;
    return (
      <div className="jumbotron">
        <div className="container">
          <div className="col-sm-8 col-sm-offset-2">
            {alert.message &&
              <div className={`alert ${alert.type}`}>{alert.message}</div>
            }
            <Provider store={this.props.store}>
              <ConnectedRouter history={this.props.history}>
                <Routes />
              </ConnectedRouter>
            </Provider>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { alert, authentication } = state;
  return {
    alert, authentication
  };
}

export default connect(mapStateToProps)(Root);
