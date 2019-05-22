import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import { Set } from 'immutable';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import FileDownload from '@material-ui/icons/CloudDownload';
import Folder from '@material-ui/icons/Folder';
import InfoIcon from '@material-ui/icons/Info';
import ControlledHighlighter from './ControlledHighlighter';
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
import MediumIcon from './MediumIcon';
import { emptyArray, emptyObject } from '../utils/defaultValues';

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
  isSelected: ?boolean,
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
      bundlesSaveTo,
      newMediaTypes,
      isDownloading: getIsDownloading(state, props),
      formsErrors: getFormsErrors(state, props),
      shouldShowStarred: state.bundlesFilter.showStarredEntries
    };
  };
  return mapStateToProps;
};

class EntryRowStatusButton extends PureComponent<Props> {
  props: Props;

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

  handleClickManageResources = mode => event => {
    const { bundleId, openEntryResourceManager } = this.props;
    openEntryResourceManager(bundleId, mode, true);
    event.stopPropagation();
  };

  handleClickUploadInfo = () => {
    const { bundleId, openEntryJobSpecInBrowser } = this.props;
    openEntryJobSpecInBrowser(bundleId);
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
    const { medium, status, displayAs, classes } = this.props;
    const isUploading = this.getIsUploading();
    const resourceManagerMode = status === 'DRAFT' ? 'addFiles' : 'download';
    return (
      <div>
        {this.showStoredButton() && (
          <Button
            variant="text"
            size="small"
            className={classNames(classes.button, this.pickBackgroundColor())}
            onClick={this.handleClickManageResources(resourceManagerMode)}
          >
            <Badge
              badgeContent={
                <MediumIcon
                  medium={medium}
                  iconProps={{
                    className: classNames(classes.leftIcon, classes.iconSmaller)
                  }}
                />
              }
            >
              <Folder
                className={classNames(classes.leftIcon, classes.iconSmall)}
              />
            </Badge>
            <ControlledHighlighter
              {...this.getHighlighterSharedProps(displayAs.status)}
            />
          </Button>
        )}
        {isUploading && (
          <Button
            variant="text"
            size="small"
            className={classNames(classes.button, this.pickBackgroundColor())}
            onClick={this.handleClickUploadInfo}
          >
            <InfoIcon
              className={classNames(classes.leftIcon, classes.iconSmall)}
            />
            <ControlledHighlighter
              {...this.getHighlighterSharedProps(displayAs.status)}
            />
          </Button>
        )}
        {this.showStatusAsText() && (
          <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
            {
              <ControlledHighlighter
                {...this.getHighlighterSharedProps(displayAs.status)}
              />
            }
          </div>
        )}
        {this.showDownloadButton() && (
          <Button
            variant="outlined"
            size="small"
            className={classes.button}
            onClick={this.handleClickManageResources('download')}
          >
            <FileDownload
              className={classNames(classes.leftIcon, classes.iconSmall)}
            />
            <ControlledHighlighter
              {...this.getHighlighterSharedProps(displayAs.status)}
            />
          </Button>
        )}
      </div>
    );
  }
}

EntryRowStatusButton.defaultProps = {
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
)(EntryRowStatusButton);
