import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Badge from '@material-ui/core/Badge';
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
import { closeEditMetadata, saveFieldValuesForActiveForm, openMetadataFile } from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';
import EditMetadataStepper from './EditMetadataStepper';
import rowStyles from './DBLEntryRow.css';

const { shell } = require('electron');

function mapStateToProps(state, props) {
  const { bundleEditMetadata, bundles } = state;
  const { showMetadataFile } = bundleEditMetadata;
  const { addedByBundleIds } = bundles;
  const { bundleId, section: showSection } = props.match.params;
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  const getFormsErrors = editMetadataService.makeGetFormsErrors();
  const {
    requestingSaveMetadata = false,
    wasMetadataSaved = false,
    couldNotSaveMetadataMessage = null,
    moveNext = null
  } = bundleEditMetadata;
  return {
    open: Boolean(bundleId || false),
    bundleId,
    selectedBundle,
    requestingSaveMetadata,
    wasMetadataSaved,
    moveNext,
    couldNotSaveMetadataMessage,
    showMetadataFile,
    showSection,
    formsErrors: getFormsErrors(state, props)
  };
}

const mapDispatchToProps = {
  closeEditMetadata,
  saveFieldValuesForActiveForm,
  updateBundle,
  openMetadataFile
};

const materialStyles = theme => ({
  appBar: {
    position: 'sticky'
  },
  toolBar: {
    paddingLeft: '0px',
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
  badge: {
    margin: theme.spacing.unit * 2,
  },
});

type Props = {
  open: boolean,
  bundleId: string,
  showSection: ?string,
  selectedBundle: {},
  formsErrors: {},
  closeEditMetadata: () => {},
  updateBundle: () => {},
  classes: {},
  saveFieldValuesForActiveForm: () => {},
  openMetadataFile: () => {},
  wasMetadataSaved: boolean,
  showMetadataFile: ?string,
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
      this.props.closeEditMetadata(this.props.bundleId);
      this.props.updateBundle(this.props.bundleId);
    } else if (this.props.couldNotSaveMetadataMessage &&
      this.props.couldNotSaveMetadataMessage !== prevProps.couldNotSaveMetadataMessage) {
      // TODO: post confirm message.
      // if confirmed: this.props.closeEditMetadata();
    }
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
  }

  handleClose = () => {
    this.props.saveFieldValuesForActiveForm({ moveNext: { exit: true } });
  };

  navigateToNextErrror = () => {
    this.props.saveFieldValuesForActiveForm({ moveNext: { exit: true, checkAllForms: true } });
  }

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  render() {
    const { classes, open, selectedBundle = {}, bundleId, showSection, formsErrors } = this.props;
    const { displayAs = {} } = selectedBundle;
    const { languageAndCountry, name } = displayAs;
    const formsErrorsCount = Object.keys(formsErrors).length;
    const conditionallyRenderSaveOrGotoError = (errorCount, saveNode, gotoErrorNode) => {
      if (!formsErrorsCount) {
        return saveNode;
      }
      return <Badge key="badge" className={classes.badge} badgeContent={errorCount} color="error">{gotoErrorNode}</Badge>;
    };
    return (
      <Zoom in={open}>
        <div>
          <AppBar className={classes.appBar}>
            <Toolbar className={classes.toolBar}>
              <IconButton color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Edit metadata: <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              <Button key="btnSave" color="inherit" disable={this.props.requestingSaveMetadata.toString()} onClick={this.navigateToNextErrror}>
                {conditionallyRenderSaveOrGotoError(
                  formsErrorsCount,
                  [<Save key="iconSave" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Save'],
                  'Goto'
                  )
                }
              </Button>
            </Toolbar>
          </AppBar>
          <EditMetadataStepper bundleId={bundleId} showSection={showSection} myStructurePath="" shouldLoadDetails={false} />
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
