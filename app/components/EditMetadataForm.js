import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';

type Props = {
  classes: {},
  bundleId: string,
  formKey: string,
  inputs: {},
  fetchFormInputs: () => {}
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
  menu: {
    width: 200,
  },
});

const currencies = [
  {
    value: 'USD',
    label: '$',
  },
  {
    value: 'EUR',
    label: '€',
  },
  {
    value: 'BTC',
    label: '฿',
  },
  {
    value: 'JPY',
    label: '¥',
  },
];

function filterFields(field) {
  return field.type === 'string' || field.type === 'boolean';
}

class EditMetadataForm extends React.Component<Props> {
  props: Props;
  state = {
  };

  componentDidMount() {
    this.props.fetchFormInputs(this.props.bundleId, this.props.formKey);
  }


  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };

  render() {
    const { classes, inputs } = this.props;
    const { fields = [] } = inputs;
    return (
      <form className={classes.container} noValidate>
        {fields.filter(filterFields).map(field => (
          <TextField
            key={field.name}
            id={field.name}
            label={field.label}
            className={classes.textField}
            select={Boolean(field.options) || (field.type === 'boolean')}
            /* error */
            /* fullWidth */
            /* defaultValue={field.default} */
            value={this.state[field.name] ? this.state[field.name] : field.default}
            /* placeholder="Placeholder" */
            /* autoComplete={field.default} */
            helperText={field.help}
            required={field.nValues !== '?'}
            onChange={this.handleChange(field.name)}
            SelectProps={{
              MenuProps: {
                className: classes.menu,
              },
            }}
            margin="normal"
          >
            { (field.options && field.options.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))) ||
            (field.type === 'boolean' &&
              [<MenuItem key="true" value="True">True</MenuItem>,
                <MenuItem key="false" value="False">False</MenuItem>]
            )
            }
          </TextField>))
        }
      </form>
    );
  }
}

export default withStyles(materialStyles)(EditMetadataForm);
