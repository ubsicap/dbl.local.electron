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
import FlatButton from 'material-ui/FlatButton';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import FolderOpen from 'material-ui/svg-icons/file/folder-open';
import Save from '@material-ui/icons/Save';
import CallSplit from '@material-ui/icons/CallSplit';
import Link from '@material-ui/icons/Link';
import Delete from '@material-ui/icons/Delete';
import Edit from '@material-ui/icons/Edit';
import CloudUpload from '@material-ui/icons/CloudUpload';
import styles from './DBLEntryRow.css';
import ControlledHighlighter from './ControlledHighlighter';
import { toggleSelectEntry, requestSaveBundleTo, removeResources, removeBundle,
  downloadResources, uploadBundle } from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

type Props = {
  bundleId: string,
  dblId: string,
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
  isSelected: ?boolean,
  shouldShowRow: boolean,
  classes: {},
  isRequestingRevision: boolean,
  entryPageUrl: string,
  toggleSelectEntry: () => {},
  downloadResources: () => {},
  requestSaveBundleTo: () => {},
  removeResources: () => {},
  openEditMetadata: () => {},
  uploadBundle: () => {},
  removeBundle: () => {}
};

const mapDispatchToProps = {
  toggleSelectEntry,
  downloadResources,
  requestSaveBundleTo,
  removeResources,
  openEditMetadata,
  uploadBundle,
  removeBundle
};

const getIsSearchActive = (state) => state.bundlesFilter.isSearchActive;
const emptyBundleMatches = {};
const getEmptryBundleMatches = () => emptyBundleMatches;
const getBundleId = (state, props) => props.bundleId;

const getBundleMatches = (state, props) =>
  (state.bundlesFilter.searchResults && state.bundlesFilter.searchResults.bundlesMatching ?
    (state.bundlesFilter.searchResults.bundlesMatching[props.bundleId] || emptyBundleMatches)
    : emptyBundleMatches);

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
const getPropsDblId = (state, props) => props.dblId;
const makeGetEntryPageUrl = () => createSelector(
  [getDblBaseUrl, getPropsDblId],
  (dblBaseUrl, dblId) => (`${dblBaseUrl}/entry?id=${dblId}`)
);

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const getIsRequestingRevision = makeGetIsRequestingRevision();
  const getEntryPageUrl = makeGetEntryPageUrl();
  const mapStateToProps = (state, props) => {
    const { bundlesSaveTo } = state;
    return {
      isRequestingRevision: getIsRequestingRevision(state, props),
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      bundlesSaveTo,
      entryPageUrl: getEntryPageUrl(state, props)
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

  showInfoButton = () => {
    const { task, status } = this.props;
    return (task === 'UPLOAD' || task === 'DOWNLOAD') && status === 'COMPLETED';
  }

  showStatusAsText = () => {
    const { task, status } = this.props;
    return ((task === 'UPLOAD' || task === 'DOWNLOAD') &&
      (status === 'DRAFT' || status === 'IN_PROGRESS')) ||
      ((task === 'REMOVE_RESOURCES') && status === 'IN_PROGRESS');
  }

  showDownloadButton = () => {
    const { task, status } = this.props;
    return (task === 'DOWNLOAD' && status === 'NOT_STARTED');
  }

  hasNoStoredResources = () => {
    const { resourceCountStored = 0 } = this.props;
    return resourceCountStored === 0;
  }

  shouldDisableUpload = () => {
    const { status } = this.props;
    return status !== 'DRAFT';
  }

  shouldDisableRevise = () => {
    const { isUploading = false, task, status } = this.props;
    return isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS');
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
    this.props.downloadResources(bundleId);
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
    const { entryPageUrl } = this.props;
    onOpenLink(event, entryPageUrl);
  }

  onClickDeleteBundle = (event) => {
    const { bundleId } = this.props;
    this.props.removeBundle(bundleId);
    event.stopPropagation();
  }

  onClickRemoveResources = (event) => {
    const { bundleId } = this.props;
    this.props.removeResources(bundleId);
    event.stopPropagation();
  }

  renderStatus = () => (
    <ControlledHighlighter {...this.getHighlighterSharedProps(this.props.displayAs.status)} />
  );

  renderEditIcon = () => {
    const { status, classes, isRequestingRevision } = this.props;
    if (status === 'DRAFT') {
      return [<Edit key="btnEdit" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Edit'];
    }
    return [
      <CallSplit
        disabled={isRequestingRevision}
        key="btnRevise"
        className={classNames(classes.leftIcon, classes.iconSmall)}
      />, 'Revise'];
  };

  renderbtnDeleteBundleOrCleanResources = () => {
    const { status, classes } = this.props;
    if (status === 'DRAFT') {
      return (
        <Button variant="flat" size="small" className={classes.button}
          onKeyPress={this.onClickDeleteBundle}
          onClick={this.onClickDeleteBundle}
        >
          <Delete className={classNames(classes.leftIcon, classes.iconSmall)} />
          Delete
        </Button>
      );
    }
    return (
      <Button variant="flat" size="small" className={classes.button}
        disabled={this.hasNoStoredResources()}
        onKeyPress={this.onClickRemoveResources}
        onClick={this.onClickRemoveResources}
      >
        <Delete className={classNames(classes.leftIcon, classes.iconSmall)} />
        Clean
      </Button>
    );
  }

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
            <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.revision)} />
          </div>
          <div className={styles.bundleRowTopRightSide}>
            {task === 'SAVETO' && (
              <FlatButton
                labelPosition="before"
                label={<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
                icon={<FolderOpen />}
                onClick={this.openInFolder}
              />
            )}
            {this.showInfoButton() && (
              <FlatButton
                labelPosition="before"
                label={<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
                icon={<Link color="inherit" />}
                onClick={this.onOpenDBLEntryLink}
              />
            )}
            {this.showStatusAsText() && (
              <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
                {<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
              </div>
            )}
            {this.showDownloadButton() && (
              <FlatButton
                labelPosition="before"
                label={<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
                icon={<FileDownload />}
                onClick={this.onClickDownloadResources}
              />
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
              disabled={this.shouldDisableRevise()}
              variant="flat" size="small" className={classes.button}
              onKeyPress={this.onClickEditMetadata}
              onClick={this.onClickEditMetadata}>
              {this.renderEditIcon()}
            </Button>
            <Button variant="flat" size="small" className={classes.button}
              disabled={this.hasNoStoredResources()}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}>
              <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
              Save To
            </Button>
            <Button variant="flat" size="small" className={classes.button}
              disabled={dblId === undefined}
              onKeyPress={this.onOpenDBLEntryLink}
              onClick={this.onOpenDBLEntryLink}>
              <Link className={classNames(classes.leftIcon, classes.iconSmall)} />
              DBL
            </Button>
            {this.renderbtnDeleteBundleOrCleanResources()}
            <Button variant="flat" size="small" className={classes.button}
              disabled={this.shouldDisableUpload()}
              onKeyPress={this.onClickUploadBundle}
              onClick={this.onClickUploadBundle}
            >
              <CloudUpload className={classNames(classes.leftIcon, classes.iconSmall)} />
              Upload
            </Button>
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

function onOpenLink(event, url) {
  event.preventDefault();
  event.stopPropagation();
  shell.openExternal(url);
}

