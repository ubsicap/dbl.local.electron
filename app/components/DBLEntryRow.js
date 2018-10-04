import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import LinearProgress from 'material-ui/LinearProgress';
import { Menu, MenuItem, Toolbar, Tooltip } from '@material-ui/core';
import Badge from '@material-ui/core/Badge';
import VerifiedUserOutlined from '@material-ui/icons/VerifiedUserOutlined';
import AddCircle from '@material-ui/icons/AddCircle';
import Button from '@material-ui/core/Button';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import Folder from 'material-ui/svg-icons/file/folder';
import Copyright from '@material-ui/icons/Copyright';
import Save from '@material-ui/icons/Save';
import CreateNewFolder from '@material-ui/icons/CreateNewFolder';
import Link from '@material-ui/icons/Link';
import Edit from '@material-ui/icons/Edit';
import CloudUpload from '@material-ui/icons/CloudUpload';
import styles from './DBLEntryRow.css';
import ControlledHighlighter from './ControlledHighlighter';
import { toggleSelectEntry, requestSaveBundleTo,
  downloadResources, uploadBundle, updateBundle, createDraftRevision } from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { utilities } from '../utils/utilities';
import { ux } from '../utils/ux';
import DeleteOrCleanButton from './DeleteOrCleanButton';
import ConfirmButton from './ConfirmButton';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

type Props = {
  bundleId: string,
  dblId: string,
  revision: string,
  license: string,
  parent: ?{},
  task: string,
  status: string,
  medium: string,
  displayAs: {},
  resourceCountStored?: number,
  resourceCountManifest?: ?number,
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
  formsErrorStatus: {},
  formsErrors: {},
  newMediaTypes: [],
  toggleSelectEntry: () => {},
  downloadResources: () => {},
  openResourceManager: () => {},
  requestSaveBundleTo: () => {},
  openEditMetadata: () => {},
  uploadBundle: () => {},
  updateBundle: () => {},
  createDraftRevision: () => {}
};

const mapDispatchToProps = {
  toggleSelectEntry,
  downloadResources,
  openResourceManager,
  requestSaveBundleTo,
  openEditMetadata,
  uploadBundle,
  updateBundle,
  createDraftRevision
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
  (dblBaseUrl, dblId, revision, parent) => (`${dblBaseUrl}/entry?id=${dblId}&revision=${getRevisionOrParentRevision(revision, parent) || 1}`)
);

function getRevisionOrParentRevision(revision, parent) {
  return parseInt(revision, 10) || (parent ? parent.revision : 0);
}

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const getIsRequestingRevision = makeGetIsRequestingRevision();
  const getEntryPageUrl = makeGetEntryPageUrl();
  const getIsDownloading = makeGetIsDownloading();
  const getFormsErrors = editMetadataService.makeGetFormsErrors();
  const mapStateToProps = (state, props) => {
    const { bundlesSaveTo, bundles: { newMediaTypes = [] } } = state;
    return {
      isRequestingRevision: getIsRequestingRevision(state, props),
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      bundlesSaveTo,
      newMediaTypes,
      entryPageUrl: getEntryPageUrl(state, props),
      isDownloading: getIsDownloading(state, props),
      formsErrors: getFormsErrors(state, props)
    };
  };
  return mapStateToProps;
};

class DBLEntryRow extends PureComponent<Props> {
  props: Props;
  state = {
    anchorEl: null
  }

  componentDidMount() {
    const { resourceCountManifest, resourceCountStored, status, formsErrorStatus } = this.props;
    if ((resourceCountManifest === null && resourceCountStored) ||
      (status === 'DRAFT' && Object.keys(formsErrorStatus).length === 0)) {
      this.props.updateBundle(this.props.bundleId);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.task === 'SAVETO' && nextProps.task !== 'SAVETO') {
      this.openInFolder();
    }
    // recompute manifest count for drafts if we have changed resource count
    if ((nextProps.resourceCountManifest === null && nextProps.resourceCountStored) ||
      (nextProps.status === 'DRAFT' &&
        (this.props.resourceCountStored !== nextProps.resourceCountStored ||
          Object.keys(nextProps.formsErrorStatus).length === 0))) {
      this.props.updateBundle(this.props.bundleId);
    }
  }

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
    return (['IN_PROGRESS'].includes(status));
  }

  showStoredButton = () => {
    const { task, status } = this.props;
    return ((task === 'DOWNLOAD' && status === 'COMPLETED')
      || status === 'DRAFT');
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
    (this.hasNoStoredResources() || this.shouldDisableDraftRevisionOrEdit());

  shouldDisableSaveTo = () => this.shouldDisableCleanResources();

  shouldShowUpload = () => {
    const { isUploading = false, task, status } = this.props;
    return status === 'DRAFT' || isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS');
  }

  shouldShowDraftRevision = () => (this.props.status !== 'DRAFT' && this.props.license === 'owned');
  shouldShowEdit = () => (this.props.status === 'DRAFT' && this.props.license === 'owned');

  shouldDisableRevise = () => (this.props.isRequestingRevision || this.props.isDownloading)

  shouldDisableUpload = () => this.shouldDisableDraftRevisionOrEdit() ||
    Object.keys(this.props.formsErrors).length > 0;

  shouldDisableDraftRevisionOrEdit = () => {
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

  onClickManageResources = (mode) => (event) => {
    const { bundleId } = this.props;
    this.props.openResourceManager(bundleId, mode);
    event.stopPropagation();
  }

  onClickEditMetadata = (event) => {
    const { bundleId } = this.props;
    this.props.openEditMetadata(bundleId);
    event.stopPropagation();
  }

  onClickDraftRevision = (event) => {
    const { bundleId } = this.props;
    this.props.createDraftRevision(bundleId);
    event.stopPropagation();
  }

  onClickForkNewEntry = event => {
    this.setState({ anchorEl: event.currentTarget });
    event.stopPropagation();
  };

  handleCloseMediaTypeMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleClickMediaType = (medium) => (event) => {
    this.handleCloseMediaTypeMenu();
    event.stopPropagation();
    // this.props.createNewBundle(medium);
  };

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

  openInFolder = () => {
    const { bundlesSaveTo, bundleId } = this.props;
    const { savedToHistory } = bundlesSaveTo;
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
    const { status, classes, formsErrors } = this.props;
    const formsErrorCount = Object.keys(formsErrors).length;
    const conditionallyRenderBadge = (errorCount, node) => {
      if (!errorCount) {
        return node;
      }
      return <Badge key="badge" className={classes.badge} badgeContent={errorCount} color="error">{node}</Badge>;
    };
    if (status === 'DRAFT') {
      return [
        conditionallyRenderBadge(formsErrorCount, <Edit key="btnEdit" className={classNames(classes.leftIcon, classes.iconSmall)} />),
        'Edit'
      ];
    }
    return (null);
  };

  pickBackgroundColor = () => {
    const {
      classes, status, revision, parent
    } = this.props;
    const effectiveRevision = getRevisionOrParentRevision(revision, parent);
    switch (status) {
      case 'DRAFT': return effectiveRevision ? classes.draftRevision : classes.draftNew;
      case 'NOT_STARTED': return classes.noneStoredMode;
      default:
        return classes.storedMode;
    }
  }

  render() {
    const {
      bundleId, dblId, revision, medium, status,
      displayAs, progress,
      isSelected, shouldShowRow,
      classes,
      newMediaTypes
    } = this.props;
    const { anchorEl } = this.state;
    if (!shouldShowRow) {
      return (null);
    }
    const resourceManagerMode = status === 'DRAFT' ? 'addFiles' : 'download';
    return (
      <div
        className={classNames(styles.bundleRow, this.pickBackgroundColor())}
        key={bundleId}
        onKeyPress={this.onKeyPress}
        onClick={this.onClickBundleRow}
        tabIndex={0}
        role="button"
        style={{ borderBottom: '1px solid lightgray' }}
      >
        <div className={styles.bundleRowTop}>
          <div className={styles.bundleRowTopLeftSideIcon}>
            <Tooltip title={medium}>
              { ux.getMediumIcon(medium) }
            </Tooltip>
          </div>
          <div className={styles.bundleRowTopLeftSideLanguageAndCountry}>
            <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.languageAndCountry)} className={styles.languageAndCountryLabel} />
          </div>
          <div className={styles.bundleRowTopLeftSideName}>
            <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.name)} />
          </div>
          <div className={styles.bundleRowTopLeftSideName}>
            <Tooltip title="Rightsholders">
              <div>
                <Copyright className={classNames(classes.leftIcon, classes.iconSmall)} />
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.rightsHolders)} />
              </div>
            </Tooltip>
          </div>
          <div className={styles.bundleRowTopMiddle}>
            <Tooltip title="license">
              <div>
                <VerifiedUserOutlined className={classNames(classes.leftIcon, classes.iconSmall)} />
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.license)} />
              </div>
            </Tooltip>
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
            {this.showStoredButton() && (
              <Button variant="flat" size="small" className={classes.button}
                onClick={this.onClickManageResources(resourceManagerMode)}
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
                onKeyPress={this.onClickManageResources('download')}
                onClick={this.onClickManageResources('download')}
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
            {this.shouldShowEdit() &&
            <Button
              disabled={this.shouldDisableDraftRevisionOrEdit()}
              variant="flat" size="small" className={classes.button}
              onKeyPress={this.onClickEditMetadata}
              onClick={this.onClickEditMetadata}
            >
              {this.renderEditIcon()}
            </Button>}
            {this.shouldShowDraftRevision() &&
            <Button
              color="secondary"
              disabled={this.shouldDisableDraftRevisionOrEdit()}
              variant="outlined"
              size="small"
              className={classNames(classes.button, classes.draftRevision)}
              onKeyPress={this.onClickDraftRevision}
              onClick={this.onClickDraftRevision}
            >
              <CreateNewFolder
                key="btnDraft"
                className={classNames(classes.leftIcon, classes.iconSmall)}
              />
              {`Draft > Rev ${revision}`}
            </Button>}
            {this.shouldShowDraftRevision() &&
            <div>
              <Button
                color="primary"
                variant="outlined"
                aria-owns={anchorEl ? 'new-media-type-menu' : null}
                aria-haspopup="true"
                aria-label="create new media type from this bundle"
                disabled={this.shouldDisableDraftRevisionOrEdit()}
                size="small"
                className={classNames(classes.button, classes.draftNew)}
                onKeyPress={this.onClickForkNewEntry}
                onClick={this.onClickForkNewEntry}
              >
                <AddCircle
                  key="btnForkNewEntry"
                  className={classNames(classes.leftIcon, classes.iconSmall)}
                />
                Save As (New)
              </Button>
              <Menu
                id="new-media-type-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={this.handleCloseMediaTypeMenu}
              >
                {newMediaTypes.map(mediumOption => (
                  <MenuItem
                    key={mediumOption}
                    onClick={this.handleClickMediaType(mediumOption)}
                  >
                    {ux.getMediumIcon(mediumOption)}
                    {mediumOption}
                  </MenuItem>
                ))}
              </Menu>
            </div>}
            <Button variant="flat" size="small" className={classes.button}
              disabled={this.shouldDisableSaveTo()}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}>
              <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
              Export To
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
  resourceCountManifest: 0,
  isUploading: null,
  isDownloading: null
};

const materialStyles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  badge: {
    marginRight: theme.spacing.unit * 2,
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
  draftRevision: { backgroundColor: lighten(theme.palette.secondary.light, 0.85) },
  draftNew: { backgroundColor: lighten(theme.palette.primary.main, 0.60) },
  storedMode: { backgroundColor: 'white' },
  noneStoredMode: { backgroundColor: '#EDEDED' },
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

function stopPropagation(event) {
  event.stopPropagation();
  return null;
}
