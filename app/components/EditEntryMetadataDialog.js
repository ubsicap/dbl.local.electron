import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Zoom from '@material-ui/core/Zoom';
import { updateBundle } from '../actions/bundle.actions';
import { closeEditMetadata, saveMetadata } from '../actions/bundleEditMetadata.actions';
import EditMetadataStepper from './EditMetadataStepper';
import appBarStyles from './AppBar.css';
import rowStyles from './DBLEntryRow.css';

function mapStateToProps(state) {
  const { bundleEditMetadata, bundles } = state;
  const { editingMetadata, editedMetadata } = bundleEditMetadata;
  const { selectedBundle } = bundles;
  const bundleId = editingMetadata || editedMetadata;
  const {
    requestingSaveMetadata = false,
    wasMetadataSaved = false,
    couldNotSaveMetadataMessage = null,
    moveNext = null
  } = bundleEditMetadata;
  return {
    open: Boolean(bundleEditMetadata.editingMetadata || false),
    bundleId,
    selectedBundle,
    requestingSaveMetadata,
    wasMetadataSaved,
    moveNext,
    couldNotSaveMetadataMessage
  };
}

const mapDispatchToProps = {
  closeEditMetadata,
  saveMetadata,
  updateBundle
};

const materialStyles = {
  appBar: {
    position: 'fixed'
  },
  flex: {
    flex: 1,
  },
};

type Props = {
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
  closeEditMetadata: () => {},
  updateBundle: () => {},
  classes: {},
  saveMetadata: () => {},
  wasMetadataSaved: boolean,
  moveNext: ?{},
  couldNotSaveMetadataMessage: ?string,
  requestingSaveMetadata: boolean
};

class EditEntryMetadataDialog extends PureComponent<Props> {
  props: Props;

  componentDidUpdate(prevProps) {
    if (this.props.moveNext && this.props.moveNext.exit
      && this.props.wasMetadataSaved
      && !prevProps.wasMetadataSaved) {
      this.props.updateBundle(this.props.bundleId);
      this.props.closeEditMetadata();
    } else if (this.props.couldNotSaveMetadataMessage &&
      this.props.couldNotSaveMetadataMessage !== prevProps.couldNotSaveMetadataMessage) {
      // TODO: post confirm message.
      // if confirmed: this.props.closeEditMetadata();
    }
  }

  handleClose = () => {
    this.props.saveMetadata(null, null, null, { exit: true });
  };

  render() {
    const { classes, open, selectedBundle } = this.props;
    const { displayAs } = selectedBundle;
    const { languageAndCountry, name, revision } = displayAs;    
    return (
      <Zoom in={open}>
        <div className={appBarStyles.appContainer}>
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Edit <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry}</span> {name} - {revision}
              </Typography>
              <Button color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose}>
                save
              </Button>
            </Toolbar>
          </AppBar>
          <EditMetadataStepper myStructurePath="" shouldLoadDetails={false} />
        </div>
      </Zoom>
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
