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
  xmlField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: '100%',
  },
  menu: {
    width: 200,
  },
});

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
    const { classes, inputs, formKey } = this.props;
    const { fields = [] } = inputs;
    return (
      <form className={classes.container} noValidate>
        {fields.filter(field => field.name).map(field => (
          <TextField
            key={`${formKey}/${field.name}`}
            id={field.name}
            label={field.label}
            className={field.type === 'xml' ? classes.xmlField : classes.textField}
            select={Boolean(field.options) || (field.type === 'boolean')}
            multiline
            /* error */
            /* fullWidth={field.type === 'xml'} */
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

export default withStyles(materialStyles)(EditMetadataForm);
