import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import LinearProgress from 'material-ui/LinearProgress';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import Folder from 'material-ui/svg-icons/file/folder';
import FolderOpen from 'material-ui/svg-icons/file/folder-open';
import Save from '@material-ui/icons/Save';
import CallSplit from '@material-ui/icons/CallSplit';
import Link from '@material-ui/icons/Link';
import Edit from '@material-ui/icons/Edit';
import CloudUpload from '@material-ui/icons/CloudUpload';
import styles from './DBLEntryRow.css';
import ControlledHighlighter from './ControlledHighlighter';
import { toggleSelectEntry, requestSaveBundleTo,
  downloadResources, uploadBundle } from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { utilities } from '../utils/utilities';
import DeleteOrCleanButton from './DeleteOrCleanButton';
import ConfirmButton from './ConfirmButton';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

type Props = {
  bundleId: string,
  dblId: string,
  revision: string,
  parent: ?{},
  task: string,
  status: string,
  medium: string,
  displayAs: {},
  resourceCountStored?: number,
  bundleMatches: {},
  bundlesSaveTo: {},
  progress?: ?number,
  isDownloaded: ?boolean,
  isUploading?: ?boolean,
  isDownloading?: ?boolean,
  isSelected: ?boolean,
  shouldShowRow: boolean,
  classes: {},
  isRequestingRevision: boolean,
  entryPageUrl: string,
  toggleSelectEntry: () => {},
  downloadResources: () => {},
  openResourceManager: () => {},
  requestSaveBundleTo: () => {},
  openEditMetadata: () => {},
  uploadBundle: () => {}
};

const mapDispatchToProps = {
  toggleSelectEntry,
  downloadResources,
  openResourceManager,
  requestSaveBundleTo,
  openEditMetadata,
  uploadBundle
};

const getTask = (state, props) => props.task;
const getStatus = (state, props) => props.status;
const getIsSearchActive = (state) => state.bundlesFilter.isSearchActive;
const emptyBundleMatches = {};
const getEmptryBundleMatches = () => emptyBundleMatches;
const getBundleId = (state, props) => props.bundleId;

const getBundleMatches = (state, props) =>
  (state.bundlesFilter.searchResults && state.bundlesFilter.searchResults.bundlesMatching ?
    (state.bundlesFilter.searchResults.bundlesMatching[props.bundleId] || emptyBundleMatches)
    : emptyBundleMatches);

const makeGetIsDownloading = () => createSelector(
  [getTask, getStatus],
  (task, status) => (task === 'DOWNLOAD' && status === 'IN_PROGRESS')
);

const makeShouldShowRow = () => createSelector(
  [getIsSearchActive, getBundleMatches],
  (isActiveSearch, bundleMatches) => !isActiveSearch || Object.keys(bundleMatches).length > 0
);

const makeGetBundleMatches = () => createSelector(
  [getIsSearchActive, getBundleMatches, getEmptryBundleMatches],
  (isActiveSearch, bundleMatches, emptyMatches) => (isActiveSearch ? bundleMatches : emptyMatches)
);

const getRequestingRevision = (state) => state.bundleEditMetadata.requestingRevision;

const makeGetIsRequestingRevision = () => createSelector(
  [getRequestingRevision, getBundleId],
  (requestingRevision, bundleId) => (requestingRevision === bundleId)
);

const getDblBaseUrl = (state) => state.dblDotLocalConfig.dblBaseUrl;
const getPropsRevision = (state, props) => props.revision;
const getPropsParent = (state, props) => props.parent;
const getPropsDblId = (state, props) => props.dblId;
const makeGetEntryPageUrl = () => createSelector(
  [getDblBaseUrl, getPropsDblId, getPropsRevision, getPropsParent],
  (dblBaseUrl, dblId, revision, parent) => (`${dblBaseUrl}/entry?id=${dblId}&revision=${parseInt(revision, 10) || parent.revision}`)
);

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const getIsRequestingRevision = makeGetIsRequestingRevision();
  const getEntryPageUrl = makeGetEntryPageUrl();
  const getIsDownloading = makeGetIsDownloading();
  const mapStateToProps = (state, props) => {
    const { bundlesSaveTo } = state;
    return {
      isRequestingRevision: getIsRequestingRevision(state, props),
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      bundlesSaveTo,
      entryPageUrl: getEntryPageUrl(state, props),
      isDownloading: getIsDownloading(state, props)
    };
  };
  return mapStateToProps;
};

class DBLEntryRow extends PureComponent<Props> {
  props: Props;

  onKeyPress = (event) => {
    if (['Enter', ' '].includes(event.key)) {
      this.onClickBundleRow();
    }
    console.log(event.key);
  }

  onClickBundleRow = () => {
    const { bundleId: id, dblId, displayAs } = this.props;
    this.props.toggleSelectEntry({ id, dblId, displayAs });
  }

  showStatusAsText = () => {
    const { status } = this.props;
    return (['IN_PROGRESS', 'DRAFT'].includes(status));
  }

  showStoredButton = () => {
    const { task, status } = this.props;
    return ((task === 'DOWNLOAD' && status === 'COMPLETED'));
  }

  showDownloadButton = () => {
    const { task, status } = this.props;
    return (task === 'DOWNLOAD' && status === 'NOT_STARTED');
  }

  hasNoStoredResources = () => {
    const { resourceCountStored = 0 } = this.props;
    return resourceCountStored === 0;
  }

  shouldDisableCleanResources = () =>
    (this.hasNoStoredResources() || this.shouldDisableReviseOrEdit());

  shouldDisableSaveTo = () => this.shouldDisableCleanResources();

  shouldShowUpload = () => {
    const { isUploading = false, task, status } = this.props;
    return status === 'DRAFT' || isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS');
  }

  shouldDisableRevise = () => (this.props.isRequestingRevision || this.props.isDownloading)

  shouldDisableUpload = () => this.shouldDisableReviseOrEdit();

  shouldDisableReviseOrEdit = () => {
    const { isUploading = false, task, status } = this.props;
    return isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS') || this.shouldDisableRevise();
  }

  emptyMatches = [];

  getMatches = (textToHighlight) => {
    const { bundleMatches } = this.props;
    const matches = bundleMatches[textToHighlight] || this.emptyMatches;
    return matches;
  }

  getHighlighterSharedProps = (textToHighlight) => ({
    textToHighlight,
    matches: this.getMatches(textToHighlight)
  })

  onClickDownloadResources = (event) => {
    const { bundleId } = this.props;
    this.props.openResourceManager(bundleId);
    event.stopPropagation();
  }

  onClickEditMetadata = (event) => {
    const { bundleId } = this.props;
    this.props.openEditMetadata(bundleId);
    event.stopPropagation();
  }

  onClickUploadBundle = (event) => {
    const { bundleId } = this.props;
    this.props.uploadBundle(bundleId);
    event.stopPropagation();
  }

  startSaveBundleTo = (event) => {
    const { bundlesSaveTo, bundleId } = this.props;
    const { savedToHistory } = bundlesSaveTo;
    stopPropagation(event);
    const bundleSavedToInfo = getBundleExportInfo(bundleId, savedToHistory);
    const defaultPath = bundleSavedToInfo ? bundleSavedToInfo.folderName : app.getPath('downloads');
    dialog.showOpenDialog({
      defaultPath,
      properties: ['openDirectory']
    }, (folderName) => {
      if (!folderName) {
        return; // canceled.
      }
      console.log(folderName.toString());
      this.props.requestSaveBundleTo(bundleId, folderName.toString());
    });
  }

  openInFolder = (event) => {
    const { bundlesSaveTo, bundleId } = this.props;
    const { savedToHistory } = bundlesSaveTo;
    event.stopPropagation();
    const bundleSavedToInfo = getBundleExportInfo(bundleId, savedToHistory);
    if (bundleSavedToInfo) {
      const { folderName } = bundleSavedToInfo;
      shell.openItem(folderName);
    }
  }

  onOpenDBLEntryLink = (event) => {
    utilities.onOpenLink(this.props.entryPageUrl)(event);
  }

  renderStatus = () => (
    <ControlledHighlighter {...this.getHighlighterSharedProps(this.props.displayAs.status)} />
  );

  renderEditIcon = () => {
    const { status, classes } = this.props;
    if (status === 'DRAFT') {
      return [<Edit key="btnEdit" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Edit'];
    }
    return [
      <CallSplit
        key="btnRevise"
        className={classNames(classes.leftIcon, classes.iconSmall)}
      />, 'Revise'];
  };

  render() {
    const {
      bundleId,
      dblId,
      medium,
      task,
      status,
      displayAs,
      progress,
      isSelected,
      shouldShowRow,
      classes
    } = this.props;
    if (!shouldShowRow) {
      return (null);
    }
    return (
      <div
        className={styles.bundleRow}
        key={bundleId}
        onKeyPress={this.onKeyPress}
        onClick={this.onClickBundleRow}
        tabIndex={0}
        role="button"
        style={{ background: `${pickBackgroundColor(task, status)}`, borderBottom: '1px solid lightgray' }}
      >
        <div className={styles.bundleRowTop}>
          <div className={styles.bundleRowTopLeftSideIcon}>
            { (medium === 'text' && <Book />)
            || (medium === 'audio' && <Headset />)
            || (medium === 'video' && <Videocam />)
            || (medium === 'print' && <Print />)
            || medium }
          </div>
          <div className={styles.bundleRowTopLeftSideLanguageAndCountry}>
            <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.languageAndCountry)} className={styles.languageAndCountryLabel} />
          </div>
          <div className={styles.bundleRowTopLeftSideName}>
            <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.name)} />
          </div>
          <div className={styles.bundleRowTopMiddle}>
            <Tooltip title={this.props.entryPageUrl} placement="right">
              <Button variant="flat" size="small" className={classes.button}
                disabled={dblId === undefined}
                onKeyPress={this.onOpenDBLEntryLink}
                onClick={this.onOpenDBLEntryLink}
              >
                <Link className={classNames(classes.leftIcon, classes.iconSmall)} />
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.revision)} />
              </Button>
            </Tooltip>
          </div>
          <div className={styles.bundleRowTopRightSide}>
            {task === 'SAVETO' && (
              <Button variant="flat" size="small" className={classes.button}
                onKeyPress={this.openInFolder}
                onClick={this.openInFolder}
              >
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />
                <FolderOpen className={classNames(classes.rightIcon, classes.iconSmall)} />
              </Button>
            )}
            {this.showStoredButton() && (
              <Button variant="flat" size="small" className={classes.button}
                onKeyPress={this.onClickDownloadResources}
                onClick={this.onClickDownloadResources}
              >
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />
                <Folder className={classNames(classes.rightIcon, classes.iconSmall)} />
              </Button>
            )}
            {this.showStatusAsText() && (
              <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
                {<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
              </div>
            )}
            {this.showDownloadButton() && (
              <Button variant="flat" size="small" className={classes.button}
                onKeyPress={this.onClickDownloadResources}
                onClick={this.onClickDownloadResources}
              >
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />
                <FileDownload className={classNames(classes.rightIcon, classes.iconSmall)} />
              </Button>
            )}
          </div>
        </div>
        {status === 'IN_PROGRESS' && (
          <div
            className="row"
            style={{ marginLeft: '20px', marginRight: '20px', paddingBottom: '10px' }}
          >
            <LinearProgress mode="determinate" value={progress} />
          </div>
        )}
        {isSelected && (
          <Toolbar style={{ minHeight: '36px' }}>
            <Button
              disabled={this.shouldDisableReviseOrEdit()}
              variant="flat" size="small" className={classes.button}
              onKeyPress={this.onClickEditMetadata}
              onClick={this.onClickEditMetadata}>
              {this.renderEditIcon()}
            </Button>
            <Button variant="flat" size="small" className={classes.button}
              disabled={this.shouldDisableSaveTo()}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}>
              <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
              Save To
            </Button>
            <DeleteOrCleanButton {...this.props} shouldDisableCleanResources={this.shouldDisableCleanResources()} />
            {this.shouldShowUpload() &&
              <ConfirmButton classes={classes} variant="flat" size="small" className={classes.button}
                disabled={this.shouldDisableUpload()}
                onKeyPress={this.onClickUploadBundle}
                onClick={this.onClickUploadBundle}
              >
                <CloudUpload className={classNames(classes.leftIcon, classes.iconSmall)} />
                Upload
              </ConfirmButton>
            }
          </Toolbar>
          )}
      </div>
    );
  }
}

DBLEntryRow.defaultProps = {
  progress: null,
  resourceCountStored: 0,
  isUploading: null,
  isDownloading: null
};

const materialStyles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
});


export default compose(
  withStyles(materialStyles, { name: 'DBLEntryRow' }),
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  ),
)(DBLEntryRow);

function getBundleExportInfo(bundleId, savedToHistory) {
  return savedToHistory ? savedToHistory[bundleId] : null;
}

function pickBackgroundColor(task, status) {
  if (task === 'SAVETO') {
    return '#FFE793';
  }
  switch (status) {
    case 'DRAFT': return '#F5D2D2';
    case 'NOT_STARTED': return '#EDEDED';
    default:
      return 'white';
  }
}

function stopPropagation(event) {
  event.stopPropagation();
  return null;
}
