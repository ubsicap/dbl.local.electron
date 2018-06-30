import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import { saveMetadata } from '../actions/bundleEditMetadata.actions';

type Props = {
  classes: {},
  bundleId: string,
  formKey: string,
  inputs: {},
  isActiveForm: boolean,
  requestingSaveMetadata: boolean,
  formErrors: {},
  fetchFormInputs: () => {},
  saveMetadata: () => {}
};

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  const { requestingSaveMetadata = false, formFieldIssues = {} } = bundleEditMetadata;
  return {
    requestingSaveMetadata,
    formFieldIssues
  };
}

const mapDispatchToProps = {
  saveMetadata
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

function getIsRequired(field) {
  return field.nValues !== '?';
}

class EditMetadataForm extends React.Component<Props> {
  props: Props;
  state = {
  };

  componentDidMount() {
    this.props.fetchFormInputs(this.props.bundleId, this.props.formKey);
  }

  componentDidUpdate(prevProps) {
    if (this.props.isActiveForm && this.props.requestingSaveMetadata
      && !prevProps.requestingSaveMetadata) {
      const { inputs, bundleId, formKey } = this.props;
      const { fields } = inputs;
      // get the values for all required fields and all non-empty values optional fields.
      const fieldValues = fields.filter(field => field.name).reduce((acc, field) => {
        const updatedValue = this.state[field.name];
        const originalValue = field.default;
        const fieldValue = updatedValue !== undefined ? updatedValue : originalValue;
        const isRequired = getIsRequired(field);
        if (isRequired || fieldValue.length > 0) {
          return { ...acc, [field.name]: fieldValue };
        }
        return acc;
      }, {});
      this.props.saveMetadata(bundleId, formKey, fieldValues);
    }
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };

  getErrorInField = (field) => {
    const { formErrors } = this.props;
    const { [field.name]: errorInField = {} } = formErrors;
    return errorInField;
  };

  getValue = (field) => {
    const { [field.name]: stateValue } = this.state;
    if (stateValue === undefined || stateValue === null) {
      return field.default;
    }
    return this.state[field.name];
  }

  hasError = (field) => Boolean(Object.keys(this.getErrorInField(field)).length > 0);
  helperOrErrorText = (field) => this.getErrorInField(field).rule || field.help;

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
            required={getIsRequired(field)}
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

export default compose(
  withStyles(materialStyles, { name: 'EditMetadataForm' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditMetadataForm);
