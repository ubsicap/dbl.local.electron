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
import OpenInNew from '@material-ui/icons/OpenInNew';
import Save from '@material-ui/icons/Save';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import { updateBundle } from '../actions/bundle.actions';
import { closeEditMetadata, saveMetadata, exportMetadataFile } from '../actions/bundleEditMetadata.actions';
import EditMetadataStepper from './EditMetadataStepper';
import appBarStyles from './AppBar.css';
import rowStyles from './DBLEntryRow.css';

const { shell } = require('electron');

function mapStateToProps(state) {
  const { bundleEditMetadata, bundles } = state;
  const { editingMetadata, editedMetadata, metadataFile } = bundleEditMetadata;
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
    couldNotSaveMetadataMessage,
    metadataFile
  };
}

const mapDispatchToProps = {
  closeEditMetadata,
  saveMetadata,
  updateBundle,
  exportMetadataFile
};

const materialStyles = theme => ({
  appBar: {
    position: 'fixed'
  },
  flex: {
    flex: 1,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
});

type Props = {
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
  closeEditMetadata: () => {},
  updateBundle: () => {},
  classes: {},
  saveMetadata: () => {},
  exportMetadataFile: () => {},
  wasMetadataSaved: boolean,
  metadataFile: ?string,
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
    if (this.props.metadataFile && !prevProps.metadataFile) {
      shell.openExternal(this.props.metadataFile);
    }
  }

  handleClose = () => {
    this.props.saveMetadata(null, null, null, { exit: true });
  };

  handlePreview = () => {
    this.props.exportMetadataFile(this.props.bundleId);
  }

  render() {
    const { classes, open, selectedBundle } = this.props;
    const { displayAs } = selectedBundle;
    const { languageAndCountry, name } = displayAs;
    return (
      <Zoom in={open}>
        <div className={appBarStyles.appContainer}>
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Preview <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry}</span> {name}
              </Typography>
              <Button key="btnOpenXml" color="inherit" disable={this.props.metadataFile} onClick={this.handlePreview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Preview
              </Button>
              <Button key="btnSave" color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose}>
                <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
                Save
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
