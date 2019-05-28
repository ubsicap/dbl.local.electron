import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import { Set } from 'immutable';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Menu, MenuItem, Toolbar } from '@material-ui/core';
import AddCircle from '@material-ui/icons/AddCircle';
import Button from '@material-ui/core/Button';
import Save from '@material-ui/icons/Save';
import CreateNewFolder from '@material-ui/icons/CreateNewFolder';
import Description from '@material-ui/icons/Description';
import CloudUpload from '@material-ui/icons/CloudUpload';
import { toggleEntryStar } from '../actions/bundleFilter.actions';
import {
  toggleSelectEntry,
  requestSaveBundleTo,
  forkIntoNewBundle,
  downloadResources,
  uploadBundle,
  updateBundle,
  createDraftRevision,
  openJobSpecInBrowser
} from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { bundleService } from '../services/bundle.service';
import { ux } from '../utils/ux';
import DeleteOrCleanButton from './DeleteOrCleanButton';
import ConfirmButton from './ConfirmButton';
import MediumIcon from './MediumIcon';
import { emptyArray, emptyObject } from '../utils/defaultValues';

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
  mode: string,
  resourceCountStored?: number,
  resourceCountManifest?: ?number,
  bundleMatches: {},
  bundlesSaveTo: {},
  progress?: ?number,
  isUploading?: ?boolean,
  isDownloading?: ?boolean,
  shouldShowStarred: ?boolean,
  isStarred: ?boolean,
  shouldShowRow: boolean,
  classes: {},
  isRequestingRevision: boolean,
  laterEntryRevisions: [],
  formsErrorStatus: {},
  formsErrors: {},
  newMediaTypes: [],
  toggleSelectEntry: () => {},
  downloadResources: () => {},
  openEntryResourceManager: () => {},
  requestSaveEntryBundleTo: () => {},
  forkEntryIntoNewBundle: () => {},
  openEntryEditMetadata: () => {},
  uploadEntryBundle: () => {},
  updateEntryBundle: () => {},
  createEntryDraftRevision: () => {},
  openEntryJobSpecInBrowser: () => {},
  toggleEntryStarBtn: () => {}
};

const mapDispatchToProps = {
  toggleSelectEntry,
  downloadResources,
  openEntryResourceManager: openResourceManager,
  requestSaveEntryBundleTo: requestSaveBundleTo,
  forkEntryIntoNewBundle: forkIntoNewBundle,
  openEntryEditMetadata: openEditMetadata,
  uploadEntryBundle: uploadBundle,
  updateEntryBundle: updateBundle,
  createEntryDraftRevision: createDraftRevision,
  openEntryJobSpecInBrowser: openJobSpecInBrowser,
  toggleEntryStarBtn: toggleEntryStar
};

const getTask = (state, props) => props.task;
const getStatus = (state, props) => props.status;
const getIsSearchActive = state => state.bundlesFilter.isSearchActive;
const getStarredEntries = state => state.bundlesFilter.starredEntries;
const emptyBundleMatches = emptyObject;
const getEmptryBundleMatches = () => emptyBundleMatches;
const getBundleId = (state, props) => props.bundleId;
const getDblId = (state, props) => props.dblId;

const getBundleMatches = (state, props) =>
  state.bundlesFilter.searchResults &&
  state.bundlesFilter.searchResults.bundlesMatching
    ? state.bundlesFilter.searchResults.bundlesMatching[props.bundleId] ||
      emptyBundleMatches
    : emptyBundleMatches;

const makeGetIsDownloading = () =>
  createSelector(
    [getTask, getStatus],
    (task, status) => task === 'DOWNLOAD' && status === 'IN_PROGRESS'
  );

const makeShouldShowRow = () =>
  createSelector(
    [getIsSearchActive, getBundleMatches],
    (isActiveSearch, bundleMatches) =>
      !isActiveSearch || Object.keys(bundleMatches).length > 0
  );

const makeGetBundleMatches = () =>
  createSelector(
    [getIsSearchActive, getBundleMatches, getEmptryBundleMatches],
    (isActiveSearch, bundleMatches, emptyMatches) =>
      isActiveSearch ? bundleMatches : emptyMatches
  );

const getRequestingRevision = state =>
  state.bundleEditMetadata.requestingRevision;

const makeGetIsRequestingRevision = () =>
  createSelector(
    [getRequestingRevision, getBundleId],
    (requestingRevision, bundleId) => requestingRevision === bundleId
  );

const getSelectedBundleEntryRevisions = state =>
  state.bundles.selectedBundleEntryRevisions || emptyObject;
const getSelectedBundleEntryRevision = (state, props) =>
  getSelectedBundleEntryRevisions(state)[props.dblId];
const getAllBundles = state => state.bundles.allBundles || emptyObject;
const getRevision = (state, props) => props.revision;
const getParent = (state, props) => props.parent;

function filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision) {
  return b => {
    if (b.id === bundleId) {
      return false;
    }
    const testEffectiveRevision = bundleService.getRevisionOrParentRevision(
      b.dblId,
      b.revision,
      b.parent
    );
    if (b.revision !== '0' && testEffectiveRevision <= effectiveRevision) {
      return false;
    }
    return true;
  };
}

const makeGetLaterEntryRevisions = () =>
  createSelector(
    [
      getSelectedBundleEntryRevision,
      getAllBundles,
      getBundleId,
      getDblId,
      getRevision,
      getParent
    ],
    (
      selectedBundleEntryRevision,
      allBundles,
      bundleId,
      dblId,
      revision,
      parent
    ) => {
      if (!selectedBundleEntryRevision) {
        return emptyArray; // todo: remove this optimization if (it doesn't effect initial downloads)
      }
      const effectiveRevision = bundleService.getRevisionOrParentRevision(
        dblId,
        revision,
        parent
      );
      const allRevisions = allBundles.filter(b => b.dblId === dblId);
      const laterRevisions = allRevisions.filter(
        filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision)
      );
      return laterRevisions;
    }
  );

const makeGetIsEntryStarred = () =>
  createSelector(
    [getStarredEntries, getDblId],
    (starredEntries, dblId) => (starredEntries || Set()).has(dblId)
  );

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const getIsEntryStarred = makeGetIsEntryStarred();
  const getIsRequestingRevision = makeGetIsRequestingRevision();
  const getIsDownloading = makeGetIsDownloading();
  const getFormsErrors = editMetadataService.makeGetFormsErrors();
  const getLaterEntryRevisions = makeGetLaterEntryRevisions();
  const mapStateToProps = (state, props) => {
    const {
      bundlesSaveTo,
      bundles: { newMediaTypes = emptyArray }
    } = state;
    return {
      isRequestingRevision: getIsRequestingRevision(state, props),
      laterEntryRevisions: getLaterEntryRevisions(state, props),
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      isStarred: getIsEntryStarred(state, props),
      resourceCountStored: props.storedResourcePaths.length,
      resourceCountManifest: props.manifestResourcePaths.length,
      bundlesSaveTo,
      newMediaTypes,
      isDownloading: getIsDownloading(state, props),
      formsErrors: getFormsErrors(state, props),
      shouldShowStarred: state.bundlesFilter.showStarredEntries
    };
  };
  return mapStateToProps;
};

class EntryRowExpandedRow extends PureComponent<Props> {
  props: Props;

  state = {
    anchorEl: null
  };

  componentDidMount() {
    const {
      status,
      formsErrorStatus,
      updateEntryBundle,
      bundleId
    } = this.props;
    if (status === 'DRAFT' && Object.keys(formsErrorStatus).length === 0) {
      updateEntryBundle(bundleId);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { task } = this.props;
    if (task === 'SAVETO' && nextProps.task !== 'SAVETO') {
      this.openInFolder();
    }
  }

  onKeyPress = event => {
    if (['Enter', ' '].includes(event.key)) {
      this.onClickBundleRow();
    }
    console.log(event.key);
  };

  onClickBundleRow = () => {
    const {
      bundleId: id,
      dblId,
      displayAs,
      toggleSelectEntry: toggleSelectedEntry
    } = this.props;
    toggleSelectedEntry({ id, dblId, displayAs });
  };

  handleClickStar = event => {
    const { dblId, toggleEntryStarBtn } = this.props;
    event.stopPropagation();
    toggleEntryStarBtn(dblId);
  };

  showStatusAsText = () => {
    if (this.getIsUploading()) {
      return false;
    }
    const { status } = this.props;
    return ['IN_PROGRESS'].includes(status);
  };

  showStoredButton = () => {
    const { task, status } = this.props;
    return (
      (task === 'DOWNLOAD' && status === 'COMPLETED') || status === 'DRAFT'
    );
  };

  showDownloadButton = () => {
    const { task, status } = this.props;
    return task === 'DOWNLOAD' && status === 'NOT_STARTED';
  };

  hasNoStoredResources = () => {
    const { resourceCountStored = 0 } = this.props;
    return resourceCountStored === 0;
  };

  shouldDisableCleanResources = () =>
    this.hasNoStoredResources() || this.shouldDisableDraftRevisionOrEdit();

  shouldDisableSaveTo = () => this.shouldDisableCleanResources();

  getIsUploading = () => {
    const { isUploading = false, task, status } = this.props;
    return isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS');
  };

  shouldShowUpload = () => {
    const { status } = this.props;
    return status === 'DRAFT' || this.getIsUploading();
  };

  shouldShowDraftRevision = () => {
    const { status, license } = this.props;
    return status !== 'DRAFT' && license === 'owned';
  };

  shouldShowSaveAsNew = () => {
    const { status } = this.props;
    return status !== 'DRAFT';
  };

  shouldShowEdit = () => {
    const { status, license } = this.props;
    return status === 'DRAFT' && license === 'owned';
  };

  isNewDraftEntry = () => {
    const { status, revision, parent, dblId } = this.props;
    return (
      status === 'DRAFT' &&
      bundleService.getRevisionOrParentRevision(dblId, revision, parent) === 0
    );
  };

  shouldDisableRevise = () => {
    const { isRequestingRevision, isDownloading } = this.props;
    return isRequestingRevision || isDownloading;
  };

  shouldDisableUpload = () => {
    const { formsErrors, resourceCountStored } = this.props;
    return (
      this.shouldDisableDraftRevisionOrEdit() ||
      Object.keys(formsErrors).length > 0 ||
      (this.isNewDraftEntry() && resourceCountStored === 0)
    );
  };

  shouldDisableDraftRevisionOrEdit = () => {
    return this.getIsUploading() || this.shouldDisableRevise();
  };

  emptyMatches = emptyArray;

  getMatches = textToHighlight => {
    const { bundleMatches } = this.props;
    const matches = bundleMatches[textToHighlight] || this.emptyMatches;
    return matches;
  };

  getHighlighterSharedProps = textToHighlight => ({
    textToHighlight,
    matches: this.getMatches(textToHighlight)
  });

  onClickManageResources = mode => event => {
    const { bundleId, openEntryResourceManager } = this.props;
    openEntryResourceManager(bundleId, mode, true);
    event.stopPropagation();
  };

  onClickEditMetadata = event => {
    const { bundleId, openEntryEditMetadata } = this.props;
    openEntryEditMetadata(bundleId, undefined, true);
    event.stopPropagation();
  };

  onClickDraftRevision = event => {
    const { bundleId, createEntryDraftRevision } = this.props;
    createEntryDraftRevision(bundleId);
    event.stopPropagation();
  };

  onClickForkNewEntry = event => {
    this.setState({ anchorEl: event.currentTarget });
    event.stopPropagation();
  };

  handleCloseMediaTypeMenu = event => {
    this.setState({ anchorEl: null });
    event.stopPropagation();
  };

  handleClickMediaType = medium => event => {
    const { bundleId, forkEntryIntoNewBundle } = this.props;
    forkEntryIntoNewBundle(bundleId, medium);
    this.handleCloseMediaTypeMenu(event);
    event.stopPropagation();
  };

  handleClickUploadInfo = () => {
    const { bundleId, openEntryJobSpecInBrowser } = this.props;
    openEntryJobSpecInBrowser(bundleId);
  };

  onClickUploadBundle = event => {
    const { bundleId, uploadEntryBundle } = this.props;
    uploadEntryBundle(bundleId);
    event.stopPropagation();
  };

  startSaveBundleTo = event => {
    const { bundlesSaveTo, bundleId, requestSaveEntryBundleTo } = this.props;
    const { savedToHistory } = bundlesSaveTo;
    stopPropagation(event);
    const bundleSavedToInfo = getBundleExportInfo(bundleId, savedToHistory);
    const defaultPath = bundleSavedToInfo
      ? bundleSavedToInfo.folderName
      : app.getPath('downloads');
    dialog.showOpenDialog(
      {
        defaultPath,
        properties: ['openDirectory']
      },
      folderName => {
        if (!folderName) {
          return; // canceled.
        }
        console.log(folderName.toString());
        requestSaveEntryBundleTo(bundleId, folderName.toString());
      }
    );
  };

  openInFolder = () => {
    const { bundlesSaveTo, bundleId } = this.props;
    const { savedToHistory } = bundlesSaveTo;
    const bundleSavedToInfo = getBundleExportInfo(bundleId, savedToHistory);
    if (bundleSavedToInfo) {
      const { folderName } = bundleSavedToInfo;
      shell.openItem(folderName);
    }
  };

  renderEditIcon = () => {
    const { status, classes, formsErrors } = this.props;
    const formsErrorCount = Object.keys(formsErrors).length;
    return [
      ux.conditionallyRenderBadge(
        { className: classes.badge, color: 'error' },
        formsErrorCount,
        <Description
          key="btnEditView"
          className={classNames(classes.leftIcon, classes.iconSmall)}
        />
      ),
      status === 'DRAFT' ? 'Edit' : 'View'
    ];
  };

  pickBackgroundColor = isForRow => {
    const { classes, status, revision, parent, dblId, mode } = this.props;
    return ux.getDblRowBackgroundColor(
      isForRow,
      classes,
      status,
      revision,
      parent,
      dblId,
      mode
    );
  };

  render() {
    const { revision, status, progress, classes, newMediaTypes } = this.props;
    const { anchorEl } = this.state;
    return (
      <React.Fragment>
        {status === 'IN_PROGRESS' && (
          <LinearProgress
            style={{
              marginLeft: '20px',
              marginRight: '20px',
              marginBottom: '5px',
              paddingBottom: '10px',
              height: '8px'
            }}
            variant="determinate"
            value={progress}
          />
        )}
        {
          <Toolbar
            style={{ minHeight: '36px' }}
            className={this.pickBackgroundColor()}
          >
            {
              <Button
                disabled={this.shouldDisableDraftRevisionOrEdit()}
                variant="text"
                size="small"
                className={classes.button}
                onKeyPress={this.onClickEditMetadata}
                onClick={this.onClickEditMetadata}
              >
                {this.renderEditIcon()}
              </Button>
            }
            {this.shouldShowDraftRevision() && (
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
              </Button>
            )}
            {this.shouldShowSaveAsNew() && (
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
                      {<MediumIcon medium={mediumOption} />}
                      {mediumOption}
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            )}
            <Button
              variant="text"
              size="small"
              className={classes.button}
              disabled={this.shouldDisableSaveTo()}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}
            >
              <Save
                className={classNames(classes.leftIcon, classes.iconSmall)}
              />
              Export To
            </Button>
            <DeleteOrCleanButton
              {...this.props}
              shouldDisableCleanResources={this.shouldDisableCleanResources()}
            />
            {this.shouldShowUpload() && (
              <ConfirmButton
                classes={classes}
                variant="text"
                size="small"
                className={classes.button}
                disabled={this.shouldDisableUpload()}
                onKeyPress={this.onClickUploadBundle}
                onClick={this.onClickUploadBundle}
              >
                <CloudUpload
                  className={classNames(classes.leftIcon, classes.iconSmall)}
                />
                Upload
              </ConfirmButton>
            )}
          </Toolbar>
        }
      </React.Fragment>
    );
  }
}

EntryRowExpandedRow.defaultProps = {
  progress: null,
  resourceCountStored: 0,
  resourceCountManifest: 0,
  isUploading: null,
  isDownloading: null
};

const materialStyles = theme => ux.getDblRowStyles(theme);

export default compose(
  withStyles(materialStyles),
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  )
)(EntryRowExpandedRow);

function getBundleExportInfo(bundleId, savedToHistory) {
  return savedToHistory ? savedToHistory[bundleId] : null;
}

function stopPropagation(event) {
  event.stopPropagation();
  return null;
}