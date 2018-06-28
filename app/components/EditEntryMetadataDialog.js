import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';
import { closeEditMetadata, saveMetadata } from '../actions/bundleEditMetadata.actions';
import EditMetadataStepper from './EditMetadataStepper';
import appBarStyles from './AppBar.css';

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  const { requestingSaveMetadata = false, wasMetadataSaved = false, couldNotSaveMetadataMessage = null } = bundleEditMetadata;
  return {
    open: Boolean(bundleEditMetadata.editingMetadata || false),
    requestingSaveMetadata,
    wasMetadataSaved,
    couldNotSaveMetadataMessage
  };
}

const mapDispatchToProps = {
  closeEditMetadata,
  saveMetadata
};

const materialStyles = {
  appBar: {
    position: 'fixed'
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
  classes: {},
  saveMetadata: () => {},
  wasMetadataSaved: boolean,
  couldNotSaveMetadataMessage: ?string,
  requestingSaveMetadata: boolean
};

class EditEntryMetadataDialog extends PureComponent<Props> {
  props: Props;

  componentDidUpdate(prevProps) {
    if (this.props.wasMetadataSaved && !prevProps.wasMetadataSaved) {
      this.props.closeEditMetadata();
    } else if (this.props.couldNotSaveMetadataMessage &&
      this.props.couldNotSaveMetadataMessage !== prevProps.couldNotSaveMetadataMessage) {
      // TODO: post confirm message.
      // if confirmed: this.props.closeEditMetadata();
    }
  }

  handleClose = () => {
    this.props.saveMetadata();
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
        <div className={appBarStyles.appContainer}>
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Edit Metadata
              </Typography>
              <Button color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose}>
                save
              </Button>
            </Toolbar>
          </AppBar>
          <EditMetadataStepper myStructurePath="" shouldLoadDetails={false} notifyHasErrors={null} />
        </div>
      </Dialog>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'EditEntryMetadataDialog' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditEntryMetadataDialog);
