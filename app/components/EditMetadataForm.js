import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import {
  saveMetadata, fetchActiveFormInputs, editActiveFormInput,
  reloadFieldValues
} from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';

type Props = {
  classes: {},
  bundleId: string,
  formKey: string,
  isFactory: boolean,
  inputs: {},
  isActiveForm: boolean,
  requestingSaveMetadata: boolean,
  formErrors: {},
  activeFormEdits: {},
  forceSave: boolean,
  fetchActiveFormInputs: () => {},
  editActiveFormInput: () => {},
  saveMetadata: () => {},
  reloadFieldValues: () => {}
};

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  const {
    requestingSaveMetadata = false, formFieldIssues = {}, activeFormEdits = {},
    forceSave = false
  } = bundleEditMetadata;
  return {
    requestingSaveMetadata,
    formFieldIssues,
    activeFormEdits,
    forceSave
  };
}

const mapDispatchToProps = {
  saveMetadata,
  fetchActiveFormInputs,
  editActiveFormInput,
  reloadFieldValues
};

const materialStyles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: 200,
  },
  xmlField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: '100%',
  },
  menu: {
    width: 200,
  },
});

class EditMetadataForm extends React.PureComponent<Props> {
  props: Props;

  componentDidMount() {
    if (this.props.isActiveForm) {
      this.props.fetchActiveFormInputs(this.props.bundleId, this.props.formKey);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isActiveForm && !this.props.isActiveForm) {
      this.props.fetchActiveFormInputs(this.props.bundleId, this.props.formKey);
    }
  }

  componentDidUpdate() {
    if (this.props.isActiveForm && this.props.requestingSaveMetadata) {
      const {
        inputs = {}, bundleId, formKey, isFactory, activeFormEdits, forceSave
      } = this.props;
      const { fields = [] } = inputs;
      if (!forceSave && !editMetadataService.getHasFormFieldsChanged(fields, activeFormEdits)) {
        this.props.reloadFieldValues(bundleId, formKey);
        return;
      }
      const fieldNameValues = editMetadataService
        .getFormFieldValues(bundleId, formKey, fields, activeFormEdits);
      const keyField = editMetadataService.getKeyField(fields);
      const instanceKeyValue = keyField ? { [keyField.name]: this.getValue(keyField) } : null;
      this.props.saveMetadata({
        bundleId, formKey, fieldNameValues, isFactory, instanceKeyValue
      });
    }
  }

  handleChange = name => event => {
    const { formKey } = this.props;
    this.props.editActiveFormInput(formKey, name, event.target.value);
  };

  getErrorInField = (field) => {
    const { formErrors } = this.props;
    const { [field.name]: errorInField = {} } = formErrors;
    return errorInField;
  };

  getValue = (field) => {
    const { activeFormEdits } = this.props;
    const fieldValues = editMetadataService.getFieldValues(field, activeFormEdits);
    return `${fieldValues}`;
  }

  getIsDisabled = (field) => {
    if (field.isOverridden) {
      return true;
    }
    if (field.type !== 'key') {
      return false;
    }
    if (field.default === undefined || field.default.length === 0) {
      return false;
    }
    const { formKey } = this.props;
    return formKey.endsWith(`/${field.default}`);
  }

  hasError = (field) => getHasError(this.getErrorInField(field));
  helperOrErrorText = (field) => formatError(this.getErrorInField(field)) || field.help;

  render() {
    const { classes, inputs, formKey } = this.props;
    const { fields = [] } = inputs;
    return (
      <form className={classes.container} noValidate>
        {fields.filter(field => field.name).map(field => (
          <TextField
            key={`${formKey}/${field.name}`}
            id={`${formKey}/${field.name}`}
            label={field.label}
            className={field.type === 'xml' ? classes.xmlField : classes.textField}
            select={Boolean(field.options) || (field.type === 'boolean')}
            multiline
            error={this.hasError(field)}
            /* fullWidth={field.type === 'xml'} */
            /* defaultValue={field.default} */
            value={this.getValue(field)}
            /* placeholder="Placeholder" */
            /* autoComplete={field.default} */
            helperText={this.helperOrErrorText(field)}
            required={editMetadataService.getIsRequired(field)}
            disabled={this.getIsDisabled(field)}
            onChange={this.handleChange(field.name)}
            SelectProps={{
              MenuProps: {
                className: classes.menu,
              },
            }}
            margin="normal"
          >
            { (field.options && field.options.map(option => (
              <MenuItem key={`${formKey}/${field.name}/${option}`} value={option}>
                {option}
              </MenuItem>
            ))) ||
            (field.type === 'boolean' &&
              [<MenuItem key={`${formKey}/${field.name}/${true}`} value="true">true</MenuItem>,
                <MenuItem key={`${formKey}/${field.name}/${false}`} value="false">false</MenuItem>]
            )
            }
          </TextField>))
        }
      </form>
    );
  }
}

function getHasError(fieldError) {
  return Boolean(Object.keys(fieldError).length > 0);
}

function formatError(fieldError) {
  if (!getHasError(fieldError)) {
    return null;
  }
  const { rule, value } = fieldError;
  return `${rule}: '${value}'`;
}

export default compose(
  withStyles(materialStyles, { name: 'EditMetadataForm' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditMetadataForm);
