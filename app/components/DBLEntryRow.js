import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import LinearProgress from 'material-ui/LinearProgress';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import FlatButton from 'material-ui/FlatButton';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import FolderOpen from 'material-ui/svg-icons/file/folder-open';
import SaveTo from 'material-ui/svg-icons/content/save';
import CallSplit from 'material-ui/svg-icons/communication/call-split';
import ActionInfo from 'material-ui/svg-icons/action/info';
import ActionDelete from 'material-ui/svg-icons/action/delete';
import styles from './DBLEntryRow.css';
import PureHighlighter from './PureHighlighter';
import { toggleSelectBundle, requestSaveBundleTo, removeResources, downloadResources } from '../actions/bundle.actions';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

type Props = {
  bundleId: string,
  dblId: string,
  task: string,
  status: string,
  medium: string,
  displayAs: {},
  bundleMatches: {},
  bundlesSaveTo: {},
  progress?: ?number,
  isDownloaded: ?boolean,
  isSelected: ?boolean,
  shouldShowRow: boolean,
  toggleSelectBundle: () => {},
  downloadResources: () => {},
  requestSaveBundleTo: () => {},
  removeResources: () => {}
};

const mapDispatchToProps = {
  toggleSelectBundle,
  downloadResources,
  requestSaveBundleTo,
  removeResources
};

const getIsSearchActive = (state) => state.bundlesFilter.isSearchActive;
const emptyBundleMatches = {};
const getEmptryBundleMatches = () => emptyBundleMatches;

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

const makeMapStateToProps = () => {
  const shouldShowRow = makeShouldShowRow();
  const getMatches = makeGetBundleMatches();
  const mapStateToProps = (state, props) => {
    const { bundlesSaveTo } = state;
    return {
      shouldShowRow: shouldShowRow(state, props),
      bundleMatches: getMatches(state, props),
      bundlesSaveTo
    };
  };
  return mapStateToProps;
};

/*

function mapStateToProps(state) {
  const { bundlesFilter, bundlesSaveTo } = state;
  return {
    bundlesFilter,
    bundlesSaveTo
  };
}

*/

class DBLEntryRow extends PureComponent<Props> {
  props: Props;

  onKeyPress = (event) => {
    if (['Enter', ' '].includes(event.key)) {
      this.onClickBundleRow();
    }
    console.log(event.key);
  }

  onClickBundleRow = () => {
    const { bundleId: id, displayAs } = this.props;
    this.props.toggleSelectBundle({ id, displayAs });
  }

  showStatusAsText = () => {
    const { task, status } = this.props;
    return ((task === 'UPLOAD' || task === 'DOWNLOAD') &&
      (status === 'COMPLETED' || status === 'DRAFT' || status === 'IN_PROGRESS')) ||
      ((task === 'REMOVE_RESOURCES') && status === 'IN_PROGRESS');
  }

  showDownloadButton = () => {
    const { task, status } = this.props;
    return (task === 'DOWNLOAD' && status === 'NOT_STARTED');
  }

  hasNotYetDownloadedResources = () => {
    const { isDownloaded, progress } = this.props;
    return ((isDownloaded === undefined || !isDownloaded)
      || (progress && progress < 100)) === true;
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
    const { dblId } = this.props;
    onOpenLink(event, `https://thedigitalbiblelibrary.org/entry?id=${dblId}`);
  }

  onClickRemoveResources = (event) => {
    const { bundleId } = this.props;
    this.props.removeResources(bundleId);
    event.stopPropagation();
  }

  renderStatus = () => (
    <PureHighlighter {...this.getHighlighterSharedProps(this.props.displayAs.status)} />
  );

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
      shouldShowRow
    } = this.props;
    return (
      (!shouldShowRow && (null)) ||
      <div
        className={styles.bundleRow}
        key={bundleId}
        onKeyPress={this.onKeyPress}
        onClick={this.onClickBundleRow}
        tabIndex={0}
        role="button"
        style={{ background: `${pickBackgroundColor(task, status)}` }}
      >
        <div className={styles.bundleRowTop}>
          <div className={styles.bundleRowTopLeftSideIcon}>
            { (medium === 'text' && <Book />)
            || (medium === 'audio' && <Headset />)
            || (medium === 'video' && <Videocam />)
            || (medium === 'print' && <Print />)
            || medium }
          </div>
          <div className={styles.bundleRowTopLeftSide}>
            <PureHighlighter {...this.getHighlighterSharedProps(displayAs.name)} />
          </div>
          <div className={styles.bundleRowTopMiddle}>
            <PureHighlighter {...this.getHighlighterSharedProps(displayAs.revision)} />
          </div>
          <div className={styles.bundleRowTopRightSide}>
            {task === 'SAVETO' && (
              <FlatButton
                labelPosition="before"
                label={<PureHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
                icon={<FolderOpen />}
                onClick={this.openInFolder}
              />
            )}
            {this.showStatusAsText() && (
              <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
                {<PureHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
              </div>
            )}
            {this.showDownloadButton() && (
              <FlatButton
                labelPosition="before"
                label={<PureHighlighter {...this.getHighlighterSharedProps(displayAs.status)} />}
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
          <div className={`${styles.menuBar} + row`}>
            <FlatButton
              label="Revise"
              icon={<CallSplit />}
              disabled
              onKeyPress={stopPropagation}
              onClick={stopPropagation}
            />
            <FlatButton
              label="Save To"
              disabled={this.hasNotYetDownloadedResources()}
              icon={<SaveTo />}
              onKeyPress={this.startSaveBundleTo}
              onClick={this.startSaveBundleTo}
            />
            <FlatButton
              label="Info"
              disabled={dblId === undefined}
              icon={<ActionInfo />}
              onKeyPress={this.onOpenDBLEntryLink}
              onClick={this.onOpenDBLEntryLink}
            />
            <FlatButton
              label="Clean"
              disabled={this.hasNotYetDownloadedResources()}
              icon={<ActionDelete />}
              onKeyPress={this.onClickRemoveResources}
              onClick={this.onClickRemoveResources}
            />
          </div>
          )}
      </div>
    );
  }
}

DBLEntryRow.defaultProps = {
  progress: null
};

export default connect(
  makeMapStateToProps,
  mapDispatchToProps,
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
    case 'IN_PROGRESS':
      return '#6DCBC4';
    case 'COMPLETED': return '#A1CB6D';
    default:
      return 'white';
  }
}

function stopPropagation(event) {
  event.stopPropagation();
}

function onOpenLink(event, url) {
  event.preventDefault();
  event.stopPropagation();
  shell.openExternal(url);
}

