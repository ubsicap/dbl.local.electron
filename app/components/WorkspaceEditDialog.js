import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import Folder from '@material-ui/icons/Folder';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import CloseIcon from '@material-ui/icons/Close';
import Switch from '@material-ui/core/Switch';
import Tooltip from '@material-ui/core/Tooltip';
import path from 'path';
import fs from 'fs-extra';
import filenamify from 'filenamify';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

const { dialog } = require('electron').remote;

type Props = {
  classes: {},
  open: boolean,
  settings: ?{},
  handleClickOk: () => {},
  handleClickCancel: () => {},
  getInitialFormErrors: () => {}
};

const hostOptions = ['api.thedigitalbiblelibrary.org', 'api-demo.thedigitalbiblelibrary.org'];

const styles = theme => ({
  formControl: {
    display: 'flex',
  },
  icon: {
    marginRight: theme.spacing.unit * 2,
  },
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: (ITEM_HEIGHT * 4.5) + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

/* eslint-disable camelcase */

function importSettingsToState(settings) {
  const { configXmlSettings, workspace } = settings;
  const workspaceName = workspace.name;
  const { settings: { dbl, storer } } = configXmlSettings;
  const {
    accessToken, secretKey, organizationType, downloadOpenAccessEntries = [false],
    host
  } = dbl[0];
  const settings_dbl_host = host[0];
  const settings_dbl_accessToken = accessToken[0];
  const settings_dbl_secretKey = secretKey[0];
  const settings_dbl_organizationType = organizationType[0];
  const settings_dbl_downloadOpenAccessEntries = downloadOpenAccessEntries[0] === 'true';
  const { metadataTemplateDir: metadataTemplateDirOrNot = [null] } = storer[0];
  const [metadataTemplateDir] = metadataTemplateDirOrNot;
  const settings_storer_metadataTemplateDirOrNot = metadataTemplateDir ?
    { settings_storer_metadataTemplateDir: metadataTemplateDir } : {};
  const imported = {
    workspaceName,
    settings_dbl_host,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries,
    ...settings_storer_metadataTemplateDirOrNot
  };
  console.log(imported);
  return imported;
}

function selectHtmlSetting(host) {
  if (host === 'api-demo.thedigitalbiblelibrary.org') {
    return 'https://demo.thedigitalbiblelibrary.org';
  }
  return 'https://thedigitalbiblelibrary.org';
}

function exportStateToSettings(state, origSettings) {
  const {
    workspaceName,
    settings_dbl_host,
    settings_dbl_accessToken,
    settings_dbl_secretKey,
    settings_dbl_organizationType,
    settings_dbl_downloadOpenAccessEntries,
    settings_storer_metadataTemplateDir: metadataTemplateDir,
  } = state;
  const workspacesDir = dblDotLocalService.getWorkspacesDir();
  const newFullPath = path.join(workspacesDir, workspaceName);
  const workspace = { ...origSettings.workspace, name: workspaceName, fullPath: newFullPath };
  const downloadOpenAccessEntries =
    origSettings.configXmlSettings.settings.dbl[0].downloadOpenAccessEntries ?
      { downloadOpenAccessEntries: [settings_dbl_downloadOpenAccessEntries] } : {};
  const settings_storer_metadataTemplateDirOrNot = metadataTemplateDir ?
    { metadataTemplateDir } : {};
  const configXmlSettings = {
    settings: {
      ...origSettings.configXmlSettings.settings,
      dbl: [{
        ...origSettings.configXmlSettings.settings.dbl[0],
        host: [settings_dbl_host],
        html: [selectHtmlSetting(settings_dbl_host)],
        accessToken: [settings_dbl_accessToken],
        secretKey: [settings_dbl_secretKey],
        organizationType: [settings_dbl_organizationType],
        ...downloadOpenAccessEntries
        /* downloadOpenAccessEntries: [settings_dbl_downloadOpenAccessEntries] */
      }],
      storer: [{
        ...origSettings.configXmlSettings.settings.storer[0],
        ...settings_storer_metadataTemplateDirOrNot,
      }],
    }
  };
  return { workspace, configXmlSettings };
}

class WorkspaceEditDialog extends React.Component<Props> {
  props: Props;
  constructor(props) {
    super(props);
    this.state = importSettingsToState(props.settings);
  }

  componentDidMount() {
    const { getInitialFormErrors } = this.props;
    if (getInitialFormErrors) {
      const errors =
        Object.keys(this.state).map(name => this.getErrorText(name)).filter(v => v.length);
      getInitialFormErrors(errors);
    }
  }

  renderHostMenuItems = () =>
    hostOptions.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>));

  getOrganizationTypeValues = () => this.state.settings_dbl_organizationType || '';

  handleChangeOrganizationType = name => event => {
    const selectedValues = event.target.value;
    const newValue = selectedValues.join(' ');
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
      case 'settings_storer_metadataTemplateDir': {
        if (value.length === 0) {
          return '';
        }
        return fs.existsSync(value) ? '' : `Metadata template dir ${value} no longer exists. Please pick another directory`;
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
    this.updateInputValue(name, value);
  }

  updateInputValue = (name, value) => this.setState({ [name]: value });

  getInputValue = (name) => this.state[name] || '';

  handlePickStorerMetadataTemplateDir = () => {
    const defaultPath = this.getInputValue('settings_storer_metadataTemplateDir');
    const [newFolder] = dialog.showOpenDialog({
      defaultPath,
      properties: ['openDirectory']
    }) || [];
    if (!newFolder) {
      return;
    }
    this.updateInputValue('settings_storer_metadataTemplateDir', newFolder);
  }

  shouldShowResetMetadataTemplateDir = () =>
    this.getInputValue('settings_storer_metadataTemplateDir').length > 0;

  handleResetStorerMetadataTemplateDir = () => this.updateInputValue('settings_storer_metadataTemplateDir', '');

  render() {
    const organizationTypeValues = this.getOrganizationTypeValues().split(' ').filter(v => v.length);
    const organizationTypeOptions = ['lch', 'ipc'].map(option => (
      <MenuItem key={option} value={option}>
        <Checkbox checked={organizationTypeValues.indexOf(option) > -1} />
        <ListItemText primary={option} />
      </MenuItem>
    ));
    const { classes } = this.props;
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
            <FormControl
              className={classes.formControl}
              margin="dense"
              error={this.hasError('settings_dbl_organizationType')}
            >
              <InputLabel htmlFor="select-multiple-checkbox">Organization Type(s) *</InputLabel>
              <Select
                multiple
                value={organizationTypeValues}
                onChange={this.handleChangeOrganizationType('settings_dbl_organizationType')}
                input={<Input id="select-multiple-checkbox" />}
                renderValue={selected => selected.join(', ')}
                MenuProps={MenuProps}
              >
                {organizationTypeOptions}
              </Select>
              <FormHelperText>{this.getErrorText('settings_dbl_organizationType')}</FormHelperText>
            </FormControl>
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
            <Grid container>
              <Grid item>
                <Tooltip title="Metadata Templates for each medium (e.g. audio.xml)">
                  <Button id="metadataTemplateDir" size="small" color="primary" onClick={this.handlePickStorerMetadataTemplateDir}>
                    <Folder className={classes.icon} />
                    Metadata template directory
                  </Button>
                </Tooltip>
                {this.shouldShowResetMetadataTemplateDir() &&
                  <Tooltip title="Clear Metadata template directory">
                    <Button size="small" color="primary" onClick={this.handleResetStorerMetadataTemplateDir}>
                      <CloseIcon />
                    </Button>
                  </Tooltip>}
              </Grid>
              <Grid item>
                <Typography variant="caption" align="left" color="textSecondary" paragraph>
                  {this.getInputValue('settings_storer_metadataTemplateDir')}
                </Typography>
              </Grid>
            </Grid>
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

export default withStyles(styles, { withTheme: true })(WorkspaceEditDialog);
