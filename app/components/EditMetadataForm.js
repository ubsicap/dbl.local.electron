import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import SuperSelectField from 'material-ui-superselectfield/es';
import {
  saveMetadata, saveMetadataSuccess, fetchActiveFormInputs, editActiveFormInput
} from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';

type Props = {
  classes: {},
  bundleId: string,
  bundleStatus: string,
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
  saveMetadataSuccess: () => {}
};

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  const {
    requestingSaveMetadata = false, formFieldIssues = {}, activeFormEdits = {},
    forceSave = false, bundleToEdit
  } = bundleEditMetadata;
  return {
    requestingSaveMetadata,
    formFieldIssues,
    activeFormEdits,
    forceSave,
    bundleStatus: bundleToEdit.status
  };
}

const mapDispatchToProps = {
  saveMetadata,
  fetchActiveFormInputs,
  editActiveFormInput,
  saveMetadataSuccess
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

  componentDidUpdate(prevProps) {
    if (this.props.isActiveForm && this.props.requestingSaveMetadata &&
      !prevProps.requestingSaveMetadata) {
      const {
        inputs = {}, bundleId, formKey, isFactory, activeFormEdits, forceSave
      } = this.props;
      const { fields = [] } = inputs;
      if (!forceSave && !editMetadataService.getHasFormFieldsChanged(fields, activeFormEdits)) {
        this.props.saveMetadataSuccess(bundleId, formKey);
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

  handleChangeMulti = (field) => (selectedValues, name) => {
    const { formKey } = this.props;
    const newValues = selectedValues.map(selected => selected.value).filter(v => v);
    const origValue = this.getValue(field);
    const newValue = `${newValues}`;
    if (newValue === origValue) {
      return; // nothing changed.
    }
    this.props.editActiveFormInput(formKey, name, newValues);
  };

  getErrorInField = (field) => {
    const { formErrors } = this.props;
    const { [field.name]: errorInField = {} } = formErrors;
    return errorInField;
  };

  getValue = (field) => `${this.getMultiValues(field)}`

  getMultiValues = (field) => {
    const { activeFormEdits } = this.props;
    const fieldValues = editMetadataService.getFieldValues(field, activeFormEdits);
    return fieldValues;
  }

  getIsReadonly = (field) => {
    const { bundleStatus } = this.props;
    if (bundleStatus !== 'DRAFT') {
      return true;
    }
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

  formatError = (field) => {
    const fieldError = this.getErrorInField(field);
    if (!getHasError(fieldError)) {
      return null;
    }
    const { rule, value: valueOrig } = fieldError;
    const isReadOnly = this.getIsReadonly(field);
    if (isReadOnly) {
      return `${rule}, but the read-only value "${this.getValue(field)}" will be stored on Save`;
    } else if (valueOrig !== null) {
      return `${rule}: '${valueOrig}'`;
    }
    return rule;
  }

  hasError = (field) => getHasError(this.getErrorInField(field));
  helperOrErrorText = (field) => this.formatError(field) || field.help;

  renderTextOrSelectField = (formKey, field, classes) => {
    const id = `${formKey}/${field.name}`;
    const helperText = this.helperOrErrorText(field);
    const hasError = this.hasError(field);
    const isRequired = editMetadataService.getIsRequired(field);
    if (editMetadataService.getIsMulti(field)) {
      const selectedValues = this.getMultiValues(field).filter(v => v);
      const value = selectedValues.map(val => ({ value: val }));
      const options = (field.options && field.options.map((option) => (
        <div key={`${formKey}/${field.name}/${option}`} value={option}>
          {getLabelWithOrderInSelectedValues(option, selectedValues)}
        </div>
      )));
      if (field.name === 'component') {
        options.reverse();
      }
      const greyish = 'rgba(0, 0, 0, 0.54)';
      const floatingLabelStyle = { color: greyish };
      const errorStyle = hasError ? {} : { errorStyle: floatingLabelStyle };
      const underlineStyle = hasError ? { underlineStyle: { borderBottomColor: 'red' } }
        : { underlineStyle: { borderBottomColor: greyish }, underlineFocusStyle: { borderBottomColor: greyish, borderBottomWidth: 'thick' } };
      return (
        <SuperSelectField
          key={id}
          id={id}
          name={field.name}
          disabled={this.getIsReadonly(field)}
          checkPosition="left"
          multiple
          floatingLabel={`${field.label}${isRequired ? ' *' : ''}`}
          errorText={helperText}
          {...errorStyle}
          {...underlineStyle}
          floatingLabelStyle={floatingLabelStyle}
          floatingLabelFocusStyle={{ color: '#303f9f' }}
          onSelect={this.handleChangeMulti(field)}
          useLayerForClickAway
          value={value}
          /* elementHeight={58} */
          /* selectionsRenderer={this.handleCustomDisplaySelections('state31')} */
          style={{ width: 300, marginTop: 29, marginRight: 40 }}
        >
          {options}
        </SuperSelectField>
      );
    }
    return (
      <TextField
        key={id}
        id={id}
        label={field.label}
        className={field.type === 'xml' ? classes.xmlField : classes.textField}
        select={Boolean(field.options) || (field.type === 'boolean')}
        multiline
        error={hasError}
        /* fullWidth={field.type === 'xml'} */
        /* defaultValue={field.default} */
        value={this.getValue(field)}
        /* placeholder="Placeholder" */
        /* autoComplete={field.default} */
        helperText={helperText}
        required={isRequired}
        disabled={this.getIsReadonly(field)}
        onChange={this.handleChange(field.name)}
        SelectProps={{
          MenuProps: {
            className: classes.menu,
          },
        }}
        margin="normal"
      >
        { (field.options && field.options.map(option => (
          <MenuItem key={`${formKey}/${field.name}/${option}`} value={option} >
            {option}
          </MenuItem>
        ))) ||
        (field.type === 'boolean' &&
          [<MenuItem key={`${formKey}/${field.name}/${true}`} value="true">true</MenuItem>,
            <MenuItem key={`${formKey}/${field.name}/${false}`} value="false">false</MenuItem>]
        )
        }
      </TextField>);
  }

  render() {
    const { classes, inputs, formKey } = this.props;
    const { fields = [] } = inputs;
    return (
      <form className={classes.container} noValidate>
        {fields.filter(field => field.name).map(field =>
          this.renderTextOrSelectField(formKey, field, classes))
        }
      </form>
    );
  }
}

function getHasError(fieldError) {
  return Boolean(Object.keys(fieldError).length > 0);
}

function getLabelWithOrderInSelectedValues(option, selectedValues) {
  const valueOrder = selectedValues.indexOf(option) + 1;
  const result = valueOrder > 0 ? `${valueOrder}. ${option}` : option;
  return result;
}

export default compose(
  withStyles(materialStyles, { name: 'EditMetadataForm' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditMetadataForm);
