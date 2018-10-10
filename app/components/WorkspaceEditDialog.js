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

type Props = {
  settings: ?{},
  handleClickOk: () => {},
  handleClickCancel: () => {}
};

export default class WorkspaceEditDialog extends React.Component<Props> {
  props: Props;
  state = {};

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
            <Button onClick={this.props.handleClickOk(this.state)} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
