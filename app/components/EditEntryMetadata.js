import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import ListItemText from '@material-ui/core/ListItemText';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';
import { closeEditMetadata } from '../actions/bundle.actions';

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  return {
    open: Boolean(bundleEditMetadata.editingMetadata || false)
  };
}

const mapDispatchToProps = {
  closeEditMetadata
};

const materialStyles = {
  appBar: {
    position: 'relative',
  },
  flex: {
    flex: 1,
  },
};

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

type Props = {
  open: boolean,
  closeEditMetadata: () => {},
  classes: {}
};

class EditEntryMetadata extends PureComponent<Props> {
  props: Props;

  handleClose = () => {
    this.props.closeEditMetadata();
  };

  render() {
    const { classes } = this.props;
    return (
      <Dialog
        fullScreen
        open={this.props.open}
        onClose={this.handleClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
            <Typography variant="title" color="inherit" className={classes.flex}>
              Sound
            </Typography>
            <Button color="inherit" onClick={this.handleClose}>
              save
            </Button>
          </Toolbar>
        </AppBar>
        <List>
          <ListItem button>
            <ListItemText primary="Phone ringtone" secondary="Titania" />
          </ListItem>
          <Divider />
          <ListItem button>
            <ListItemText primary="Default notification ringtone" secondary="Tethys" />
          </ListItem>
        </List>
      </Dialog>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'EditEntryMetadata' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditEntryMetadata);
