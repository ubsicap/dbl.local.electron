import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import LinearProgress from 'material-ui/LinearProgress';
import { Menu, MenuItem, Toolbar, Tooltip } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Badge from '@material-ui/core/Badge';
import VerifiedUserTwoTone from '@material-ui/icons/VerifiedUserTwoTone';
import VerifiedUserOutlined from '@material-ui/icons/VerifiedUserOutlined';
import VerifiedUser from '@material-ui/icons/VerifiedUser';
import AddCircle from '@material-ui/icons/AddCircle';
import Button from '@material-ui/core/Button';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import Folder from '@material-ui/icons/Folder';
import Copyright from '@material-ui/icons/Copyright';
import Save from '@material-ui/icons/Save';
import CreateNewFolder from '@material-ui/icons/CreateNewFolder';
import Description from '@material-ui/icons/Description';
import CloudUpload from '@material-ui/icons/CloudUpload';
import styles from './DBLEntryRow.css';
import ControlledHighlighter from './ControlledHighlighter';
import { toggleSelectEntry, requestSaveBundleTo, forkIntoNewBundle,
  downloadResources, uploadBundle, updateBundle, createDraftRevision } from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { bundleService } from '../services/bundle.service';
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
  laterEntryRevisions: [],
  formsErrorStatus: {},
  formsErrors: {},
  newMediaTypes: [],
  toggleSelectEntry: () => {},
  downloadResources: () => {},
  openResourceManager: () => {},
  requestSaveBundleTo: () => {},
  forkIntoNewBundle: () => {},
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
  forkIntoNewBundle,
  openEditMetadata,
  uploadBundle,
  updateBundle,
  createDraftRevision
};

const getTask = (state, props) => props.task;
const getStatus = (state, props) => props.status;
const getIsSearchActive = (state) => state.bundlesFilter.isSearchActive;
const emptyBundleMatches = {};
const emptyObj = {};
const getEmptryBundleMatches = () => emptyBundleMatches;
const getBundleId = (state, props) => props.bundleId;
const getDblId = (state, props) => props.dblId;

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

const getSelectedBundleEntryRevisions = state =>
  state.bundles.selectedBundleEntryRevisions || emptyObj;
const getSelectedBundleEntryRevision = (state, props) =>
  getSelectedBundleEntryRevisions(state)[props.dblId];
const getAllBundles = (state) => state.bundles.allBundles || emptyObj;
const getRevision = (state, props) => props.revision;
const getParent = (state, props) => props.parent;

function filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision) {
  return b => {
    if (b.id === bundleId) {
      return false;
    }
    const testEffectiveRevision = bundleService.getRevisionOrParentRevision(b.dblId, b.revision, b.parent);
    if (b.revision !== '0' && testEffectiveRevision <= effectiveRevision) {
      return false;
    }
    return true;
  };
}

const makeGetLaterEntryRevisions = () => createSelector(
  [getSelectedBundleEntryRevision, getAllBundles, getBundleId, getDblId, getRevision, getParent],
  (selectedBundleEntryRevision, allBundles, bundleId, dblId, revision, parent) => {
    if (!selectedBundleEntryRevision) {
      return []; // todo: remove this optimization if (it doesn't effect initial downloads)
    }
    const effectiveRevision = bundleService.getRevisionOrParentRevision(dblId, revision, parent);
    const allRevisions = allBundles.filter(b => b.dblId === dblId);
    const laterRevisions = allRevisions.filter(filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision));
    return laterRevisions;
  }
);

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const getIsRequestingRevision = makeGetIsRequestingRevision();
  const getIsDownloading = makeGetIsDownloading();
  const getFormsErrors = editMetadataService.makeGetFormsErrors();
  const getLaterEntryRevisions = makeGetLaterEntryRevisions();
  const mapStateToProps = (state, props) => {
    const { bundlesSaveTo, bundles: { newMediaTypes = [] } } = state;
    return {
      isRequestingRevision: getIsRequestingRevision(state, props),
      laterEntryRevisions: getLaterEntryRevisions(state, props),
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      bundlesSaveTo,
      newMediaTypes,
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
    const {
      resourceCountManifest, resourceCountStored, status, formsErrorStatus
    } = this.props;
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
  shouldShowSaveAsNew = () => (this.props.status !== 'DRAFT');
  shouldShowEdit = () => (this.props.status === 'DRAFT' && this.props.license === 'owned');

  isNewDraftEntry = () => {
    const {
      status, revision, parent, dblId
    } = this.props;
    return status === 'DRAFT' && bundleService.getRevisionOrParentRevision(dblId, revision, parent) === 0;
  }

  shouldDisableRevise = () => (this.props.isRequestingRevision || this.props.isDownloading)

  shouldDisableUpload = () => (this.shouldDisableDraftRevisionOrEdit() ||
    Object.keys(this.props.formsErrors).length > 0 || (this.isNewDraftEntry() && this.props.resourceCountStored === 0));

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

  handleCloseMediaTypeMenu = (event) => {
    this.setState({ anchorEl: null });
    event.stopPropagation();
  };

  handleClickMediaType = (medium) => (event) => {
    const { bundleId } = this.props;
    this.props.forkIntoNewBundle(bundleId, medium);
    this.handleCloseMediaTypeMenu(event);
    event.stopPropagation();
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

  renderStatus = () => (
    <ControlledHighlighter {...this.getHighlighterSharedProps(this.props.displayAs.status)} />
  );

  renderEditIcon = () => {
    const { status, classes, formsErrors } = this.props;
    const formsErrorCount = Object.keys(formsErrors).length;
    return [
      ux.conditionallyRenderBadge({ className: classes.badge, color: 'error' }, formsErrorCount, <Description key="btnEditView" className={classNames(classes.leftIcon, classes.iconSmall)} />),
      status === 'DRAFT' ? 'Edit' : 'View'
    ];
  };

  pickBackgroundColor = (isForRow) => {
    const {
      classes, status, revision, parent, dblId
    } = this.props;
    return ux.getDblRowBackgroundColor(isForRow, classes, status, revision, parent, dblId);
  }

  renderLicenseIcon = (license) => {
    const { classes } = this.props;
    if (license === 'owned') {
      return <VerifiedUser className={classNames(classes.leftIcon, classes.iconSmall)} />;  
    }
    if (license === 'open-access') {
      return <VerifiedUserTwoTone className={classNames(classes.leftIcon, classes.iconSmall)} />;
    }
    return <VerifiedUserOutlined className={classNames(classes.leftIcon, classes.iconSmall)} />;
  }

  render() {
    const {
      bundleId, dblId, revision, medium, status, license,
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
    const laterEntryRevisionsCount = this.props.laterEntryRevisions.length;
    const laterRevisionsBadge = laterEntryRevisionsCount ? `${laterEntryRevisionsCount}+` : '';
    const mediumIconMarginRight = ux.getMediumIcon(medium);
    return (
      <div
        className={classNames(styles.bundleRow, this.pickBackgroundColor(true))}
        key={bundleId}
        onKeyPress={this.onKeyPress}
        onClick={this.onClickBundleRow}
        tabIndex={0}
        role="button"
        style={{ borderBottom: '1px solid lightgray' }}
      >
        <Grid container justify="space-between" alignItems="center" wrap="nowrap">
          <Grid container justify="center" lg={1} md={1} sm={1}>
            <Grid item>
              <Tooltip title={medium}>
                { mediumIconMarginRight }
              </Tooltip>
            </Grid>
          </Grid>
          <Grid item lg={1} md={1} sm={1}>
            <div className={styles.bundleRowTopLeftSideLanguageAndCountry}>
              <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.languageAndCountry)} className={styles.languageAndCountryLabel} />
            </div>
          </Grid>
          <Grid item lg={2} md={2} sm={2}>
            <Grid container direction="column">
              <Grid item>
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.name)} />
              </Grid>
              <Grid item>
                <Typography variant="caption">
                  <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.dblId)} />
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid container lg={2} md={2} sm={2} justify="flex-end">
            <Grid item>
              <Tooltip title="Switch revision">
                <Button
                  variant="outlined"
                  size="small"
                  className={classNames(classes.button, this.pickBackgroundColor())}
                  disabled={dblId === undefined}
                  onClick={this.onClickManageResources('revisions')}
                >
                  {ux.conditionallyRenderBadge(
                    { classes: { badge: classes.badgeTight }, color: 'primary' }, laterRevisionsBadge,
                    <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.revision)} />
                    )}
                </Button>
              </Tooltip>
            </Grid>
          </Grid>
          <Grid item>
            <Tooltip title="license">
              <div>
                {this.renderLicenseIcon(license)}
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.license)} />
              </div>
            </Tooltip>
          </Grid>
          <Grid item lg={2} md={2} sm={2}>
            <Tooltip title="Rightsholders">
              <div>
                <Copyright className={classNames(classes.leftIcon, classes.iconSmall)} />
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.rightsHolders)} />
              </div>
            </Tooltip>
          </Grid>
          <Grid container lg={2} md={2} sm={2} justify="flex-end">
            <Grid item>
              {this.showStoredButton() && (
                <Button
                  variant="text"
                  size="small"
                  className={classNames(classes.button, this.pickBackgroundColor())}
                  onClick={this.onClickManageResources(resourceManagerMode)}
                >
                  <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />
                  <Badge badgeContent={ux.getMediumIcon(medium, { className: classNames(classes.rightIcon, classes.iconSmaller) })} >
                    <Folder className={classNames(classes.rightIcon, classes.iconSmall)} />
                  </Badge>
                </Button>
              )}
            </Grid>
            {this.showStatusAsText() && (
              <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
                {<ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
              </div>
            )}
            {this.showDownloadButton() && (
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onKeyPress={this.onClickManageResources('download')}
                onClick={this.onClickManageResources('download')}
              >
                <ControlledHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />
                <FileDownload className={classNames(classes.rightIcon, classes.iconSmall)} />
              </Button>
            )}
          </Grid>
        </Grid>
        {status === 'IN_PROGRESS' && (
          <div
            className="row"
            style={{ marginLeft: '20px', marginRight: '20px', paddingBottom: '10px' }}
          >
            <LinearProgress style={{ height: '8px' }} mode="determinate" value={progress} />
          </div>
        )}
        {isSelected && (
          <Toolbar style={{ minHeight: '36px' }} className={this.pickBackgroundColor()}>
            {
              <Button
                disabled={this.shouldDisableDraftRevisionOrEdit()}
                variant="text" size="small" className={classes.button}
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
            {this.shouldShowSaveAsNew() &&
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
            <Button variant="text" size="small" className={classes.button}
              disabled={this.shouldDisableSaveTo()}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}>
              <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
              Export To
            </Button>
            <DeleteOrCleanButton {...this.props} shouldDisableCleanResources={this.shouldDisableCleanResources()} />
            {this.shouldShowUpload() &&
              <ConfirmButton classes={classes} variant="text" size="small" className={classes.button}
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

const materialStyles = theme => ux.getDblRowStyles(theme);

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
