import React, { Component } from 'react';
import fs from 'fs-extra';
import sort from 'fast-sort';
import upath from 'upath';
import md5File from 'md5-file/promise';
import recursiveReadDir from 'recursive-readdir';
import CircularProgress from '@material-ui/core/CircularProgress';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import OpenInNew from '@material-ui/icons/OpenInNew';
import Link from '@material-ui/icons/Link';
import FileDownload from '@material-ui/icons/CloudDownloadOutlined';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import path from 'path';
import { findChunks } from 'highlight-words-core';
import { closeResourceManager,
  getManifestResources, addManifestResources, checkPublicationsHealth
} from '../actions/bundleManageResources.actions';
import { downloadResources, getEntryRevisions, createBundleFromDBL, selectBundleEntryRevision } from '../actions/bundle.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';
import { utilities } from '../utils/utilities';
import { bundleService } from '../services/bundle.service';
import { ux } from '../utils/ux';

const { dialog } = require('electron').remote;
const { shell } = require('electron');

const NEED_CONTAINER = '/?';

type Props = {
  classes: {},
  open: boolean,
  loading: boolean,
  progress: number,
  bundleId: ?string,
  bundlesById: ?{},
  origBundle: {},
  mode: string,
  showMetadataFile: ?string,
  manifestResources: [],
  entryRevisions: [],
  columnConfig: [],
  isOkToAddFiles: boolean,
  publicationsHealthMessage: ?string,
  publicationsHealthSuccessMessage: ?string,
  wizardsResults: ?{},
  goFixPublications: ?() => {},
  entryPageUrl: string,
  closeResourceManager: () => {},
  openMetadataFile: () => {},
  getManifestResources: () => {},
  getEntryRevisions: () => {},
  downloadResources: () => {},
  addManifestResources: () => {},
  checkPublicationsHealth: () => {},
  createBundleFromDBL: () => {},
  selectBundleEntryRevision: () => {}
};

function createUpdatedTotalResources(origTotalResources, filePath, updateFunc) {
  return origTotalResources.map(r => (r.id === filePath ? { ...r, ...updateFunc(r) } : r));
}

function formatBytesByKbs(bytes) {
  return (Math.round(Number(bytes) / 1024)).toLocaleString();
}

function formatContainer(containerInput) {
  const trimmed = containerInput.trim();
  if (trimmed === '' || trimmed === '/' || trimmed === '.') {
    return '/';
  }
  const prefix = containerInput[0] !== '/' ? '/' : '';
  const postfix = containerInput.slice(-1) !== '/' ? '/' : '';
  return `${prefix}${containerInput}${postfix}`;
}

function formatUriForApi(resource) {
  const { container, name } = resource;
  return `${container.substr(1)}${name}`;
}

function ignoreHiddenFunc(file, stats) {
  // `file` is the path to the file, and `stats` is an `fs.Stats`
  // object returned from `fs.lstat()`.
  // return stats.isDirectory() && path.basename(file) == "test";
  if (!stats.isFile()) {
    return false;
  }
  // const stat = winattr.getSync(upath.normalizeSafe(file));
  try {
    // currently crashes due to this issue: https://github.com/stevenvachon/winattr/issues/4
    /*
    When building using electron-builder, the hostscript.js file will be put in a .asar file,
    which is not readably by cscript.exe, which will lead to an exception in a json.parse call.

    To fix this, you can install hazardous and add
    require('hazardous');
    to the top of
    winattr/lib/shell/index.js (before requiring the path).

    Then add
    "asar": true, "asarUnpack": ["node_modules/winattr/lib/shell/hostscript.js"],
    to you package.json and it is fixed.
     */
    // in dev __dirname == / (see https://github.com/webpack/webpack/issues/1599)
    // return hidefile.isHiddenSync(upath.normalizeSafe(file));
  } catch (error) {
    // console.log(error);
  }
  return false;
}

function createResourceData(manifestResourceRaw, fileStoreInfo) {
  const { uri = '', checksum = '', size: sizeRaw = 0, mimeType = '' } = manifestResourceRaw;
  const container = formatContainer(upath.normalizeTrim(path.dirname(uri)));
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = formatBytesByKbs(sizeRaw);
  const id = uri;
  const status = fileStoreInfo ? 'stored' : '';
  const disabled = false; /* mode === 'addFiles' ? status !== 'add?' : status === 'stored'; */
  return {
    id, uri, status, container, name, mimeType, size, checksum, disabled
  };
}

function createAddedResource(fullToRelativePaths) {
  return (filePath) => {
    const fileName = path.basename(filePath);
    const relativePath = fullToRelativePaths ? upath.normalizeTrim(fullToRelativePaths[filePath]) : '';
    const relativeFolder = formatContainer(path.dirname(relativePath));
    const [id, uri, name] = [filePath, fileName, fileName];
    return {
      id, uri, status: 'add?', mimeType: '', container: relativeFolder || NEED_CONTAINER, relativeFolder, name, size: 0, checksum: '', disabled: false
    };
  };
}

function isNumeric(columnName) {
  return ['size', 'revision', 'stored', 'manifest'].includes(columnName);
}

function getLabel(columnName) {
  return ['size'].includes(columnName) ? 'size (kb)' : null;
}

const secondarySorts = ['container', 'name', 'status'];

function mapColumns(columns) {
  return Object.keys(columns)
    .map(c => ({ name: c, type: isNumeric(c) ? 'numeric' : 'string', label: getLabel(c) }));
}

function createColumnConfig(mode) {
  if (mode === 'revisions') {
    const { id, href, localBundle, disabled, ...columns } = createRevisionData();
    return mapColumns(columns);
  }
  const { id, uri, disabled, ...columns } = createResourceData({}, {}, 'ignore');
  return mapColumns(columns);
}

const getAllManifestResources = (state) => state.bundleManageResources.manifestResources || {};
const getMode = (state) => state.bundleManageResources.mode;
const getBundleId = (state, props) => props.match.params.bundleId;
const getAllEntryRevisions = (state) => state.bundles.allEntryRevisions || {};
const getBundlesById = (state) => state.bundles.addedByBundleIds || {};

function getOrDefault(obj, prop, defaultValue) {
  if (!obj) {
    return defaultValue;
  }
  return obj[prop] || defaultValue;
}

const emptyBundleManifestResources = { rawManifestResources: {}, storedFiles: {} };

const makeGetManifestResourcesData = () => createSelector(
  [getAllManifestResources, getMode, getBundleId],
  (manifestResources, mode, bundleId) => {
    const bundleManifestResources = getOrDefault(
      manifestResources,
      bundleId,
      emptyBundleManifestResources
    );
    const { rawManifestResources, storedFiles } = bundleManifestResources;
    return Object.values(rawManifestResources)
      .map(r => createResourceData(r, storedFiles[r.uri], mode));
  }
);

/*
  {
  "archivist": "B68BB7E4F225974EC823",
  "comments": "Small bundle to test uploading",
  "created_on": "Mon, 12 Nov 2018 16:30:26 GMT",
  "href": "http://api-demo.thedigitalbiblelibrary.org/api/entries/2881c78491b2f8cf/revisions/13",
  "revision": 13,
  "version": "2.1"
  },
      { name: 'created_on', type: 'date', label: 'Created' },
      { name: 'revision', type: 'numeric', label: 'Rev #' },
      { name: 'stored', type: 'numeric', label: '# Stored' },
      { name: 'manifest', type: 'numeric', label: '# Manifest' },
      { name: 'archivist', type: 'string', label: 'Archivist' },
      { name: 'comments', type: 'string', label: 'Comments' }
 */
function createRevisionData(entryRevision, localEntryBundle, bundleManifestResources, disabled) {
  /* eslint-disable camelcase */
  const {
    created_on = '',
    revision = '0',
    version = '',
    archivist = '',
    comments = '',
    href = '',
  } = entryRevision || {};
  const id = href;
  const is_on_disk = Boolean(Object.keys(localEntryBundle || {}).length);
  const localBundle = localEntryBundle || null;
  const { storedFiles = {}, rawManifestResources = {} } = bundleManifestResources || {};
  const storedFromManifest = Object.values(rawManifestResources).filter(r => r.uri in storedFiles);
  const stored = is_on_disk ? storedFromManifest.length : '';
  const manifest = is_on_disk ? Object.values(rawManifestResources).length : '';
  return {
    disabled, id, href, localBundle, created_on, revision, version, archivist, comments, stored, manifest
  };
}

function findLocalEntryBundles(bundlesById, dblId) {
  return Object.values(bundlesById).filter(b => b.dblId === dblId);
}

const makeGetEntryRevisionsData = () => createSelector(
  [getAllEntryRevisions, getAllManifestResources, getBundlesById, getBundleId],
  (allEntryRevisions, manifestResources, bundlesById, bundleId) => {
    const bundle = bundlesById[bundleId];
    const { dblId } = bundle;
    const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
    const entryRevisions = allEntryRevisions[dblId] || {};
    const entryRevData = Object.values(entryRevisions)
      .map(entryRevision => {
        const revision = `${entryRevision.revision}`;
        const localEntryBundle = localEntryBundles.find(b => b.revision === revision);
        const { id: localBundleId } = localEntryBundle || {};
        const { [localBundleId]: bundleManifestResources = [] } = manifestResources;
        const disabled = bundleId === localBundleId || !entryRevision.version.startsWith('2.');
        return createRevisionData(entryRevision, localEntryBundle, bundleManifestResources, disabled);
      });
    const draftData = Object.values(localEntryBundles).filter(localBundle => [0, '0'].includes(localBundle.revision)).map(localEntryBundle => {
      const { id: localBundleId } = localEntryBundle || {};
      const { [localBundleId]: bundleManifestResources = [] } = manifestResources;
      const revision = ux.getFormattedRevision(localEntryBundle, '');
      const mockEntryRevision = {
        created_on: localEntryBundle.raw.store.created,
        revision,
        version: '2.x',
        archivist: '',
        comments: localEntryBundle.raw.metadata.comments,
        href: '',
      };
      return createRevisionData(mockEntryRevision, localEntryBundle, bundleManifestResources, bundleId === localBundleId);
    });
    return [...entryRevData, ...draftData];
  }
);

const getDblBaseUrl = (state) => state.dblDotLocalConfig.dblBaseUrl;
const makeGetEntryPageUrl = () => createSelector(
  [getDblBaseUrl, getBundlesById, getBundleId],
  (dblBaseUrl, bundlesById, bundleId) => {
    const origBundle = bundlesById[bundleId];
    const { dblId, revision, parent } = origBundle;
    const revisionNum = bundleService.getRevisionOrParentRevision(dblId, revision, parent);
    const revisionQuery = revisionNum ? `&revision=${revisionNum}` : '';
    const url = `${dblBaseUrl}/entry?id=${dblId}${revisionQuery}`;
    return url;
  }
);


function mapStateToProps(state, props) {
  const { bundleEditMetadata, bundleManageResources } = state;
  const {
    publicationsHealth, progress = 100, loading = false, fetchingMetadata = false
  } = bundleManageResources;
  const {
    errorMessage: publicationsHealthMessage,
    goFix: goFixPublications,
    message: publicationsHealthSuccessMessage,
    wizardsResults,
  } = publicationsHealth || {};
  const { bundleId, mode } = props.match.params;
  const { showMetadataFile } = bundleEditMetadata;
  const columnConfig = createColumnConfig(mode);
  const getManifestResourceData = makeGetManifestResourcesData();
  const bundlesById = getBundlesById(state);
  const getEntryRevisionsData = makeGetEntryRevisionsData();
  const origBundle = bundleId ? bundlesById[bundleId] : {};
  const getEntryPageUrl = makeGetEntryPageUrl();
  return {
    open: Boolean(bundleId),
    loading: loading || fetchingMetadata,
    progress,
    bundleId,
    bundlesById,
    origBundle,
    mode,
    showMetadataFile,
    manifestResources: getManifestResourceData(state, props),
    entryRevisions: mode === 'revisions' ? getEntryRevisionsData(state, props) : [],
    columnConfig,
    isOkToAddFiles: !publicationsHealthMessage,
    publicationsHealthMessage,
    goFixPublications,
    publicationsHealthSuccessMessage,
    wizardsResults,
    entryPageUrl: getEntryPageUrl(state, props),
  };
}

const mapDispatchToProps = {
  closeResourceManager,
  openMetadataFile,
  getManifestResources,
  getEntryRevisions,
  downloadResources,
  addManifestResources,
  checkPublicationsHealth,
  createBundleFromDBL,
  selectBundleEntryRevision
};

const materialStyles = theme => ({
  appBar: {
    position: 'sticky'
  },
  errorBar: {
    color: theme.palette.secondary.light,
  },
  successBar: {
    color: theme.palette.primary.light,
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
  button: {
    margin: theme.spacing.unit,
  },
  input: {
    display: 'none',
  },
  buttonProgress: {
    color: theme.palette.secondary.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -23,
  },
});

function mapSuggestions(suggestions) {
  return suggestions.map(suggestion => ({ label: suggestion }));
}

class ManageBundleManifestResourcesDialog extends Component<Props> {
  props: Props;
  state = {
    selectedIds: [],
    addedFilePaths: [],
    selectAll: ['download'].includes(this.props.mode)
  }

  componentDidMount() {
    const { bundleId, mode } = this.props;
    if (mode === 'revisions') {
      this.props.getEntryRevisions(bundleId);
      const { bundlesById } = this.props;
      const { [bundleId]: bundle } = bundlesById;
      const { dblId } = bundle;
      const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
      localEntryBundles.forEach(localBundle => {
        this.props.getManifestResources(localBundle.id);
      });
      return;
    }
    this.props.getManifestResources(bundleId);
    if (this.isAddFilesMode()) {
      this.props.checkPublicationsHealth(bundleId);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.progress !== this.props.progress &&
      (nextProps.progress === 100)) {
      const { bundleId } = this.props;
      this.props.getManifestResources(bundleId);
    }
    if ((nextProps.manifestResources.length !== this.props.manifestResources) ||
      (this.props.mode === 'revisions' && nextProps.entryRevisions !== this.entryRevisions)) {
      this.updateTableData(nextProps);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
  }

  updateTableData = (props) => {
    const tableData = props.mode === 'revisions' ? props.entryRevisions : props.manifestResources;
    this.setState({ tableData });
  }

  handleDownload = () => {
    const { selectedIds = [] } = this.state;
    const { bundleId } = this.props;
    this.props.downloadResources(bundleId, selectedIds);
    this.handleClose();
  }

  handleDownloadRevision = () => {
    const { origBundle } = this.props;
    const { selected } = this.getSelectedLocalBundle();
    this.props.createBundleFromDBL(origBundle.dblId, selected.revision, origBundle.license);
  }

  handleSwitchToRevision = () => {
    const { localBundle } = this.getSelectedLocalBundle();
    this.props.selectBundleEntryRevision(localBundle);
    this.handleClose();
  }

  handleAddFiles = () => {
    const { bundleId } = this.props;
    const selectedResources = this.getSelectedRowData();
    const filesToContainers = selectedResources.reduce((acc, selectedResource) =>
      ({ ...acc, [selectedResource.id]: formatUriForApi(selectedResource) }), {});
    this.props.addManifestResources(bundleId, filesToContainers);
    this.setState({ selectedIds: [] });
  }

  handleClose = () => {
    this.props.closeResourceManager(this.props.bundleId);
  };

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  handleGoFixError = () => {
    this.props.goFixPublications();
  }

  onSelectedIds = (selectedIds) => {
    this.setState({ selectedIds, selectAll: false });
  }

  getSelectedCountMessage = (shouldDisableOk) => {
    const { selectedIds = [], selectAll } = this.state;
    if (shouldDisableOk()) {
      return '';
    }
    if (selectAll) {
      return ' (All)';
    }
    return ` (${selectedIds.length})`;
  }

  getSelectedLocalBundle = () => {
    if (this.isNothingSelected()) {
      return false;
    }
    const [selected] = this.getSelectedRowData();
    const { localBundle } = selected;
    return { selected, localBundle };
  };

  getRevisionsOkButtonLabel = () => {
    const label = 'Switch to';
    if (this.isNothingSelected()) {
      return `${label}`;
    }
    const { selected, localBundle } = this.getSelectedLocalBundle();
    if (localBundle) {
      return `${label} Rev ${selected.revision}`;
    }
    return `Fetch Rev ${selected.revision}`;
  }

  isNothingSelected = () => {
    const { selectedIds = [], selectAll } = this.state;
    return !selectAll && selectedIds.length === 0;
  }

  shouldDisableDownload = () => this.isNothingSelected();

  shouldDisableAddFiles = () => {
    const { selectedIds = [] } = this.state;
    const { isOkToAddFiles = false, loading = false } = this.props;
    return loading ||
      selectedIds.length === 0 || !isOkToAddFiles || this.hasAnySelectedUnassignedContainers();
  }

  getUpdatedTotalResources(filePath, update) {
    const { tableData } = this.state;
    return createUpdatedTotalResources(tableData, filePath, () => update);
  }

  updateAddedResourcesWithFileStats = (newlyAddedFilePaths) => () => {
    newlyAddedFilePaths.forEach(async filePath => {
      const stats = await fs.stat(filePath);
      const { size: sizeRaw } = stats;
      const size = formatBytesByKbs(sizeRaw);
      const checksum = size < 268435456 ? await md5File(filePath) : '(too expensive)';
      const tableData = this.getUpdatedTotalResources(filePath, { size, checksum });
      this.setState({ tableData });
    });
  }

  getUpdateSelectedResourcesContainers = (newContainer) => {
    const { tableData: origTotalResources, selectedIds } = this.state;
    const tableData = selectedIds.reduce((acc, filePath) => {
      const container = formatContainer(newContainer);
      const updatedTotalResources = createUpdatedTotalResources(
        acc,
        filePath,
        (resource) => ({
          container: (resource.relativeFolder ?
            formatContainer(upath.joinSafe(container, resource.relativeFolder)) :
            container)
        })
      );
      return updatedTotalResources;
    }, origTotalResources);
    return tableData;
  }

  updateSelectedResourcesContainersSetState = (newContainer) => {
    const tableData = this.getUpdateSelectedResourcesContainers(newContainer);
    this.setState({ tableData });
  }

  handleAddByFile = () => {
    const newAddedFilePaths = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    // console.log(newAddedFilePaths);
    if (!newAddedFilePaths) {
      return;
    }
    this.setAddedFilePathsAndSelectAll(newAddedFilePaths);
  };

  setAddedFilePathsAndSelectAll = (newAddedFilePaths, fullToRelativePaths) => {
    const addedFilePaths = this.getUnionWithAddedFiles(newAddedFilePaths);
    const selectedIds = this.getUnionWithSelectedIds(addedFilePaths);
    this.setState(
      { addedFilePaths, selectedIds },
      this.updateTotalResources(newAddedFilePaths, fullToRelativePaths)
    );
    // this.setState({ selectAll: true });
  };

  getUnionWithAddedFiles = (newAddedFilePaths) => {
    const { addedFilePaths: origAddedFilePaths = [] } = this.state;
    const addedFilePaths = utilities.union(origAddedFilePaths, newAddedFilePaths);
    return addedFilePaths;
  }

  getUnionWithSelectedIds = (addedFilePaths) => {
    const { selectedIds: origSelectedIds } = this.state;
    const selectedIds = utilities.union(origSelectedIds, addedFilePaths);
    return selectedIds;
  }

  handleAddByFolder = async () => {
    const folderPaths = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] });
    if (!folderPaths) {
      return;
    }
    const parentDir = path.resolve(folderPaths[0], '..');
    const knownUnwantedFiles = ['metadata.xml', 'desktop.ini', 'thumbs.db', '.DS_Store', ignoreHiddenFunc];
    const readAllDirs = folderPaths.map(folder => recursiveReadDir(folder, knownUnwantedFiles)
      .then(fullPaths => ({
        folder,
        fullPaths,
        fullToRelativePaths: fullPaths.reduce((acc, filePath) =>
          ({ ...acc, [filePath]: filePath.substr(parentDir.length) }), {})
      })));
    const allFilePaths = await Promise.all(readAllDirs);
    const allFullToRelativePaths = allFilePaths.reduce((acc, info) =>
      ({ ...acc, ...info.fullToRelativePaths }), {});
    const allFullPaths = Object.keys(allFullToRelativePaths);
    // console.log(allFullPaths);
    this.setAddedFilePathsAndSelectAll(allFullPaths, allFullToRelativePaths);
  };

  updateTotalResources = (newAddedFilePaths, fullToRelativePaths) => () => {
    const { manifestResources } = this.props;
    const { tableData = manifestResources } = this.state;
    const otherResources = tableData.filter(r => !newAddedFilePaths.includes(r.id));
    const newlyAddedResources = newAddedFilePaths.map(createAddedResource(fullToRelativePaths));
    this.setState(
      { tableData: [...otherResources, ...newlyAddedResources] },
      this.updateAddedResourcesWithFileStats(newAddedFilePaths)
    );
  }

  isAddFilesMode = () => this.props.mode === 'addFiles';
  isDownloadMode = () => this.props.mode === 'download';

  modeUi = () => {
    const { mode, classes } = this.props;
    switch (mode) {
      case 'download':
        return {
          mode,
          appBar:
          {
            title: 'Download resources',
            OkButtonProps: {
              color: 'inherit',
              onClick: this.handleDownload,
              disabled: this.shouldDisableDownload()
            },
            OkButtonLabel: `Download${this.getSelectedCountMessage(this.shouldDisableDownload)}`,
            OkButtonIcon: <FileDownload className={classNames(classes.leftIcon)} />,
          }
        };
      case 'addFiles':
        return {
          mode,
          appBar: {
            title: 'Manage resources',
            OkButtonProps: {
              color: 'secondary',
              variant: 'contained',
              onClick: this.handleAddFiles,
              disabled: this.shouldDisableAddFiles()
            },
            OkButtonLabel: `Add${this.getSelectedCountMessage(this.shouldDisableAddFiles)}`,
            OkButtonIcon: <CheckIcon className={classNames(classes.leftIcon)} />
          }
        };
      case 'revisions': {
        const hasLocalBundle = Boolean(this.getSelectedLocalBundle().localBundle);
        return {
          mode,
          appBar: {
            title: 'Revisions',
            OkButtonProps: {
              color: hasLocalBundle ? 'inherit' : 'secondary',
              variant: hasLocalBundle ? 'text' : 'contained',
              onClick: hasLocalBundle ? this.handleSwitchToRevision : this.handleDownloadRevision,
              disabled: this.isNothingSelected() || this.props.loading
            },
            OkButtonLabel: `${this.getRevisionsOkButtonLabel()}`,
            OkButtonIcon: <CheckIcon className={classNames(classes.leftIcon)} />,
          }
        };
      }
      default:
        return { appBar: { title: '', OkButtonLabel: '', OkButtonIcon: (null) } };
    }
  }

  getHandleAddByFile = () => (
    (!this.props.loading && this.isAddFilesMode() && this.props.isOkToAddFiles) ? this.handleAddByFile : undefined
  )

  getHandleAddByFolder = () => (
    (!this.props.loading && this.isAddFilesMode() && this.props.isOkToAddFiles) ? this.handleAddByFolder : undefined
  )

  getAllSuggestions = (tableData) => {
    const { mode } = this.props;
    if (mode !== 'addFiles') {
      return null;
    }
    return mapSuggestions(sort(utilities.union(tableData
      .filter(r => r.container !== NEED_CONTAINER)
      .map(r => r.container), ['/'])).asc());
  }

  getSuggestions = (value, reason) => {
    // console.log({ getSuggestions: true, value, reason });
    const inputValue = value ? value.trim() : null;
    const updatedResources = this.getUpdateSelectedResourcesContainers(value || '');
    if (!inputValue) {
      return this.getAllSuggestions(updatedResources);
    }
    return this.getAllSuggestions(updatedResources).filter(suggestion => {
      const findChunkOptions = {
        autoEscape: true,
        searchWords: [inputValue],
        textToHighlight: suggestion.label
      };
      const chunksForSuggestion = findChunks(findChunkOptions);
      return chunksForSuggestion.length > 0;
    });
  }

  getSelectedRowData = () => {
    const { manifestResources } = this.props;
    const { tableData = manifestResources, selectedIds } = this.state;
    const selectedIdSet = new Set(selectedIds);
    return tableData.filter(r => selectedIdSet.has(r.id));
  }

  hasAnySelectedUnassignedContainers = () => {
    const { manifestResources } = this.props;
    const { tableData = manifestResources, selectedIds } = this.state;
    const selectedIdSet = new Set(selectedIds);
    const resourcesWithUnassignedContainers =
      tableData
        .filter(r => (r.container === NEED_CONTAINER));
    return resourcesWithUnassignedContainers
      .some(r => selectedIdSet.has(r.id));
  }

  handleAutosuggestInputChanged = (newValue, method) => {
    // console.log({ handleAutosuggestInputChanged: true, newValue, method });
    if (newValue === undefined) {
      return;
    }
    this.updateSelectedResourcesContainersSetState(newValue.trim());
  }

  renderWizardsResults = () => {
    const { wizardsResults } = this.props;
    if (!wizardsResults) {
      return (null);
    }
    return Object.entries(wizardsResults).map(([wizardName, results]) =>
      (
        <React.Fragment key="frag">
          <Typography key={`${wizardName}-description`} variant="subheading" color="inherit" paragraph>
            • <b>{results.description}</b> ({wizardName}):
          </Typography>
          <Typography key={`${wizardName}-documentation`} variant="subheading" color="inherit" style={{ marginLeft: '20px' }} paragraph>
            {results.documentation}
          </Typography>
        </React.Fragment>
      ));
  }

  renderTable = () => {
    const {
      columnConfig, manifestResources, mode
    } = this.props;
    const { selectAll, tableData = manifestResources } = this.state;
    switch (mode) {
      case 'download': {
        return (<EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
          secondarySorts={secondarySorts}
          defaultOrderBy="container"
          onSelectedRowIds={this.onSelectedIds}
          multiSelections
          selectAll={selectAll}
        />);
      }
      case 'revisions': {
        return (<EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
          customSorts={{ revision: rData => (rData.localBundle ? sortLocalRevisions(rData.localBundle) : parseInt(rData.revision, 10)) }}
          secondarySorts={['revision']}
          defaultOrderBy="revision"
          orderDirection="desc"
          onSelectedRowIds={this.onSelectedIds}
          selectAll={false}
        />);
      }
      case 'addFiles': {
        return (<EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
          secondarySorts={secondarySorts}
          defaultOrderBy="container"
          onSelectedRowIds={this.onSelectedIds}
          multiSelections
          selectAll={selectAll}
          handleAddByFile={this.getHandleAddByFile()}
          handleAddByFolder={this.getHandleAddByFolder()}
          getSuggestions={this.getSuggestions}
          onAutosuggestInputChanged={this.handleAutosuggestInputChanged}
        />);
      }
      default: {
        return (<EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
        />);
      }
    }
  }

  onOpenDBLEntryLink = (event) => {
    utilities.onOpenLink(this.props.entryPageUrl)(event);
  }

  render() {
    const {
      classes, open, origBundle = {},
      publicationsHealthMessage = '', publicationsHealthSuccessMessage, loading, progress
    } = this.props;
    const { displayAs = {} } = origBundle;
    const { languageAndCountry, name, revision } = displayAs;
    const modeUi = this.modeUi();
    const isAddFilesMode = this.isAddFilesMode();
    return (
      <Zoom in={open}>
        <div>
          <AppBar className={classes.appBar}>
            <Toolbar className={classes.toolBar}>
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit">
                {modeUi.appBar.title}: <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Tooltip title={this.props.entryPageUrl}>
                <Button color="inherit" onClick={this.onOpenDBLEntryLink}>
                  <Link className={classNames(classes.leftIcon, classes.iconSmall)} />
                  {revision}
                </Button>
              </Tooltip>
              <div className={classes.flex} />
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              <Button
                key="btnOk"
                {...modeUi.appBar.OkButtonProps}
              >
                {modeUi.appBar.OkButtonIcon}
                {modeUi.appBar.OkButtonLabel}
                {loading &&
                <CircularProgress
                  className={classes.buttonProgress}
                  size={50}
                  color="secondary"
                  variant="indeterminate"
                  value={progress}
                />}
              </Button>
            </Toolbar>
          </AppBar>
          {isAddFilesMode && publicationsHealthMessage &&
            <Toolbar className={classes.errorBar}>
              <Typography variant="subheading" color="inherit">
                {publicationsHealthMessage}
              </Typography>
              <div style={{ paddingLeft: '10px' }} />
              <Button
                key="btnGoEdit"
                color="secondary"
                variant="contained"
                onClick={this.handleGoFixError}
              >Go Fix
              </Button>
            </Toolbar>
          }
          {!loading && isAddFilesMode && publicationsHealthSuccessMessage &&
            <Card className={classes.successBar} raised>
              <CardContent>
                <Typography key="pubhealthSuccessMessage" variant="subheading" color="inherit" gutterBottom>
                  {publicationsHealthSuccessMessage}
                </Typography>
                {this.renderWizardsResults()}
              </CardContent>
            </Card>
          }
          {this.renderTable()}
        </div>
      </Zoom>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'ManageBundleManifestResourcesDialog' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(ManageBundleManifestResourcesDialog);

function sortLocalRevisions(bundle) {
  const effectiveRevision =
    bundleService.getRevisionOrParentRevision(bundle.dblId, bundle.revision, bundle.parent);
  if (bundle.revision === '0') {
    return effectiveRevision + 10000;
  }
  return effectiveRevision;
}
