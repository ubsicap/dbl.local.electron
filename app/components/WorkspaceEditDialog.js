import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import SuperSelectField from 'material-ui-superselectfield/es';
import path from 'path';
import filenamify from 'filenamify';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

type Props = {
  open: boolean,
  settings: ?{},
  handleClickOk: () => {},
  handleClickCancel: () => {},
  getInitialFormErrors: () => {}
};

const hostOptions = ['api.thedigitalbiblelibrary.org', 'api-demo.thedigitalbiblelibrary.org'];

/* eslint-disable camelcase */

function importSettingsToState(settings) {
  const { configXmlSettings, workspace } = settings;
  const workspaceName = workspace.name;
  const { settings: { dbl } } = configXmlSettings;
  const {
    accessToken, secretKey, organizationType, downloadOpenAccessEntries = [false],
    host
  } = dbl[0];
  const settings_dbl_host = host[0];
  const settings_dbl_accessToken = accessToken[0];
  const settings_dbl_secretKey = secretKey[0];
  const settings_dbl_organizationType = organizationType[0];
  const settings_dbl_downloadOpenAccessEntries = downloadOpenAccessEntries[0] === 'true';
  return {
    workspaceName,
    settings_dbl_host,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries
  };
}

function exportStateToSettings(state, origSettings) {
  const {
    workspaceName,
    settings_dbl_host,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries
  } = state;
  const workspacesDir = dblDotLocalService.getWorkspacesDir();
  const newFullPath = path.join(workspacesDir, workspaceName);
  const workspace = { ...origSettings.workspace, name: workspaceName, fullPath: newFullPath };
  const downloadOpenAccessEntries = origSettings.configXmlSettings.settings.dbl[0].downloadOpenAccessEntries ? { downloadOpenAccessEntries: [settings_dbl_downloadOpenAccessEntries] } : {};
  const configXmlSettings = {
    settings: {
      ...origSettings.configXmlSettings.settings,
      dbl: [{
        ...origSettings.configXmlSettings.settings.dbl[0],
        host: [settings_dbl_host],
        accessToken: [settings_dbl_accessToken],
        secretKey: [settings_dbl_secretKey],
        organizationType: [settings_dbl_organizationType],
        ...downloadOpenAccessEntries
        /* downloadOpenAccessEntries: [settings_dbl_downloadOpenAccessEntries] */
      }]
    }
  };
  return { workspace, configXmlSettings };
}

export default class WorkspaceEditDialog extends React.Component<Props> {
  props: Props;
  state = importSettingsToState(this.props.settings);

  componentDidMount() {
    const { getInitialFormErrors } = this.props;
    if (getInitialFormErrors) {
      const errors = Object.keys(this.state).map(name => this.getErrorText(name)).filter(v => v.length);
      getInitialFormErrors(errors);
    }
  }

  renderHostMenuItems = () => hostOptions.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>));

  getOrganizationTypeValues = () => this.state.settings_dbl_organizationType || '';

  handleChangeOrganizationType = (selectedValues, name) => {
    const newValue = selectedValues.map(val => val.value).join(' ');
    this.setState({ [name]: newValue });
  }

  getErrorText = (name) => {
    const value = this.state[name];
    switch (name) {
      case 'workspaceName': {
        return filenamify(value) !== value ? 'Invalid folder name' : '';
      }
      case 'host': {
        return hostOptions.includes(value);
      }
      case 'settings_dbl_accessToken': {
        const regex = RegExp('[0-9A-F]{20}');
        return regex.test(value) ? '' : 'Requires 20 HEX characters';
      }
      case 'settings_dbl_secretKey': {
        const regex = RegExp('[0-9A-F]{80}');
        return regex.test(value) ? '' : 'Requires 80 HEX characters';
      }
      case 'settings_dbl_organizationType': {
        return value.length === 0 ? 'Requires ipc or lch (or both)' : '';
      }
      default: {
        return '';
      }
    }
  }

  hasError = (name) => Boolean(this.getErrorText(name));

  hasAnyErrors = () => Object.keys(this.state).some(name => this.hasError(name));

  handleInputChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;
    this.setState({
      [name]: value
    });
  }

  getInputValue = (name) => this.state[name] || '';

  render() {
    const organizationTypeValues = this.getOrganizationTypeValues().split(' ').filter(v => v.length).map(val => ({ value: val }));
    const organizationTypeOptions = ['lch', 'ipc'].map(option => (
      <div key={option} value={option} >
        {option}
      </div>
    ));
    return (
      <div>
        <Dialog
          open={Boolean(this.props.open)}
          onClose={this.props.handleClickCancel}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Workspace Settings</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {this.props.settings.workspace.name}
            </DialogContentText>
            <FormControl>
              <InputLabel htmlFor="host">Host</InputLabel>
              <Select
                value={this.getInputValue('settings_dbl_host')}
                onChange={this.handleInputChange}
                input={<Input name="settings_dbl_host" id="host" />}
              >
                {this.renderHostMenuItems()}
              </Select>
            </FormControl>
            <TextField
              required
              autoFocus
              margin="dense"
              name="workspaceName"
              error={this.hasError('workspaceName')}
              value={this.getInputValue('workspaceName')}
              helperText={this.getErrorText('workspaceName')}
              label="Workspace Name"
              fullWidth
              onChange={this.handleInputChange}
            />
            <TextField
              required
              autoFocus
              margin="dense"
              name="settings_dbl_accessToken"
              value={this.getInputValue('settings_dbl_accessToken')}
              error={this.hasError('settings_dbl_accessToken')}
              helperText={this.getErrorText('settings_dbl_accessToken')}
              label="Access Token"
              fullWidth
              inputProps={{ maxLength: '20' }}
              onChange={this.handleInputChange}
            />
            <TextField
              required
              autoFocus
              margin="dense"
              name="settings_dbl_secretKey"
              value={this.getInputValue('settings_dbl_secretKey')}
              error={this.hasError('settings_dbl_secretKey')}
              helperText={this.getErrorText('settings_dbl_secretKey')}
              label="Secret Key"
              fullWidth
              inputProps={{ maxLength: '80' }}
              type="password"
              onChange={this.handleInputChange}
            />
            <SuperSelectField
              name="settings_dbl_organizationType"
              multiple
              floatingLabel="Organization Type(s) *"
              floatingLabelStyle={{ color: 'rgba(0, 0, 0, 0.54)' }}
              floatingLabelFocusStyle={{ color: '#303f9f' }}
              value={organizationTypeValues}
              errorText={this.getErrorText('settings_dbl_organizationType')}
              onChange={this.handleChangeOrganizationType}
              style={{ display: 'flex', marginTop: 20 }}
            >
              {organizationTypeOptions}
            </SuperSelectField>
            <FormControlLabel
              control={
                <Switch
                  name="settings_dbl_downloadOpenAccessEntries"
                  checked={this.getInputValue('settings_dbl_downloadOpenAccessEntries')}
                  onChange={this.handleInputChange}
                  color="primary"
                />
              }
              label="Download Open Access Entries"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.props.handleClickCancel} color="primary">
              Cancel
            </Button>
            <Button disabled={this.hasAnyErrors()} onClick={this.props.handleClickOk(this.props.settings, exportStateToSettings(this.state, this.props.settings))} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
