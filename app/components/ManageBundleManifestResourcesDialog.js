import React, { Component } from 'react';
import fs from 'fs-extra';
import sort from 'fast-sort';
import upath from 'upath';
import md5File from 'md5-file/promise';
import recursiveReadDir from 'recursive-readdir';
import { List, Set } from 'immutable';
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
import FolderOpen from '@material-ui/icons/FolderOpen';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Delete from '@material-ui/icons/Delete';
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
  getManifestResources, addManifestResources, checkPublicationsHealth, deleteManifestResources,
  getMapperReport
} from '../actions/bundleManageResources.actions';
import { selectItemsToPaste, pasteItems, clearClipboard } from '../actions/clipboard.actions';
import { downloadResources, removeResources, getEntryRevisions, createBundleFromDBL, selectBundleEntryRevision } from '../actions/bundle.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';
import EnhancedTableToolbar from './EnhancedTableToolbar';
import { utilities } from '../utils/utilities';
import { bundleService } from '../services/bundle.service';
import { ux } from '../utils/ux';
import ConfirmButton from '../components/ConfirmButton';
import CopyForPasteButton from './CopyForPasteButton';
import PasteButton from './PasteButton';
import MapperTable from '../components/MapperTable';

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
  previousEntryRevision: ?{},
  bundlePreviousRevision: ?{},
  previousManifestResources: {},
  entryRevisions: [],
  columnConfig: [],
  isOkToAddFiles: boolean,
  isOkToRemoveFromManifest: boolean,
  publicationsHealthMessage: ?string,
  publicationsHealthSuccessMessage: ?string,
  wizardsResults: ?{},
  mapperInputData: ?{},
  selectedIdsInputConverters: ?{},
  goFixPublications: ?() => {},
  entryPageUrl: string,
  selectedItemsToPaste: ?{},
  closeResourceManager: () => {},
  openMetadataFile: () => {},
  getManifestResources: () => {},
  getEntryRevisions: () => {},
  downloadResources: () => {},
  addManifestResources: () => {},
  deleteManifestResources: () => {},
  checkPublicationsHealth: () => {},
  createBundleFromDBL: () => {},
  selectBundleEntryRevision: () => {},
  removeResources: () => {},
  getMapperReport: () => {},
  selectItemsToPaste: () => {},
  pasteItems: () => {},
  clearClipboard: () => {}
};

const addStatus = 'add?';
const addAndOverwrite = 'add (revise)?';
const addAndConvert = 'add / convert?';
const addAndConvertOverwrite = 'add / convert (revise)?';
const addStatuses = [addStatus, addAndOverwrite, addAndConvert, addAndConvertOverwrite];

function hasResourceDataChanged(prevManifestResources, currentManifestResources) {
  if (prevManifestResources === currentManifestResources) {
    return false;
  }
  if (prevManifestResources.length !== currentManifestResources.length) {
    return true;
  }
  const sortedCurrent = sort(currentManifestResources).asc('id');
  const sortedPrev = sort(prevManifestResources).asc('id');
  // id, uri, stored, status, container, name, mimeType, size, checksum, disabled
  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < currentManifestResources.length; index++) {
    const currentResource = sortedCurrent[index];
    const prevResource = sortedPrev[index];
    if (Object.entries(currentResource).some(([prop, value]) => value !== prevResource[prop])) {
      return true;
    }
  }
  return false;
}

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
  return formatUri(container, name);
}

function formatUri(container, name) {
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

const [statusStored, statusAdded] = ['stored', 'added'];

function getStatusResourceData(
  rawManifestResource,
  isStored, isModifiedFromPrev, previousManifestResource,
  { previousEntryRevision, bundlePreviousRevision, previousManifestResources }
) {
  if (rawManifestResource === previousManifestResource) {
    return 'deleted';
  }
  if (isModifiedFromPrev) {
    return 'revised';
  }
  if (previousEntryRevision && bundlePreviousRevision &&
    Object.keys(previousManifestResources.rawManifestResources).length &&
    !previousManifestResource) {
    return statusAdded;
  }
  return isStored ? statusStored : 'manifest';
}

function createResourceData(
  bundle, manifestResourceRaw, fileStoreInfo, prevManifestResource,
  { previousEntryRevision, bundlePreviousRevision, previousManifestResources } = {
    previousManifestResources: emptyBundleManifestResources
  }
) {
  const {
    uri = '', checksum = '', size: sizeRaw = 0, mimeType = ''
  } = manifestResourceRaw;
  const container = formatContainer(upath.normalizeTrim(path.dirname(uri)));
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = formatBytesByKbs(sizeRaw);
  const id = uri;
  const isModifiedFromPrev = prevManifestResource ?
    prevManifestResource.checksum !== checksum : false;
  const isPrevResource = manifestResourceRaw === prevManifestResource;
  const isDraft = bundle ? bundle.status === 'DRAFT' : false;
  const isStored = Boolean(fileStoreInfo) && !isPrevResource;
  const stored = isStored ? '✓' : '';
  const status = getStatusResourceData(
    manifestResourceRaw,
    isStored, isModifiedFromPrev, prevManifestResource,
    { previousEntryRevision, bundlePreviousRevision, previousManifestResources }
  );
  const disabled = (isDraft && isModifiedFromPrev) || isPrevResource;
  return {
    id, uri, stored, status, container, name, mimeType, size, checksum, disabled
  };
}

function getAddStatus(uri, resourcesInParent, conversions = Set(), conversionOverwrites = Set()) {
  if (conversionOverwrites.has(uri)) {
    return addAndConvertOverwrite;
  }
  if (conversions.has(uri)) {
    return addAndConvert;
  }
  if (resourcesInParent.has(uri)) {
    return addAndOverwrite;
  }
  return addStatus;
}

function createAddedResource(
  fullToRelativePaths, resourcesInParent,
  conversions, conversionOverwrites
) {
  return (filePath) => {
    const fileName = path.basename(filePath);
    const relativePath = fullToRelativePaths ? upath.normalizeTrim(fullToRelativePaths[filePath]) : '';
    const relativeFolder = formatContainer(path.dirname(relativePath));
    const uri = formatUri(relativeFolder, fileName);
    const [id, name] = [filePath, fileName];
    const status = getAddStatus(uri, resourcesInParent, conversions, conversionOverwrites);
    return {
      id, uri, status, mimeType: '', container: relativeFolder || NEED_CONTAINER, relativeFolder, name, size: 0, checksum: '', disabled: false
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

function createColumnConfig(mode) {
  if (mode === 'revisions') {
    const { id, href, localBundle, disabled, ...columns } = createRevisionData();
    return ux.mapColumns(columns, isNumeric, getLabel);
  }
  const { id, uri, disabled, ...columns } = createResourceData(null, {}, {});
  return ux.mapColumns(columns, isNumeric, getLabel);
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
  [getAllManifestResources, getMode, getBundleId, getBundlesById, getAllEntryRevisions],
  (manifestResources, mode, bundleId, bundlesById, allEntryRevisions) => {
    const bundleManifestResources = getOrDefault(
      manifestResources,
      bundleId,
      emptyBundleManifestResources
    );
    const { rawManifestResources, storedFiles } = bundleManifestResources;
    const { previousEntryRevision, bundlePreviousRevision, previousManifestResources } =
      getPreviousRevisionManifestResources(bundleId, bundlesById, manifestResources, allEntryRevisions);
    const bundleManifestResourcesData = Object.values(rawManifestResources)
      .map(r => createResourceData(
        bundleId[bundlesById],
        r, storedFiles[r.uri],
        previousManifestResources.rawManifestResources[r.uri],
        { previousEntryRevision, bundlePreviousRevision, previousManifestResources }
      ));
    const bundleManifestResourceUris = getRawManifestResourceUris(bundleManifestResources);
    const { storedFiles: parentStoredFiles } = previousManifestResources;
    const deletedParentBundleResources =
      Object.values(previousManifestResources.rawManifestResources)
        .filter(pr => !bundleManifestResourceUris.has(pr.uri) &&
          Object.keys(rawManifestResources).length)
        .map(pr => createResourceData(null, pr, parentStoredFiles[pr.uri], pr));
    return [...bundleManifestResourcesData, ...deletedParentBundleResources];
  }
);


function getRawManifestResourceUris(manifestResources) {
  const rawManifestResourceUris =
    Set(Object.keys(manifestResources.rawManifestResources));
  return rawManifestResourceUris;
}

function getPrevEntryRevision(bundle, allEntryRevisions) {
  const { dblId, revision } = bundle;
  const entryRevisions = allEntryRevisions[dblId] || [];
  const prevEntryRevision = entryRevisions.find((entryRevision, index) => {
    const prevIndex = index - 1;
    if (prevIndex < 0) {
      return false;
    }
    const prev = entryRevisions[prevIndex];
    return revision === `${prev.revision}`;
  });
  return prevEntryRevision;
}

function getBundlePrevRevision(bundleId, bundlesById, allEntryRevisions) {
  const bundle = bundlesById[bundleId];
  const { dblId, parent } = bundle;
  if (parent && parent.dblId === dblId) {
    const bundleBundle = bundlesById[parent.bundleId];
    const entryRevisions = allEntryRevisions[dblId];
    return {
      bundlePreviousRevision: bundleBundle,
      previousEntryRevision: (entryRevisions || []).find(r => `${r.revision}` === bundleBundle.revision)
    };
  }
  const previousEntryRevision = getPrevEntryRevision(bundle, allEntryRevisions);
  const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
  const bundlePreviousRevision = previousEntryRevision ?
    localEntryBundles.find(b => b.revision === `${previousEntryRevision.revision}`) : null;
  return { bundlePreviousRevision, previousEntryRevision };
}

function getPreviousRevisionManifestResources(bundleId, bundlesById, manifestResources, allEntryRevisions) {
  const { previousEntryRevision, bundlePreviousRevision } =
    getBundlePrevRevision(bundleId, bundlesById, allEntryRevisions);
  const previousManifestResources = bundlePreviousRevision ?
    manifestResources[bundlePreviousRevision.id] || emptyBundleManifestResources :
    emptyBundleManifestResources;
  return { previousEntryRevision, bundlePreviousRevision, previousManifestResources };
}

const makeGetPrevManifestResources = () => createSelector(
  [getAllManifestResources, getBundleId, getBundlesById, getAllEntryRevisions],
  (manifestResources, bundleId, bundlesById, allEntryRevisions) =>
    getPreviousRevisionManifestResources(bundleId, bundlesById, manifestResources, allEntryRevisions)
);

const makeGetBundlePrevRevision = () => createSelector(
  [getAllEntryRevisions, getBundleId, getBundlesById],
  (allEntryRevisions, bundleId, bundlesById) =>
    getBundlePrevRevision(bundleId, bundlesById, allEntryRevisions)
);

const makeGetPrevEntryRevision = () => createSelector(
  [getAllEntryRevisions, getBundleId, getBundlesById],
  (allEntryRevisions, bundleId, bundlesById) =>
    getPrevEntryRevision(bundlesById[bundleId], allEntryRevisions)
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

function getIsCompatibleVersion(entryRevision) {
  return entryRevision.version.startsWith('2.');
}

const makeGetEntryRevisionsData = () => createSelector(
  [getAllEntryRevisions, getAllManifestResources, getBundlesById, getBundleId],
  (allEntryRevisions, manifestResources, bundlesById, bundleId) => {
    const bundle = bundlesById[bundleId];
    const { dblId } = bundle;
    const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
    const entryRevisions = allEntryRevisions[dblId] || [];
    const entryRevData = entryRevisions
      .map(entryRevision => {
        const revision = `${entryRevision.revision}`;
        const localEntryBundle = localEntryBundles.find(b => b.revision === revision);
        const { id: localBundleId } = localEntryBundle || {};
        const { [localBundleId]: bundleManifestResources = [] } = manifestResources;
        const disabled = bundleId === localBundleId || !getIsCompatibleVersion(entryRevision);
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
  const { bundleEditMetadata, bundleManageResources, clipboard } = state;
  const {
    publicationsHealth, progress = 100, loading = false,
    isStoreMode = false, fetchingMetadata = false,
    mapperReports = {}, selectedMappers = {}
  } = bundleManageResources;
  const { selectedItemsToPaste = {} } = clipboard;
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
  const getPrevManifestResources = makeGetPrevManifestResources();
  const bundlesById = getBundlesById(state);
  const getEntryRevisionsData = makeGetEntryRevisionsData();
  const origBundle = bundleId ? bundlesById[bundleId] : {};
  const getEntryPageUrl = makeGetEntryPageUrl();
  const {
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources
  } = (mode !== 'revisions' ? getPrevManifestResources(state, props) :
    { previousManifestResources: emptyBundleManifestResources });
  const { input: mapperInputData } = mapperReports;
  const { report: mapperReport = {} } = mapperInputData || {};
  const selectedIdsInputConverters =
    selectedMappers.input || Object.keys(mapperReport);
  return {
    open: Boolean(bundleId),
    loading: loading || fetchingMetadata || !isStoreMode,
    progress,
    bundleId,
    bundlesById,
    origBundle,
    mode,
    showMetadataFile,
    mapperInputData,
    selectedIdsInputConverters,
    manifestResources: getManifestResourceData(state, props),
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources,
    entryRevisions: mode === 'revisions' ? getEntryRevisionsData(state, props) : [],
    columnConfig,
    isOkToAddFiles: !publicationsHealthMessage,
    isOkToRemoveFromManifest: !publicationsHealthMessage,
    publicationsHealthMessage,
    goFixPublications,
    publicationsHealthSuccessMessage,
    wizardsResults,
    entryPageUrl: getEntryPageUrl(state, props),
    selectedItemsToPaste
  };
}

const mapDispatchToProps = {
  closeResourceManager,
  openMetadataFile,
  getManifestResources,
  getEntryRevisions,
  downloadResources,
  addManifestResources,
  deleteManifestResources,
  checkPublicationsHealth,
  createBundleFromDBL,
  selectBundleEntryRevision,
  removeResources,
  getMapperReport,
  selectItemsToPaste,
  pasteItems,
  clearClipboard
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
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
  }
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
    this.props.getEntryRevisions(bundleId);
    if (mode === 'revisions') {
      const { bundlesById } = this.props;
      const { [bundleId]: bundle } = bundlesById;
      const { dblId } = bundle;
      const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
      localEntryBundles.forEach(localBundle => {
        this.props.getManifestResources(localBundle.id);
      });
      return;
    } else if (this.props.bundlePreviousRevision) {
      this.props.getManifestResources(this.props.bundlePreviousRevision.id);
    }
    this.props.getManifestResources(bundleId);
    if (this.isModifyFilesMode()) {
      this.props.checkPublicationsHealth(bundleId);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.closing) {
      return;
    }
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
    if (this.props.progress !== prevProps.progress &&
      (this.props.progress === 100)) {
      const { bundleId } = this.props;
      this.props.getManifestResources(bundleId);
    }
    if (this.props.mode !== 'revisions') {
      if (!prevProps.previousEntryRevision &&
        this.props.previousEntryRevision && !this.props.bundlePreviousRevision &&
        getIsCompatibleVersion(this.props.previousEntryRevision)) {
        const { origBundle } = this.props;
        this.props.createBundleFromDBL(
          origBundle.dblId,
          this.props.previousEntryRevision.revision,
          origBundle.license
        );
      }
      if (!prevProps.bundlePreviousRevision && this.props.bundlePreviousRevision) {
        this.props.getManifestResources(this.props.bundlePreviousRevision.id);
      }
    }
    /* todo: the following do setState, which is unorthodox/anti-pattern */
    if (hasResourceDataChanged(prevProps.manifestResources, this.props.manifestResources) ||
      (this.props.mode === 'revisions' && this.props.entryRevisions !== prevProps.entryRevisions) ||
      !utilities.haveEqualKeys(this.props.previousManifestResources, prevProps.previousManifestResources)) {
      this.updateTableData(this.props);
    } else if (this.props.mapperInputData !== prevProps.mapperInputData ||
      this.props.selectedIdsInputConverters !== prevProps.selectedIdsInputConverters) {
      const tableData = this.getTableDataForAddedResources(
        this.state.addedFilePaths,
        this.state.fullToRelativePaths
      );
      this.updateTableAsIs(tableData);
    }
  }

  updateTableAsIs(tableData) {
    this.setState({ tableData });
  }

  /* todo: memoize tableData */
  updateTableData = (props) => {
    const tableData = props.mode === 'revisions' ? props.entryRevisions : props.manifestResources;
    const selectedIds = this.getSelectedIds(tableData, props.mode);
    this.setState({
      tableData, selectedIds, addedFilePaths: [], fullToRelativePaths: undefined
    }, this.getMapperReport);
  }

  getSelectedIds = (tableData, mode) => {
    const isDownloadMode = mode === 'download';
    const selectedIds = this.state.selectAll ?
      tableData.filter(row => !isDownloadMode || (!row.stored && !row.disabled)).map(row => row.id) :
      this.state.selectedIds.filter(id => tableData.some(row => row.id === id && !row.disabled));
    return selectedIds;
  }

  handleDownloadOrClean = () => {
    const {
      storedResources, manifestResources, inEffect
    } = this.getSelectedResourcesByStatus();
    const { bundleId } = this.props;
    const effectiveSelectedIds = inEffect.map(row => row.id);
    if (manifestResources === inEffect) {
      this.props.downloadResources(bundleId, effectiveSelectedIds);
      this.handleClose();
      return;
    }
    if (storedResources === inEffect) {
      this.props.removeResources(bundleId, storedResources.map(r => r.uri));
    }
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

  getSelectedResourcesByStatus = () => {
    const selectedResources = this.getSelectedRowData();
    const parentRawManifestResourceUris =
      getRawManifestResourceUris(this.props.previousManifestResources);
    const filteredResources
      = List(selectedResources).reduce(
        (acc, r) => {
          const resourceInParent = parentRawManifestResourceUris.has(r.uri);
          const resourcesInParent = resourceInParent ?
            acc.resourcesInParent.push(r) : acc.resourcesInParent;
          const discardableResources = !resourceInParent ?
            acc.discardableResources.push(r) : acc.discardableResources;
          if (r.status === 'revised') {
            return {
              ...acc,
              revisedResources: acc.revisedResources.push(r),
              discardableResources
            };
          } else if (r.stored) {
            return {
              ...acc,
              storedResources: acc.storedResources.push(r),
              resourcesInParent,
              discardableResources
            };
          } else if (addStatuses.includes(r.status)) {
            const toAddResources = acc.toAddResources.push(r);
            return { ...acc, toAddResources, resourcesInParent };
          } else if (!r.stored) {
            return {
              ...acc,
              manifestResources: acc.manifestResources.push(r),
              resourcesInParent,
              discardableResources
            };
          }
          return acc;
        },
        {
          revisedResources: List(),
          storedResources: List(),
          manifestResources: List(),
          toAddResources: List(),
          resourcesInParent: List(),
          discardableResources: List()
        }
      );
    const [revisedResources, storedResources, manifestResources, toAddResources,
      resourcesInParent, discardableResources] = [
      filteredResources.revisedResources.toArray(),
      filteredResources.storedResources.toArray(),
      filteredResources.manifestResources.toArray(),
      filteredResources.toAddResources.toArray(),
      filteredResources.resourcesInParent.toArray(),
      filteredResources.discardableResources.toArray()];
    const sortedByFilters =
      this.props.mode === 'download' ? [storedResources, manifestResources] :
        [storedResources, manifestResources, toAddResources];
    const inEffect = sortedByFilters.find(getArrayIfNonEmpty);
    return {
      revisedResources,
      storedResources,
      manifestResources,
      toAddResources,
      resourcesInParent,
      discardableResources,
      inEffect
    };
  };

  handleCopyFiles = () => {
    const { storedResources } = this.getSelectedResourcesByStatus();
    const uris = storedResources.map(r => r.uri);
    this.props.selectItemsToPaste(this.props.bundleId, uris, 'resources');
    this.handleClose();
  }

  handlePasteResources = () => {
    this.props.pasteItems(this.props.bundleId);
  }

  clearResourceSelectionsForPaste = (urisChanged) => {
    const { bundleId, selectedItemsToPaste } = this.props;
    const { bundleId: bundleIdPasteSource, items: urisToPaste, itemsType } = selectedItemsToPaste;
    if (bundleId === bundleIdPasteSource && itemsType === 'resources' &&
      Set(urisToPaste).subtract(urisChanged).length !== urisToPaste.length) {
      this.props.clearClipboard(); // clear resource selections for paste
    }
  }

  handleModifyFiles = () => {
    const { bundleId } = this.props;
    const {
      storedResources, manifestResources, toAddResources, discardableResources, inEffect
    } = this.getSelectedResourcesByStatus();
    const discardableUris = discardableResources.map(r => r.uri);
    if (storedResources === inEffect || discardableUris.length > 0) {
      if (discardableUris.length > 0) {
        this.clearResourceSelectionsForPaste(discardableUris);
        this.props.deleteManifestResources(bundleId, discardableUris);
      }
      const justCleanThese = storedResources.filter(r => !discardableUris.includes(r.uri));
      if (justCleanThese.length > 0) {
        const uris = justCleanThese.map(r => r.uri);
        this.clearResourceSelectionsForPaste(uris);
        this.props.removeResources(
          bundleId,
          uris
        );
      }
    } else if (manifestResources === inEffect) {
      const inEffectUris = inEffect.map(r => r.uri);
      this.props.deleteManifestResources(bundleId, inEffectUris);
    } else if (toAddResources === inEffect) {
      const { mapperInputData = {} } = this.props;
      const { report: inputMappers = {} } = mapperInputData;
      const { selectedIdsInputConverters: selectedMapperKeys = [] } = this.props;
      const selectedMappers = Object.keys(inputMappers)
        .filter(mapperKey => selectedMapperKeys.includes(mapperKey))
        .reduce((acc, mapperKey) => ({ ...acc, [mapperKey]: inputMappers[mapperKey] }), {});
      const filesToContainers = toAddResources.reduce((acc, selectedResource) =>
        ({ ...acc, [selectedResource.id]: formatUriForApi(selectedResource) }), {});
      this.props.addManifestResources(bundleId, filesToContainers, selectedMappers);
      this.setState({ selectedIds: [] });
    }
  }

  handleClose = () => {
    this.setState({ closing: true });
    this.props.closeResourceManager(this.props.bundleId);
  };

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  handleGoFixError = () => {
    this.props.goFixPublications();
  }

  getMapperReport = () => {
    if (!this.isModifyFilesMode()) {
      return;
    }
    const { toAddResources, inEffect } = this.getSelectedResourcesByStatus();
    if (toAddResources !== inEffect && inEffect) {
      return;
    }
    const { bundleId } = this.props;
    const uris = (toAddResources || []).map(r => r.uri);
    this.props.getMapperReport('input', uris, bundleId);
  }

  handleSelectedResourceIds = (selectedIds) => {
    this.setState({ selectedIds, selectAll: false }, this.getMapperReport);
  }

  getSelectedCountMessage = (shouldDisableOk) => {
    const { selectAll } = this.state;
    if (shouldDisableOk()) {
      return '';
    }
    const allMsg = selectAll ? 'All ' : '';
    const {
      inEffect = []
    } = this.getSelectedResourcesByStatus();
    return ` (${allMsg}${inEffect.length})`;
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
    const { selectedIds = [] } = this.state;
    return selectedIds.length === 0;
  }

  shouldDisableDownload = () => this.isNothingSelected();

  shouldDisableModifyFiles = () => {
    const { selectedIds = [] } = this.state;
    const { loading = false } = this.props;
    if (loading || selectedIds.length === 0) {
      return true;
    }
    const { isOkToRemoveFromManifest, isOkToAddFiles } = this.props;
    const {
      manifestResources, toAddResources, inEffect
    } = this.getSelectedResourcesByStatus();
    if (manifestResources === inEffect && !isOkToRemoveFromManifest) {
      return true;
    }
    if (toAddResources === inEffect && !isOkToAddFiles) {
      return true;
    }
    return false;
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
    const { tableData: origTotalResources } = this.state;
    const { toAddResources, inEffect } = this.getSelectedResourcesByStatus();
    if (toAddResources !== inEffect) {
      return origTotalResources;
    }
    const parentRawManifestResourceUris =
      getRawManifestResourceUris(this.props.previousManifestResources);
    const tableData = toAddResources.map(resource => resource.id).reduce((acc, filePath) => {
      const container = formatContainer(newContainer);
      const updatedTotalResources = createUpdatedTotalResources(
        acc,
        filePath,
        (resource) => {
          const updatedContainer = (resource.relativeFolder ?
            formatContainer(upath.joinSafe(container, resource.relativeFolder)) :
            container);
          const updatedUri = formatUri(updatedContainer, resource.name);
          const status = getAddStatus(updatedUri, parentRawManifestResourceUris);
          return {
            container: updatedContainer,
            uri: updatedUri,
            status
          };
        }
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
    this.setAddedFilePathsAndSelectAll(newAddedFilePaths, this.state.fullToRelativePaths);
  };

  setAddedFilePathsAndSelectAll = (newAddedFilePaths, fullToRelativePaths) => {
    const addedFilePaths = this.getUnionWithAddedFiles(newAddedFilePaths);
    const selectedIds = this.getUnionWithSelectedIds(addedFilePaths);
    this.setState(
      { addedFilePaths, selectedIds, fullToRelativePaths },
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

  filterBySelectedMappers = (inputMappers) => {
    const { selectedIdsInputConverters } = this.props;
    return Object.entries(inputMappers)
      .filter(([mapperKey]) => selectedIdsInputConverters.includes(mapperKey))
      .reduce((acc, [mapperKey, mapperValue]) => ({ ...acc, [mapperKey]: mapperValue }), {});
  }

  getTableDataForAddedResources = (newAddedFilePaths, fullToRelativePaths) => {
    const { manifestResources, mapperInputData = {} } = this.props;
    const { report: inputMappers = {}, overwrites: inputMappersOverwrites = {} } = mapperInputData;
    const { tableData = manifestResources } = this.state;
    const parentRawManifestResourceUris =
      getRawManifestResourceUris(this.props.previousManifestResources);
    const otherResources = tableData.filter(r => !newAddedFilePaths.includes(r.id));
    const conversions = utilities.getUnionOfValues(this.filterBySelectedMappers(inputMappers));
    const conversionOverwrites = Object.entries(this.filterBySelectedMappers(inputMappersOverwrites))
      .reduce((acc, [, mapperOverwrites]) => acc.union(mapperOverwrites.map(a => a[0])), Set());
    const newlyAddedResources = newAddedFilePaths.map(createAddedResource(
      fullToRelativePaths, parentRawManifestResourceUris,
      conversions, conversionOverwrites
    ));
    return [...otherResources, ...newlyAddedResources];
  }

  updateTotalResources = (newAddedFilePaths, fullToRelativePaths) => () => {
    const tableData = this.getTableDataForAddedResources(newAddedFilePaths, fullToRelativePaths);
    this.setState(
      { tableData },
      () => {
        this.getMapperReport();
        this.updateAddedResourcesWithFileStats(newAddedFilePaths)();
      }
    );
  }

  isModifyFilesMode = () => this.props.mode === 'addFiles';
  isDownloadMode = () => this.props.mode === 'download';

  getOkButtonDataModifyResources = () => {
    const { classes } = this.props;
    const {
      discardableResources, storedResources, manifestResources, toAddResources, inEffect = []
    } = this.getSelectedResourcesByStatus();
    const toAddReourcesInEffect = toAddResources === inEffect;
    const OkButtonIcon = toAddReourcesInEffect ?
      <CheckIcon className={classNames(classes.leftIcon)} /> :
      <Delete className={classNames(classes.leftIcon)} />;
    const inEffectCount = inEffect.length;
    let OkButtonLabel = '';
    if ([storedResources, discardableResources].includes(inEffect)) {
      const discardMsg = discardableResources.length ? ` / Discard (${discardableResources.length})` : '';
      OkButtonLabel = `Clean (${inEffectCount - discardableResources.length})${discardMsg}`;
    } else if (manifestResources === inEffect) {
      OkButtonLabel = `Delete from Manifest (${inEffectCount})`;
    } else if (toAddResources === inEffect) {
      const revisions = toAddResources.filter(r => r.status === addAndOverwrite);
      const conversions = toAddResources.filter(r => r.status === addAndConvert);
      const conversionOverwrites = toAddResources.filter(r => r.status === addAndConvertOverwrite);
      const addCount = inEffectCount - conversions.length - conversionOverwrites.length;
      const addCountMsg = addCount > 0 ? ` ${addCount}` : '';
      const addMessageBuilder = [`Add${addCountMsg}`];
      if (conversions.length || conversionOverwrites.length) {
        addMessageBuilder.push(` / Convert ${conversions.length + conversionOverwrites.length}`);
      }
      if (revisions.length || conversionOverwrites.length) {
        addMessageBuilder.push(` (Revise ${revisions.length + conversionOverwrites.length})`);
      }
      OkButtonLabel = addMessageBuilder.join('');
    }
    const OkButtonProps = {
      classes,
      color: 'secondary',
      variant: 'contained',
      onClick: this.handleModifyFiles,
      disabled: this.shouldDisableModifyFiles()
    };
    return { OkButtonLabel, OkButtonIcon, OkButtonProps };
  }

  getOkButtonDataDownloadOrCleanResources = () => {
    const { classes } = this.props;
    const {
      storedResources, manifestResources, inEffect
    } = this.getSelectedResourcesByStatus();
    const isManifestResourcesInEffect = manifestResources === inEffect;
    const OkButtonIcon = isManifestResourcesInEffect ?
      <FileDownload className={classNames(classes.leftIcon)} /> :
      <Delete className={classNames(classes.leftIcon)} />;
    let OkButtonLabel;
    if (manifestResources === inEffect) {
      OkButtonLabel = `Download${this.getSelectedCountMessage(this.shouldDisableDownload)}`;
    }
    if (storedResources === inEffect) {
      OkButtonLabel = `Clean (${storedResources.length})`;
    }
    const OkButtonProps = {
      classes,
      confirmingProps: { variant: 'contained' },
      color: isManifestResourcesInEffect ? 'inherit' : 'secondary',
      variant: isManifestResourcesInEffect ? 'text' : 'contained',
      onClick: this.handleDownloadOrClean,
      disabled: this.shouldDisableDownload()
    };
    return { OkButtonLabel, OkButtonIcon, OkButtonProps };
  }

  modeUi = () => {
    const { mode, classes } = this.props;
    const title = 'Manage resources';
    switch (mode) {
      case 'download': {
        const { OkButtonLabel, OkButtonIcon, OkButtonProps } =
          this.getOkButtonDataDownloadOrCleanResources();
        return {
          mode,
          appBar:
          {
            title,
            OkButtonProps,
            OkButtonLabel,
            OkButtonIcon,
          }
        };
      } case 'addFiles': {
        const { OkButtonLabel, OkButtonIcon, OkButtonProps } =
          this.getOkButtonDataModifyResources();
        return {
          mode,
          appBar: {
            title,
            OkButtonProps,
            OkButtonLabel,
            OkButtonIcon
          }
        };
      }
      case 'revisions': {
        const hasLocalBundle = Boolean(this.getSelectedLocalBundle().localBundle);
        return {
          mode,
          appBar: {
            title: 'Revisions',
            OkButtonProps: {
              classes,
              confirmingProps: { variant: 'contained' },
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
    (!this.props.loading && this.isModifyFilesMode() && this.props.isOkToAddFiles) ?
      this.handleAddByFile : undefined
  )

  getHandleAddByFolder = () => (
    (!this.props.loading && this.isModifyFilesMode() && this.props.isOkToAddFiles) ?
      this.handleAddByFolder : undefined
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
    const selectedIdSet = Set(selectedIds);
    return tableData.filter(r => selectedIdSet.has(r.id));
  }

  hasAnySelectedUnassignedContainers = () => {
    const { manifestResources } = this.props;
    const { tableData = manifestResources, selectedIds } = this.state;
    const selectedIdSet = Set(selectedIds);
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

  renderTableToolbar = () => {
    const { mode, mapperInputData } = this.props;
    const { selectedIds } = this.state;
    const { toAddResources, inEffect } = this.getSelectedResourcesByStatus();
    const addModeProps = mode === 'addFiles' ? {
      enableEditContainer: toAddResources === inEffect,
      handleAddByFile: this.getHandleAddByFile(),
      handleAddByFolder: this.getHandleAddByFolder(),
      getSuggestions: this.getSuggestions,
      mapperInputData,
      onAutosuggestInputChanged: this.handleAutosuggestInputChanged
    } : {};
    return (
      <React.Fragment>
        <EnhancedTableToolbar
          numSelected={selectedIds.length}
          {...addModeProps}
        />
        {this.renderInputMapperReportTable()}
      </React.Fragment>);
  }

  renderInputMapperReportTable = () => {
    const { mapperInputData = {} } = this.props;
    const { report = {} } = mapperInputData;
    const mapperKeys = Object.keys(report);
    if (mapperKeys.length === 0) {
      return (null);
    }
    const { selectedIdsInputConverters = [] } = this.props;
    return (<MapperTable
      direction="input"
      selectedIds={selectedIdsInputConverters}
    />);
  }

  renderTable = () => {
    const {
      columnConfig, manifestResources, mode
    } = this.props;
    const { tableData = manifestResources, selectedIds } = this.state;
    switch (mode) {
      case 'download': {
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              data={tableData}
              columnConfig={columnConfig}
              secondarySorts={secondarySorts}
              defaultOrderBy="container"
              onSelectedRowIds={this.handleSelectedResourceIds}
              multiSelections
              selectedIds={selectedIds}
            />
          </React.Fragment>
        );
      }
      case 'revisions': {
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              data={tableData}
              columnConfig={columnConfig}
              customSorts={{ revision: rData => (rData.localBundle ? sortLocalRevisions(rData.localBundle) : parseInt(rData.revision, 10)) }}
              secondarySorts={['revision']}
              defaultOrderBy="revision"
              orderDirection="desc"
              onSelectedRowIds={this.handleSelectedResourceIds}
              selectedIds={selectedIds}
            />
          </React.Fragment>
        );
      }
      case 'addFiles': {
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              data={tableData}
              columnConfig={columnConfig}
              secondarySorts={secondarySorts}
              defaultOrderBy="container"
              onSelectedRowIds={this.handleSelectedResourceIds}
              multiSelections
              selectedIds={selectedIds}
            />
          </React.Fragment>
        );
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

  renderOkOrPasteResourcesButton = () => {
    const {
      classes, loading, progress, bundleId, selectedItemsToPaste, isOkToAddFiles
    } = this.props;
    const { bundleId: bundleIdPasteSource, items: urisToPaste, itemsType } = selectedItemsToPaste;
    const modeUi = this.modeUi();
    const isModifyFilesMode = this.isModifyFilesMode();
    const isNothingSelected = this.isNothingSelected();
    if (isModifyFilesMode && isOkToAddFiles &&
      bundleIdPasteSource && isNothingSelected &&
      itemsType === 'resources' &&
      bundleId !== bundleIdPasteSource) {
      return (
        <PasteButton
          key="btnPasteResources"
          classes={classes}
          color="secondary"
          variant="contained"
          onClick={this.handlePasteResources}
          disabled={urisToPaste.length === 0}
          itemsToPaste={urisToPaste}
          itemsType={itemsType}
        />
      );
    }
    return (
      <ConfirmButton
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
      </ConfirmButton>);
  }

  render() {
    const {
      classes, open, origBundle = {}, mode,
      publicationsHealthMessage = '', publicationsHealthSuccessMessage, loading
    } = this.props;
    const { storedResources } = this.getSelectedResourcesByStatus();
    const { displayAs = {} } = origBundle;
    const { languageAndCountry, name, revision } = displayAs;
    const modeUi = this.modeUi();
    const isModifyFilesMode = this.isModifyFilesMode();
    const mediumIconMarginRight = ux.getMediumIcon(origBundle.medium);
    const { status, parent, dblId } = origBundle;
    const revBackground =
      ux.getDblRowBackgroundColor(false, classes, status, revision, parent, dblId);
    return (
      <Zoom in={open}>
        <div>
          <AppBar className={classes.appBar}>
            <Toolbar className={classes.toolBar}>
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <FolderOpen color="inherit" className={classNames(classes.leftIcon)} />
              <Typography variant="title" color="inherit">
                {modeUi.appBar.title}: {mediumIconMarginRight} <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Tooltip title={this.props.entryPageUrl}>
                <Button onClick={this.onOpenDBLEntryLink} className={classNames(classes.button, revBackground)}>
                  <Link className={classNames(classes.leftIcon, classes.iconSmall)} />
                  {revision}
                </Button>
              </Tooltip>
              <div className={classes.flex} />
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              {mode !== 'revisions' &&
              <CopyForPasteButton
                key="btnCopyForPaste"
                classes={classes}
                color="inherit"
                onClick={this.handleCopyFiles}
                disabled={storedResources.length === 0}
                selectedItems={storedResources}
              />}
              {this.renderOkOrPasteResourcesButton()}
            </Toolbar>
          </AppBar>
          {isModifyFilesMode && publicationsHealthMessage &&
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
          {!loading && isModifyFilesMode && publicationsHealthSuccessMessage &&
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

function getArrayIfNonEmpty(array) {
  return array.length ? array : null;
}
