import React, { Component } from 'react';
import { connect } from 'react-redux';
import { DebounceInput } from 'react-debounce-input';
import LinearProgress from 'material-ui/LinearProgress';
import CircularProgress from 'material-ui/CircularProgress';
import Highlighter from 'react-highlight-words';
import FlatButton from 'material-ui/FlatButton';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import FolderOpen from 'material-ui/svg-icons/file/folder-open';
import SaveTo from 'material-ui/svg-icons/content/save';
import CallSplit from 'material-ui/svg-icons/communication/call-split';
import ActionInfo from 'material-ui/svg-icons/action/info';
import ActionDelete from 'material-ui/svg-icons/action/delete';
import { navigationConstants } from '../constants/navigation.constants';
import { mockFetchAll, fetchAll,
  toggleSelectBundle, toggleModePauseResume,
  setupBundlesEventSource, downloadResources, requestSaveBundleTo,
  removeResources } from '../actions/bundle.actions';
import { updateSearchInput, clearSearch } from '../actions/bundleFilter.actions';
import styles from './Bundles.css';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

type Props = {
  fetchAll: () => {},
  mockFetchAll: () => {},
  downloadResources: () => {},
  setupBundlesEventSource: () => {},
  requestSaveBundleTo: () => {},
  removeResources: () => {},
  toggleSelectBundle: () => {},
  toggleModePauseResume: () => {},
  updateSearchInput: () => {},
  clearSearch: () => {},
  history: {},
  bundles: {},
  bundlesFilter: {},
  bundlesSaveTo: {},
  authentication: {}
};

function mapStateToProps(state) {
  const { bundles, bundlesFilter, bundlesSaveTo, authentication } = state;
  return {
    bundles,
    bundlesFilter,
    bundlesSaveTo,
    authentication
  };
}

const mapDispatchToProps = {
  fetchAll,
  mockFetchAll,
  setupBundlesEventSource,
  downloadResources,
  requestSaveBundleTo,
  removeResources,
  toggleSelectBundle,
  toggleModePauseResume,
  updateSearchInput,
  clearSearch
};

class Bundles extends Component<Props> {
  props: Props;
  componentDidMount() {
    const { history, clearSearch: clearSearchResults } = this.props;
    if (history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO) {
      this.props.mockFetchAll();
    } else {
      this.props.fetchAll();
    }
    history.listen(() => {
      // clear search results on location change
      clearSearchResults();
    });
    console.log('Bundles did mount');
    const { authentication } = this.props;
    if (authentication.user) {
      this.props.setupBundlesEventSource(authentication);
    }
  }

  componentWillUnmount() {
    const { bundles } = this.props;
    console.log('Bundles did unmount');
    if (bundles.eventSource) {
      bundles.eventSource.close();
      console.log('bundles EventSource closed');
    }
  }

  onKeyPress(event, bundleId) {
    if (['Enter', ' '].includes(event.key)) {
      this.onClickBundleRow(event, bundleId);
    }
    console.log(event.key);
  }

  onClickBundleRow(event, bundleId) {
    this.props.toggleSelectBundle(bundleId);
  }

  startSaveBundleTo(event, bundle, savedToHistory) {
    stopPropagation(event);
    const bundleSavedToInfo = getBundleExportInfo(bundle, savedToHistory);
    const defaultPath = bundleSavedToInfo ? bundleSavedToInfo.folderName : app.getPath('downloads');
    dialog.showOpenDialog({
      defaultPath,
      properties: ['openDirectory']
    }, (folderName) => {
      if (!folderName) {
        return; // canceled.
      }
      console.log(folderName.toString());
      this.props.requestSaveBundleTo(bundle.id, folderName.toString());
    });
  }

  onClickDownloadResources(event, bundleId) {
    this.props.downloadResources(bundleId);
    event.stopPropagation();
  }

  onClickRemoveResources(event, bundle) {
    this.props.removeResources(bundle.id);
    event.stopPropagation();
  }

  onClickTogglePauseResume(event, bundleId) {
    this.props.toggleModePauseResume(bundleId);
    event.stopPropagation();
  }

  onChangeSearchInput(event, inputValue) {
    this.props.updateSearchInput(inputValue, this.props.bundles);
  }

  updateMatches(bundle, options) {
    const { bundlesFilter } = this.props;
    if (!bundlesFilter.isSearchActive) {
      return [];
    }
    const { searchResults } = bundlesFilter;
    const { bundlesMatching, chunks } = searchResults;
    const hasMatchInBundle = bundle.id in bundlesMatching;
    if (hasMatchInBundle) {
      return chunks[options.textToHighlight];
    }
    return [];
  }

  render() {
    const { bundles, bundlesFilter, bundlesSaveTo } = this.props;
    const { savedToHistory } = bundlesSaveTo;
    const highlighterSharedProps = (bundle) => ({
      searchWords: bundlesFilter.isSearchActive ? bundlesFilter.searchKeywords : [],
      highlightClassName: styles.Highlight,
      findChunks: (options) => this.updateMatches(bundle, options)
    });
    const onClickAndKeyPressProps = (handler) => ({
      onKeyPress: handler,
      onClick: handler,
    });
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.searchBar}>
          <div className={styles.searchBarFilters}>Show: <span>All</span> </div>
          <div className={styles.searchBarSearch}>Search:
            <DebounceInput
              debounceTimeout={300}
              value={bundlesFilter.isSearchActive ? bundlesFilter.searchInput : ''}
              onChange={(event) => this.onChangeSearchInput(event, event.target.value)}
            />
          </div>
        </div>
        {bundles.loading &&
          <div className="row" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={80} thickness={5} />
          </div>
        }
        {bundles.items && bundles.items.filter((b) => displayRow(bundlesFilter, b)).map((d) => (
          <div
            className={styles.bundleRow}
            key={d.id}
            onKeyPress={(e) => this.onKeyPress(e, d.id)}
            onClick={(e) => this.onClickBundleRow(e, d.id)}
            tabIndex={0}
            role="button"
            style={{ background: `${pickBackgroundColor(d.task, d.status)}` }}
          >
            <div className={styles.bundleRowTop}>
              <div className={styles.bundleRowTopLeftSide}>
                <Highlighter textToHighlight={d.displayAs.name} {...highlighterSharedProps(d)} />
              </div>
              <div className={styles.bundleRowTopMiddle}>
                <Highlighter textToHighlight={d.displayAs.revision} {...highlighterSharedProps(d)} />
              </div>
              <div className={styles.bundleRowTopRightSide}>
                {d.task === 'SAVETO' &&
                  (<FlatButton
                    labelPosition="before"
                    label={<Highlighter textToHighlight={d.displayAs.status} {...highlighterSharedProps(d)} />}
                    icon={<FolderOpen />}
                    onClick={(e) => openInFolder(e, d, savedToHistory)}
                  />)
                }
                {showStatusAsText(d) &&
                  <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
                    <Highlighter textToHighlight={d.displayAs.status} {...highlighterSharedProps(d)} />
                  </div>}
                {showDownloadButton(d) &&
                <FlatButton
                  labelPosition="before"
                  label={<Highlighter textToHighlight={d.displayAs.status} {...highlighterSharedProps(d)} />}
                  icon={<FileDownload />}
                  onClick={(e) => this.onClickDownloadResources(e, d.id)}
                />
                }
              </div>
            </div>
            {d.status === 'IN_PROGRESS' &&
            <div className="row" style={{ marginLeft: '20px', marginRight: '20px', paddingBottom: '10px' }}>
              <LinearProgress mode="determinate" value={d.progress} />
            </div>}
            {bundles.selectedBundle && bundles.selectedBundle.id === d.id &&
              <div className={`${styles.menuBar} + row`}>
                <FlatButton
                  label="Revise"
                  icon={<CallSplit />}
                  disabled
                  onKeyPress={(e) => stopPropagation(e)}
                  onClick={(e) => stopPropagation(e)}
                />
                <FlatButton
                  label="Save To"
                  disabled={hasNotYetDownloadedResources(d)}
                  icon={<SaveTo />}
                  {...onClickAndKeyPressProps((e) => this.startSaveBundleTo(e, d, savedToHistory))}
                />
                <FlatButton
                  label="Info"
                  disabled={(d.dblId === undefined)}
                  icon={<ActionInfo />}
                  {...onClickAndKeyPressProps((e) => onOpenLink(e, `https://thedigitalbiblelibrary.org/entry?id=${d.dblId}`))}
                />
                <FlatButton
                  label="Clean"
                  disabled={hasNotYetDownloadedResources(d)}
                  icon={<ActionDelete />}
                  {...onClickAndKeyPressProps((e) => this.onClickRemoveResources(e, d))}
                />
              </div>
            }
          </div>))}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Bundles);

function hasNotYetDownloadedResources(bundle) {
  return ((bundle.isDownloaded === undefined || !bundle.isDownloaded)
    || (bundle.progress && bundle.progress < 100)) === true;
}

function showStatusAsText(bundle) {
  return ((bundle.task === 'UPLOAD' || bundle.task === 'DOWNLOAD') &&
    (bundle.status === 'COMPLETED' || bundle.status === 'DRAFT' || bundle.status === 'IN_PROGRESS')) ||
    ((bundle.task === 'REMOVE_RESOURCES') && bundle.status === 'IN_PROGRESS');
}

function showDownloadButton(bundle) {
  return (bundle.task === 'DOWNLOAD' && bundle.status === 'NOT_STARTED');
}

function displayRow(bundlesFilter, bundle) {
  return !(bundlesFilter.isSearchActive) ||
   bundle.id in bundlesFilter.searchResults.bundlesMatching;
}

function getBundleExportInfo(bundle, savedToHistory) {
  return savedToHistory ? savedToHistory[bundle.id] : null;
}

function onOpenLink(event, url) {
  event.preventDefault();
  event.stopPropagation();
  shell.openExternal(url);
}

function openInFolder(event, bundle, savedToHistory) {
  stopPropagation(event);
  const bundleSavedToInfo = getBundleExportInfo(bundle, savedToHistory);
  if (bundleSavedToInfo) {
    const { folderName } = bundleSavedToInfo;
    shell.openItem(folderName);
  }
}

function stopPropagation(event) {
  event.stopPropagation();
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
