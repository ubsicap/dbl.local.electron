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
import { dblDotLocalService } from '../services/dbl_dot_local.service';

type Props = {
  settings: ?{},
  handleClickOk: () => {},
  handleClickCancel: () => {}
};

/* eslint-disable camelcase */

function importSettingsToState(settings) {
  const { configXmlSettings, workspace } = settings;
  const workspaceName = workspace.name;
  const { settings: { dbl } } = configXmlSettings;
  const {
    accessToken, secretKey, organizationType, downloadOpenAccessEntries
  } = dbl[0];
  const settings_dbl_accessToken = accessToken[0];
  const settings_dbl_secretKey = secretKey[0];
  const settings_dbl_organizationType = organizationType[0];
  const settings_dbl_downloadOpenAccessEntries = Boolean(downloadOpenAccessEntries[0]);
  return {
    workspaceName,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries
  };
}

function exportStateToSettings(state, origSettings) {
  const {
    workspaceName,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries
  } = state;
  const workspacesDir = dblDotLocalService.getWorkspacesDir();
  const newFullPath = path.join(workspacesDir, workspaceName);
  const workspace = { ...origSettings.workspace, name: workspaceName, fullPath: newFullPath };
  const configXmlSettings = {
    settings: {
      ...origSettings.configXmlSettings.settings,
      dbl: [{
        ...origSettings.configXmlSettings.settings.dbl[0],
        accessToken: [settings_dbl_accessToken],
        secretKey: [settings_dbl_secretKey],
        organizationType: [settings_dbl_organizationType],
        downloadOpenAccessEntries: [settings_dbl_downloadOpenAccessEntries]
      }]
    }
  };
  return { workspace, configXmlSettings };
}

export default class WorkspaceEditDialog extends React.Component<Props> {
  props: Props;
  state = importSettingsToState(this.props.settings);

  getOrganizationTypeValues = () => this.state.settings_dbl_organizationType || '';

  handleChangeOrganizationType = (selectedValues, name) => {
    const newValue = selectedValues.map(val => val.value).join(' ');
    this.setState({ [name]: newValue });
  }

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
          open={Boolean(this.props.settings)}
          onClose={this.props.handleClickCancel}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">Workspace Settings</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {this.props.settings.workspace.name}
            </DialogContentText>
            <TextField
              required
              autoFocus
              margin="dense"
              name="workspaceName"
              label="Workspace Name"
              fullWidth
              value={this.getInputValue('workspaceName')}
              onChange={this.handleInputChange}
            />
            <TextField
              required
              autoFocus
              margin="dense"
              name="settings_dbl_accessToken"
              label="Access Token"
              fullWidth
              inputProps={{ maxLength: '20' }}
              value={this.getInputValue('settings_dbl_accessToken')}
              onChange={this.handleInputChange}
            />
            <TextField
              required
              autoFocus
              margin="dense"
              name="settings_dbl_secretKey"
              label="Secret Key"
              fullWidth
              inputProps={{ maxLength: '80' }}
              type="password"
              value={this.getInputValue('settings_dbl_secretKey')}
              onChange={this.handleInputChange}
            />
            <SuperSelectField
              name="settings_dbl_organizationType"
              multiple
              floatingLabel="Organization Type(s) *"
              floatingLabelStyle={{ color: 'rgba(0, 0, 0, 0.54)' }}
              floatingLabelFocusStyle={{ color: '#303f9f' }}
              value={organizationTypeValues}
              errorText={(organizationTypeValues.length === 0 ? 'Requires ipc or lch (or both)' : '')}
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
            <Button onClick={this.props.handleClickOk(this.props.settings, exportStateToSettings(this.state, this.props.settings))} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
