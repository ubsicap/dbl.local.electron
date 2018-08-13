// @flow
import React from 'react';
import { connect } from 'react-redux';
import Tooltip from '@material-ui/core/Tooltip';
import { userActions, alertActions } from '../actions';
import { loadHtmlBaseUrl } from '../actions/dblDotLocalConfig.actions';
import { utilities } from '../utils/utilities';

function mapStateToProps(state) {
  const { authentication, alert, dblDotLocalConfig } = state;
  const loggingIn = Boolean(authentication.loggingIn);
  return {
    loggingIn,
    alert,
    dblBaseUrl: dblDotLocalConfig.dblBaseUrl
  };
}

const mapDispatchToProps = {
  logout: userActions.logout,
  login: userActions.login,
  clear: alertActions.clear,
  loadHtmlBaseUrl
};

type Props = {
  logout: () => {},
  login: () => {},
  clear: () => {},
  loadHtmlBaseUrl: () => {},
  loggingIn: boolean,
  alert: {},
  dblBaseUrl: ?string
};

/*
 * From https://github.com/cornflourblue/react-redux-registration-login-example/blob/master/src/LoginPage/LoginPage.jsx
 * See also Login form/page mockup at https://share.goabstract.com/a8fa671d-82d4-4c2b-9635-24bcc2656f75
 */
class LoginForm extends React.Component {
  props: Props;
  constructor(props) {
    super(props);
    // reset login status
    this.props.logout();
    this.state = {
      username: '',
      password: '',
      submitted: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    this.ensureLoadHtmlBaseUrl();
  }

  ensureLoadHtmlBaseUrl = () => {
    if (!this.props.dblBaseUrl) {
      this.props.loadHtmlBaseUrl();
    }
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.ensureLoadHtmlBaseUrl();
    this.setState({ [name]: value });
  }

  handleSubmit(e) {
    e.preventDefault();

    this.setState({ submitted: true });
    const { username, password } = this.state;
    const { clear, login } = this.props;
    if (username && password) {
      clear();
      login(username, password);
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

  render() {
    const { loggingIn, alert } = this.props;
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
                        <input placeholder="username" type="email" className="form-control" name="username" value={username} onChange={this.handleChange} />
                        {submitted && !username &&
                        <div className="help-block">Username is required</div>
                                  }
                      </div>
                      <div className={`form-group${submitted && !password ? ' has-error' : ''}`}>
                        <input placeholder="password" type="password" className="form-control" name="password" value={password} onChange={this.handleChange} onFocus={e => e.target.select()} />
                        {submitted && !password &&
                        <div className="help-block">Password is required</div>
                                  }
                      </div>
                      <div className="text-center">
                        <button className="btn btn-primary btn-block center-block">Login
                          <img hidden={!loggingIn} style={{ paddingLeft: '5px' }} src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==" alt="loading..." />
                        </button>
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

