// @flow
import React from 'react';
import { connect } from 'react-redux';
import { DebounceInput } from 'react-debounce-input';
import path from 'path';
import wait from 'wait-promise';
import Tooltip from '@material-ui/core/Tooltip';
import Button from '@material-ui/core/Button';
import { userActions } from '../actions/user.actions';
import { alertActions } from '../actions/alert.actions';
import { loadHtmlBaseUrl } from '../actions/dblDotLocalConfig.actions';
import { utilities } from '../utils/utilities';
import MenuAppBar from '../components/MenuAppBar';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';

function mapStateToProps(state, props) {
  const { workspaceName } = props.match.params;
  const { authentication, alert, dblDotLocalConfig } = state;
  const loggingIn = Boolean(authentication.loggingIn);
  const lastUserSettings = getLastUsersLoginSettings(workspaceName) || {};
  const lastWorkspaceUserEmail = lastUserSettings.email || '';
  return {
    workspaceName: workspaceName || '(Unknown Workspace)',
    loggingIn,
    alert,
    dblBaseUrl: dblDotLocalConfig.dblBaseUrl,
    lastWorkspaceUserEmail
  };
}

const mapDispatchToProps = {
  login: userActions.login,
  clearAlerts: alertActions.clear,
  loadHtmlBaseUrl
};

function getLastUsersLoginSettings(workspaceName) {
  if (!workspaceName) {
    return undefined;
  }
  const workspacePath = path.join(dblDotLocalService.getWorkspacesDir(), workspaceName);
  const lastLoginSettings = workspaceUserSettingsStoreServices.loadLastUserLoginSettings(workspacePath);
  return lastLoginSettings;
}

type Props = {
  login: () => {},
  clearAlerts: () => {},
  loadHtmlBaseUrl: () => {},
  loggingIn: boolean,
  alert: {},
  dblBaseUrl: ?string,
  workspaceName: string,
  lastWorkspaceUserEmail: string
};

/*
 * From https://github.com/cornflourblue/react-redux-registration-login-example/blob/master/src/LoginPage/LoginPage.jsx
 * See also Login form/page mockup at https://share.goabstract.com/a8fa671d-82d4-4c2b-9635-24bcc2656f75
 */
class LoginForm extends React.Component {
  props: Props;
  constructor(props) {
    super(props);
    this.state = {
      username: props.lastWorkspaceUserEmail,
      password: '',
      submitted: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    this.mounted = true;
    this.startWaitUntil();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  getIsUrlReadyOrUnmounted = () => {
    return this.isDblBaseUrlReady() || !this.mounted;
  }

  startWaitUntil = async () => {
    await wait.every(3000).and(this.ensureLoadHtmlBaseUrl).until(this.getIsUrlReadyOrUnmounted);
  }

  isDblBaseUrlReady = () => Boolean(this.props.dblBaseUrl);

  ensureLoadHtmlBaseUrl = () => {
    if (!this.props.dblBaseUrl) {
      this.props.loadHtmlBaseUrl();
    }
  }

  handleChange = (name) => (e) => {
    const { value } = e.target;
    this.ensureLoadHtmlBaseUrl();
    this.setState({ [name]: value });
  }

  handleSubmit(e) {
    e.preventDefault();

    this.setState({ submitted: true });
    const { username, password } = this.state;
    const { workspaceName } = this.props;
    if (username && password) {
      this.props.clearAlerts();
      this.props.login(username, password, workspaceName);
    }
  }

  renderLinkToDBLOrNot = (dblTitle) => {
    const { dblBaseUrl } = this.props;
    if (!dblBaseUrl) {
      return dblTitle;
    }
    return (
      <Tooltip title={dblBaseUrl} placement="top">
        <a href={dblBaseUrl} onClick={utilities.onOpenLink(dblBaseUrl)}>{dblTitle}</a>
      </Tooltip>);
  }

  renderLoginForm = () => {
    const { loggingIn, alert, dblBaseUrl } = this.props;
    const { username, password, submitted } = this.state;
    return (
      <div className="jumbotron">
        <div className="container">
          <div>
            {alert.message &&
              <div className={`alert ${alert.type}`}>{alert.message}</div>
            }
            <div className="h-100">
              <div className="row align-items-center h-100">
                <div className="col-6 mx-auto">
                  <div className="container h-100 border-primary justify-content-center">
                    <h6 className="text-center">Connect to the {this.renderLinkToDBLOrNot('DBL')}</h6>
                    <form name="form" onSubmit={this.handleSubmit}>
                      <div className={`form-group${submitted && !username ? ' has-error' : ''}`}>
                        <DebounceInput
                          debounceTimeout={300}
                          type="email"
                          className="form-control"
                          value={username}
                          placeholder="username (email)"
                          onChange={this.handleChange('username')}
                        />
                        {submitted && !username &&
                        <div className="help-block">Username is required</div>
                                  }
                      </div>
                      <div className={`form-group${submitted && !password ? ' has-error' : ''}`}>
                        <DebounceInput
                          debounceTimeout={300}
                          type="password"
                          className="form-control"
                          value={password}
                          placeholder="password"
                          onChange={this.handleChange('password')}
                          onFocus={e => e.target.select()}
                        />
                        {submitted && !password &&
                        <div className="help-block">Password is required</div>
                                  }
                      </div>
                      <div className="text-center">
                        <Tooltip title={!dblBaseUrl ? 'Waiting for dbl_dot_local.exe service...' : `Click to authenticate user via ${dblBaseUrl}`}>
                          <div>
                            <Button disabled={!dblBaseUrl} type="submit" color="primary" variant="contained" onClick={this.handleSubmit} fullWidth>
                              Login
                              <img hidden={!loggingIn} style={{ paddingLeft: '5px' }} src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==" alt="loading..." />
                            </Button>
                          </div>
                        </Tooltip>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { workspaceName } = this.props;
    return (
      <React.Fragment>
        <MenuAppBar showSearch={false} workspaceName={workspaceName} />
        {this.renderLoginForm()}
      </React.Fragment>
    );
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(LoginForm);

/*
export default class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { email: '', password: '' };

    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleEmailChange(event) {
    this.setState({ email: event.target.value });
  }

  handlePasswordChange(event) {
    this.setState({ password: event.target.value });
  }

  handleSubmit(event) {
    alert(`A name was submitted: ${this.state.email}`);
    event.preventDefault();
  }

  render() {
    return (
      <div className="h-100">
        <div className="row align-items-center h-100">
          <div className="col-6 mx-auto">
            <div className="container h-100 border-primary justify-content-center">
              <h6 className="text-center">Connect to the DBL</h6>
              <form onSubmit={this.handleSubmit}>
                <div className="form-group">
                  <input placeholder="username" name="email" type="email"
                   className="form-control" value={this.state.email}
                   onChange={this.handleEmailChange} required />
                </div>
                <div className="form-group">
                  <input placeholder="password" name="password" type="password"
                   className="form-control" value={this.state.password}
                    onChange={this.handlePasswordChange} required />
                </div>
                <div className="text-center">
                  <button type="submit"
                   className="btn btn-block btn-primary center-block">Login</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
*/

