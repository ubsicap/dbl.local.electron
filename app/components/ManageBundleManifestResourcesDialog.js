import React, { Component } from 'react';
import sort from 'fast-sort';
import upath from 'upath';
import recursiveReadDir from 'recursive-readdir';
import traverse from 'traverse';
import { List, Set } from 'immutable';
import CircularProgress from '@material-ui/core/CircularProgress';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Delete from '@material-ui/icons/Delete';
import CheckIcon from '@material-ui/icons/Check';
import FileDownload from '@material-ui/icons/CloudDownloadOutlined';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import path from 'path';
import { findChunks } from 'highlight-words-core';
import {
  closeResourceManager,
  addManifestResources,
  checkPublicationsHealth,
  deleteManifestResources,
  selectResources,
  selectRevisions,
  updateSortOrder,
  appendAddedFilePaths,
  editContainers
} from '../actions/bundleManageResources.actions';
import { pasteItems, clearClipboard } from '../actions/clipboard.actions';
import {
  downloadResources,
  removeResources,
  getEntryRevisions,
  createBundleFromDBL,
  selectBundleEntryRevision
} from '../actions/bundle.actions';
import EnhancedTable from './EnhancedTable';
import EnhancedTableToolbar from './EnhancedTableToolbar';
import { utilities } from '../utils/utilities';
import { bundleService } from '../services/bundle.service';
import { ux } from '../utils/ux';
import ConfirmButton from './ConfirmButton';
import PasteButton from './PasteButton';
import MapperTable from './MapperTable';
import EntryAppBar from './EntryAppBar';
import EntryDrawer from './EntryDrawer';
import EntryDialogBody from './EntryDialogBody';
import { emptyArray, emptyObject } from '../utils/defaultValues';

const { dialog } = require('electron').remote;

const NEED_CONTAINER = '/?';

type Props = {
  classes: {},
  theme: {},
  loading: boolean,
  progress: number,
  bundleId: ?string,
  bundlesById: ?{},
  origBundle: {},
  mode: string,
  showMetadataFile: ?string,
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
  selectedItemsToPaste: ?{},
  selectedRowIds: [],
  autoSelectAllResources: boolean,
  tableData: [],
  selectedResourcesByStatus: {},
  orderDirection?: string,
  orderBy?: string,
  closeBundleResourceManager: () => {},
  getEntryRevisionsData: () => {},
  downloadBundleResources: () => {},
  addBundleManifestResources: () => {},
  deleteBundleManifestResources: () => {},
  checkBundlePublicationsHealth: () => {},
  createEntryBundleFromDBL: () => {},
  selectEntryRevision: () => {},
  removeBundleResources: () => {},
  pasteResourcesFromClipboard: () => {},
  clearResourcesFromClipboard: () => {},
  selectBundleResources: () => {},
  selectBundleRevisions: () => {},
  appendResourceDialogAddedFilePaths: () => {},
  editResourceDialogContainers: () => {},
  updateResourceDialogSortOrder: () => {}
};

const defaultProps = {
  orderDirection: 'asc',
  orderBy: 'container'
};

const addStatus = 'add?';
const addAndOverwrite = 'add (revise)?';
const addAndConvert = 'add / convert?';
const addAndConvertOverwrite = 'add / convert (revise)?';
const addStatuses = [
  addStatus,
  addAndOverwrite,
  addAndConvert,
  addAndConvertOverwrite
];

function formatUriForApi(resource) {
  const { container, name } = resource;
  return utilities.formatUri(container, name);
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
  isStored,
  isModifiedFromPrev,
  previousManifestResource,
  { previousEntryRevision, bundlePreviousRevision, previousManifestResources }
) {
  if (rawManifestResource === previousManifestResource) {
    return 'deleted';
  }
  if (isModifiedFromPrev) {
    return 'revised';
  }
  if (
    previousEntryRevision &&
    bundlePreviousRevision &&
    Object.keys(previousManifestResources.rawManifestResources).length &&
    !previousManifestResource
  ) {
    return statusAdded;
  }
  return isStored ? statusStored : 'manifest';
}

function createResourceData(
  bundle,
  manifestResourceRaw,
  fileStoreInfo,
  prevManifestResource,
  {
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources
  } = {
    previousManifestResources: emptyBundleManifestResources
  },
  publicationData = emptyObject
) {
  const {
    uri = '',
    checksum = '',
    size: sizeRaw = 0,
    mimeType = ''
  } = manifestResourceRaw;
  const container = utilities.formatContainer(
    upath.normalizeTrim(path.dirname(uri))
  );
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = utilities.formatBytesByKbs(sizeRaw);
  const id = uri;
  const isModifiedFromPrev = prevManifestResource
    ? prevManifestResource.checksum !== checksum
    : false;
  const isPrevResource = manifestResourceRaw === prevManifestResource;
  const isDraft = bundle ? bundle.status === 'DRAFT' : false;
  const isStored = Boolean(fileStoreInfo) && !isPrevResource;
  const stored = isStored ? '✓' : '';
  const status = getStatusResourceData(
    manifestResourceRaw,
    isStored,
    isModifiedFromPrev,
    prevManifestResource,
    { previousEntryRevision, bundlePreviousRevision, previousManifestResources }
  );
  const disabled = (isDraft && isModifiedFromPrev) || isPrevResource;
  const { pubPath = '', pub = '', role = '' } = publicationData || emptyObject;
  return {
    id,
    uri,
    stored,
    status,
    container,
    name,
    mimeType,
    size,
    pubPath,
    role,
    pub,
    checksum,
    disabled
  };
}

function getAddStatus(
  uri,
  resourcesInParent,
  conversions = Set(),
  conversionOverwrites = Set()
) {
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
  fullToRelativePaths,
  resourcesInParent,
  conversions,
  conversionOverwrites,
  fileSizes = emptyObject,
  editedContainers = emptyObject
) {
  return filePath => {
    const {
      fileName,
      relativeFolder,
      container,
      uri
    } = utilities.getFilePathResourceData(
      filePath,
      fullToRelativePaths,
      editedContainers
    );
    const [id, name] = [filePath, fileName];
    const size = fileSizes[filePath] || '';
    const status = getAddStatus(
      uri,
      resourcesInParent,
      conversions,
      conversionOverwrites
    );
    const stored = '';
    return {
      id,
      uri,
      stored,
      status,
      mimeType: '',
      container: container || NEED_CONTAINER,
      relativeFolder,
      name,
      size,
      checksum: '',
      disabled: false
    };
  };
}

function getIsNumeric(columnName) {
  return ['size', 'revision', 'stored', 'manifest'].includes(columnName);
}

function getLabel(columnName) {
  return ['size'].includes(columnName) ? 'size (kb)' : null;
}

const secondarySorts = ['container', 'name', 'status'];

function createColumnConfig(mode) {
  if (mode === 'revisions') {
    const {
      id,
      href,
      localBundle,
      disabled,
      ...columns
    } = createRevisionData();
    return ux.mapColumns(columns, getIsNumeric, getLabel);
  }
  const { id, uri, disabled, checksum, ...columns } = createResourceData(
    null,
    emptyObject,
    emptyObject
  );
  return ux.mapColumns(columns, getIsNumeric, getLabel);
}

const getMode = (state, props) => props.match.params.mode;
const getBundleId = (state, props) => props.match.params.bundleId;
const getAllEntryRevisions = state =>
  state.bundles.allEntryRevisions || emptyObject;
const getBundlesById = state => state.bundles.addedByBundleIds || emptyObject;
const getAddedFilePaths = state =>
  state.bundleManageResources.addedFilePaths || emptyArray;
const getFullToRelativePaths = state =>
  state.bundleManageResources.fullToRelativePaths || emptyObject;
const getFileSizes = state =>
  state.bundleManageResources.fileSizes || emptyObject;
const getMapperReports = state =>
  state.bundleManageResources.mapperReports || emptyObject;
const getMapperInputData = state =>
  getMapperReports(state).input || emptyObject;
const getMapperInputReport = state =>
  getMapperInputData(state).report || emptyObject;
const getSelectedMappers = state =>
  state.bundleManageResources.selectedMappers || emptyObject;
const getUxCanons = state =>
  state.bundleManageResourcesUx.uxCanons || emptyObject;
const getEditedContainers = state =>
  state.bundleManageResources.editedContainers || emptyObject;

const emptyBundleManifestResources = {
  rawManifestResources: emptyObject,
  storedFiles: emptyObject
};

function filterBySelectedMappers(inputMappers, selectedIdsInputConverters) {
  return Object.entries(inputMappers)
    .filter(([mapperKey]) => selectedIdsInputConverters.includes(mapperKey))
    .reduce(
      (acc, [mapperKey, mapperValue]) => ({ ...acc, [mapperKey]: mapperValue }),
      emptyObject
    );
}

function getTableDataForAddedResources(
  mapperInputData,
  selectedIdsInputConverters,
  previousManifestResources,
  newAddedFilePaths,
  fullToRelativePaths,
  fileSizes,
  editedContainers
) {
  const {
    report: inputMappers = emptyObject,
    overwrites: inputMappersOverwrites = emptyObject
  } = mapperInputData;
  const parentRawManifestResourceUris = getRawManifestResourceUris(
    previousManifestResources
  );
  const conversions = utilities.getUnionOfValues(
    filterBySelectedMappers(inputMappers, selectedIdsInputConverters)
  );
  const conversionOverwrites = Object.entries(
    filterBySelectedMappers(inputMappersOverwrites, selectedIdsInputConverters)
  ).reduce(
    (acc, [, mapperOverwrites]) => acc.union(mapperOverwrites.map(a => a[0])),
    Set()
  );
  const addedResources = newAddedFilePaths.map(
    createAddedResource(
      fullToRelativePaths,
      parentRawManifestResourceUris,
      conversions,
      conversionOverwrites,
      fileSizes,
      editedContainers
    )
  );
  return addedResources;
}

const getPreviousManifestResourcesDataSelector = createSelector(
  [getBundleId, getBundlesById, getAllEntryRevisions],
  (bundleId, bundlesById, allEntryRevisions) =>
    getPreviousRevisionManifestResourcesData(
      bundleId,
      bundlesById,
      allEntryRevisions
    )
);

const getIsLoading = state => state.bundleManageResources.loading || false;

const getActiveBundleSelector = createSelector(
  [getBundleId, getBundlesById],
  (bundleId, bundlesById) => bundlesById[bundleId]
);

// indexed by src -> [{ src, role, pub, canonComponent }]
function getSrcRoleData(acc, node) {
  if (!node.src) {
    return acc;
  }
  const { path: keys, parents } = this;
  const { uxCanonsComponents } = parents[0].node;
  if (!uxCanonsComponents || uxCanonsComponents === emptyObject) {
    return acc;
  }
  const myPubNode = parents[2].node;
  const { canonSpec: pubCanonSpec = emptyObject } = myPubNode;
  const { components: pubCanonSpecComponents = emptyArray } = pubCanonSpec;
  const { src, role } = node;
  const [book, chapter] = role.split(' ');
  const {
    canonComponent = 'unspecifiedCanonComponent',
    bookNum = 'BB'
  } = pubCanonSpecComponents.reduce(
    (accCanonAndBookNum, canonComponentValue) => {
      const bookIndex = uxCanonsComponents[canonComponentValue].books.indexOf(
        book
      );
      if (bookIndex === -1 || acc.bookNum) {
        return acc;
      }
      const bookNumPadded = String(bookIndex + 1).padStart(2, '0');
      return { canonComponent: canonComponentValue, bookNum: bookNumPadded };
    },
    {}
  );
  const pub = keys[1];
  const chapterNum = chapter ? chapter.padStart(3, '\xa0') : '';
  const pubPath = `${pub}/${canonComponent}/${bookNum}:${book}${chapterNum}`;
  const sourceData = acc[node.src] || [];
  if (sourceData.length === 0) {
    acc[node.src] = sourceData;
  }
  sourceData.push({ src, role, pub, pubPath, canonComponent });
  return acc;
}

const getPublicationsDataSelector = createSelector(
  [getActiveBundleSelector, getUxCanons],
  (bundle, uxCanons) => {
    const { publications = emptyObject } = bundle.raw.metadata;
    const publicationData = traverse({
      uxCanonsComponents: uxCanons.components || emptyObject,
      publications
    }).reduce(getSrcRoleData, {});
    return publicationData;
  }
);

const getManifestResourcesDataSelector = createSelector(
  [
    getMode,
    getActiveBundleSelector,
    getPreviousManifestResourcesDataSelector,
    getAddedFilePaths,
    getFullToRelativePaths,
    getFileSizes,
    getMapperInputData,
    getMapperInputReport,
    getSelectedMappers,
    getEditedContainers,
    getIsLoading,
    getPublicationsDataSelector
  ],
  (
    mode,
    bundle,
    prevManifestResourcesData,
    addedFilePaths,
    fullToRelativePaths,
    fileSizes,
    mapperInputData,
    mapperReport,
    selectedMappers,
    editedContainers,
    // eslint-disable-next-line no-unused-vars
    isLoading /* warning: disabling all checkboxes during isLoading can result in hiding checkbox column */,
    publicationsData
  ) => {
    const bundleManifestResources = createBundleManifestResources(bundle);
    const { rawManifestResources, storedFiles } = bundleManifestResources;
    const {
      previousEntryRevision,
      bundlePreviousRevision,
      previousManifestResources
    } = prevManifestResourcesData;
    // first get resource data for all resources without publication data
    const bundleManifestResourcesData = Object.values(rawManifestResources)
      .filter(r => !publicationsData[r.uri])
      .map(r =>
        createResourceData(
          bundle,
          r,
          storedFiles[r.uri],
          previousManifestResources.rawManifestResources[r.uri],
          {
            previousEntryRevision,
            bundlePreviousRevision,
            previousManifestResources
          }
        )
      );
    // next get resource data that's found in publications
    const publicationsResourcesData = traverse(publicationsData).reduce(
      (acc, node) => {
        if (!node.src) {
          return acc;
        }
        const pubData = node;
        const r = rawManifestResources[pubData.src];
        if (!r) {
          return acc;
        }
        const pubResourceData = createResourceData(
          bundle,
          r,
          storedFiles[r.uri],
          previousManifestResources.rawManifestResources[r.uri],
          {
            previousEntryRevision,
            bundlePreviousRevision,
            previousManifestResources
          },
          pubData
        );
        acc.push(pubResourceData);
        return acc;
      },
      []
    );
    const bundleManifestResourceUris = getRawManifestResourceUris(
      bundleManifestResources
    );
    const { storedFiles: parentStoredFiles } = previousManifestResources;
    const deletedParentBundleResources = Object.values(
      previousManifestResources.rawManifestResources
    )
      .filter(
        pr =>
          !bundleManifestResourceUris.has(pr.uri) &&
          Object.keys(rawManifestResources).length
      )
      .map(pr =>
        createResourceData(null, pr, parentStoredFiles[pr.uri], pr, emptyObject)
      );
    const selectedIdsInputConverters =
      selectedMappers.input || Object.keys(mapperReport);
    const addedResources = getTableDataForAddedResources(
      mapperInputData,
      selectedIdsInputConverters,
      previousManifestResources,
      addedFilePaths,
      fullToRelativePaths,
      fileSizes,
      editedContainers
    );
    return [
      ...bundleManifestResourcesData,
      ...publicationsResourcesData,
      ...addedResources,
      ...deletedParentBundleResources
    ];
  }
);

const getSelectedResourceIds = state =>
  state.bundleManageResourcesUx.selectedResourceIds || emptyArray;

const getAutoSelectAllResources = state =>
  state.bundleManageResourcesUx.autoSelectAllResources || false;

const getSelectAllOrFilterSelectedResourceIdsSelector = createSelector(
  [
    getMode,
    getAutoSelectAllResources,
    getSelectedResourceIds,
    getManifestResourcesDataSelector
  ],
  filterSelectedResourceIds
);

const getSelectedResourcesSelector = createSelector(
  [
    getSelectAllOrFilterSelectedResourceIdsSelector,
    getManifestResourcesDataSelector
  ],
  getSelectedRowData
);

function getSelectedRowData(selectedRowIds, tableData) {
  const selectedIdSet = Set(selectedRowIds);
  return tableData.filter(r => selectedIdSet.has(r.id));
}

const getSelectedResourcesByStatusSelector = createSelector(
  [
    getSelectedResourcesSelector,
    getPreviousManifestResourcesDataSelector,
    getMode
  ],
  getSelectedResourcesByStatus
);

function getSelectedResourcesByStatus(
  selectedResources,
  previousManifestResourcesData,
  mode
) {
  const parentRawManifestResourceUris = getRawManifestResourceUris(
    previousManifestResourcesData.previousManifestResources
  );
  const filteredResources = List(
    mode === 'revisions' ? [] : selectedResources
  ).reduce(
    (acc, r) => {
      const resourceInParent = parentRawManifestResourceUris.has(r.uri);
      const resourcesInParentOrNot = resourceInParent
        ? { resourcesInParent: acc.resourcesInParent.push(r) }
        : null;
      const discardableResources = !resourceInParent
        ? acc.discardableResources.push(r)
        : acc.discardableResources;
      const storedOrNot = r.stored
        ? { storedResources: acc.storedResources.push(r) }
        : { manifestResources: acc.manifestResources.push(r) };
      const revisedOrNot =
        r.status === 'revised'
          ? { revisedResources: acc.revisedResources.push(r) }
          : null;
      const toAddResourcesOrNot = addStatuses.includes(r.status)
        ? { toAddResources: acc.toAddResources.push(r) }
        : null;
      return {
        ...acc,
        discardableResources,
        ...(resourcesInParentOrNot || {}),
        ...(revisedOrNot || {}),
        ...(toAddResourcesOrNot || storedOrNot)
      };
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
  const [
    revisedResources,
    storedResources,
    manifestResources,
    toAddResources,
    resourcesInParent,
    discardableResources
  ] = [
    filteredResources.revisedResources.toArray(),
    filteredResources.storedResources.toArray(),
    filteredResources.manifestResources.toArray(),
    filteredResources.toAddResources.toArray(),
    filteredResources.resourcesInParent.toArray(),
    filteredResources.discardableResources.toArray()
  ];
  const sortedByFilters =
    mode === 'download'
      ? [storedResources, manifestResources]
      : [storedResources, manifestResources, toAddResources];
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
}

function getRawManifestResourceUris(manifestResources) {
  const rawManifestResourceUris = Set(
    Object.keys(manifestResources.rawManifestResources)
  );
  return rawManifestResourceUris;
}

function getPrevEntryRevision(bundle, allEntryRevisions) {
  const { dblId, revision } = bundle;
  const entryRevisions = allEntryRevisions[dblId] || emptyArray;
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
      previousEntryRevision: (entryRevisions || emptyArray).find(
        r => `${r.revision}` === bundleBundle.revision
      )
    };
  }
  const previousEntryRevision = getPrevEntryRevision(bundle, allEntryRevisions);
  const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
  const bundlePreviousRevision = previousEntryRevision
    ? localEntryBundles.find(
        b => b.revision === `${previousEntryRevision.revision}`
      )
    : null;
  return { bundlePreviousRevision, previousEntryRevision };
}

function getPreviousRevisionManifestResourcesData(
  bundleId,
  bundlesById,
  allEntryRevisions
) {
  const {
    previousEntryRevision,
    bundlePreviousRevision
  } = getBundlePrevRevision(bundleId, bundlesById, allEntryRevisions);
  const previousManifestResources = bundlePreviousRevision
    ? {
        rawManifestResources: bundlePreviousRevision.manifestResources,
        storedFiles: bundlePreviousRevision.storedFiles
      }
    : emptyBundleManifestResources;
  return {
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources
  };
}

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
function createRevisionData(
  entryRevision,
  localEntryBundle,
  bundleManifestResources,
  disabled
) {
  /* eslint-disable camelcase */
  const {
    created_on = '',
    revision = '0',
    version = '',
    archivist = '',
    comments = '',
    href = ''
  } = entryRevision || emptyObject;
  const id = href;
  const is_on_disk = Boolean(
    Object.keys(localEntryBundle || emptyObject).length
  );
  const localBundle = localEntryBundle || null;
  const { storedFiles = emptyObject, rawManifestResources = emptyObject } =
    bundleManifestResources || emptyObject;
  const storedFromManifest = Object.values(rawManifestResources).filter(
    r => r.uri in storedFiles
  );
  const stored = is_on_disk ? storedFromManifest.length : '';
  const manifest = is_on_disk ? Object.values(rawManifestResources).length : '';
  return {
    disabled,
    id,
    href,
    localBundle,
    created_on,
    revision,
    version,
    archivist,
    comments,
    stored,
    manifest
  };
}

function findLocalEntryBundles(bundlesById, dblId) {
  return Object.values(bundlesById).filter(b => b.dblId === dblId);
}

function getIsCompatibleVersion(entryRevision) {
  return entryRevision.version.startsWith('2.');
}

function createBundleManifestResources(bundle) {
  if (!bundle || bundle === emptyObject) {
    return emptyBundleManifestResources;
  }
  return {
    rawManifestResources: bundle.manifestResources,
    storedFiles: bundle.storedFiles
  };
}

const getEntryRevisionsDataSelector = createSelector(
  [getAllEntryRevisions, getBundlesById, getBundleId],
  (allEntryRevisions, bundlesById, bundleId) => {
    const bundle = bundlesById[bundleId];
    const { dblId } = bundle;
    const localEntryBundles = findLocalEntryBundles(bundlesById, dblId);
    const entryRevisions = allEntryRevisions[dblId] || emptyArray;
    const entryRevData = entryRevisions.map(entryRevision => {
      const revision = `${entryRevision.revision}`;
      const localEntryBundle = localEntryBundles.find(
        b => b.revision === revision
      );
      const { id: localBundleId } = localEntryBundle || emptyObject;
      const bundleManifestResources = createBundleManifestResources(
        localEntryBundle
      );
      const disabled =
        bundleId === localBundleId || !getIsCompatibleVersion(entryRevision);
      return createRevisionData(
        entryRevision,
        localEntryBundle,
        bundleManifestResources,
        disabled
      );
    });
    const draftData = Object.values(localEntryBundles)
      .filter(localBundle => [0, '0'].includes(localBundle.revision))
      .map(localEntryBundle => {
        const { id: localBundleId } = localEntryBundle || emptyObject;
        const bundleManifestResources = createBundleManifestResources(
          localEntryBundle
        );
        const revision = ux.getFormattedRevision(localEntryBundle, '');
        const mockEntryRevision = {
          created_on: localEntryBundle.raw.store.created,
          revision,
          version: '2.x',
          archivist: '',
          comments: localEntryBundle.raw.metadata.comments,
          href: ''
        };
        return createRevisionData(
          mockEntryRevision,
          localEntryBundle,
          bundleManifestResources,
          bundleId === localBundleId
        );
      });
    return [...entryRevData, ...draftData];
  }
);

function filterSelectedResourceIds(
  mode,
  autoSelectAllResources,
  selectedResourceIds,
  tableData
) {
  const isDownloadMode = mode === 'download';
  const filteredSelectedResourceIds = autoSelectAllResources
    ? tableData
        .filter(row => !isDownloadMode || (!row.stored && !row.disabled))
        .map(row => row.id)
    : selectedResourceIds.filter(id =>
        tableData.some(row => row.id === id && !row.disabled)
      );
  if (filteredSelectedResourceIds.length === 0) {
    return emptyArray; // optimize caches
  }
  return filteredSelectedResourceIds;
}

function getSortOrderOrDefault(mode, sortOrder) {
  const orderDirectionDefault =
    mode === 'revisions' ? 'desc' : defaultProps.orderDirection;
  const orderByDefault =
    mode === 'revisions' ? 'revision' : defaultProps.orderBy;
  if (!sortOrder || sortOrder.mode !== mode) {
    return { orderDirection: orderDirectionDefault, orderBy: orderByDefault };
  }
  return sortOrder;
}

function mapStateToProps(state, props) {
  const {
    bundleEditMetadata,
    bundleManageResources,
    bundleManageResourcesUx,
    clipboard
  } = state;
  const {
    publicationsHealth,
    progress = 100,
    loading = false,
    isStoreMode = false,
    fetchingMetadata = false,
    mapperReports = emptyObject,
    selectedMappers = emptyObject
  } = bundleManageResources;
  const {
    autoSelectAllResources = false,
    selectedRevisionIds = emptyArray,
    sortOrder
  } = bundleManageResourcesUx;
  const { selectedItemsToPaste = emptyObject } = clipboard;
  const {
    errorMessage: publicationsHealthMessage,
    goFix: goFixPublications,
    message: publicationsHealthSuccessMessage,
    wizardsResults
  } = publicationsHealth || emptyObject;
  const { bundleId, mode } = props.match.params;
  const { showMetadataFile } = bundleEditMetadata;
  const columnConfig = createColumnConfig(mode);
  const bundlesById = getBundlesById(state);
  const origBundle = bundleId ? bundlesById[bundleId] : emptyObject;
  const {
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources
  } =
    mode !== 'revisions'
      ? getPreviousManifestResourcesDataSelector(state, props)
      : { previousManifestResources: emptyBundleManifestResources };
  const { input: mapperInputData } = mapperReports;
  const { report: mapperReport = emptyObject } = mapperInputData || emptyObject;
  const selectedIdsInputConverters =
    selectedMappers.input || Object.keys(mapperReport);
  const entryRevisions =
    mode === 'revisions'
      ? getEntryRevisionsDataSelector(state, props)
      : emptyArray;
  const manifestResources = getManifestResourcesDataSelector(state, props);
  const tableData = mode === 'revisions' ? entryRevisions : manifestResources;
  const selectedRowIds =
    mode === 'revisions'
      ? selectedRevisionIds
      : getSelectAllOrFilterSelectedResourceIdsSelector(state, props);
  const selectedResourcesByStatus = getSelectedResourcesByStatusSelector(
    state,
    props
  );
  const { orderDirection, orderBy } = getSortOrderOrDefault(mode, sortOrder);
  return {
    loading: loading || fetchingMetadata || !isStoreMode,
    progress,
    bundleId,
    bundlesById,
    origBundle,
    mode,
    showMetadataFile,
    mapperInputData,
    selectedIdsInputConverters,
    selectedRowIds,
    autoSelectAllResources,
    previousEntryRevision,
    bundlePreviousRevision,
    previousManifestResources,
    entryRevisions,
    columnConfig,
    isOkToAddFiles: !publicationsHealthMessage,
    isOkToRemoveFromManifest: !publicationsHealthMessage,
    publicationsHealthMessage,
    goFixPublications,
    publicationsHealthSuccessMessage,
    wizardsResults,
    selectedItemsToPaste,
    tableData,
    selectedResourcesByStatus,
    orderDirection,
    orderBy
  };
}

const mapDispatchToProps = {
  closeBundleResourceManager: closeResourceManager,
  getEntryRevisionsData: getEntryRevisions,
  downloadBundleResources: downloadResources,
  addBundleManifestResources: addManifestResources,
  deleteBundleManifestResources: deleteManifestResources,
  checkBundlePublicationsHealth: checkPublicationsHealth,
  createEntryBundleFromDBL: createBundleFromDBL,
  selectEntryRevision: selectBundleEntryRevision,
  removeBundleResources: removeResources,
  pasteResourcesFromClipboard: pasteItems,
  clearResourcesFromClipboard: clearClipboard,
  selectBundleResources: selectResources,
  selectBundleRevisions: selectRevisions,
  appendResourceDialogAddedFilePaths: appendAddedFilePaths,
  editResourceDialogContainers: editContainers,
  updateResourceDialogSortOrder: updateSortOrder
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  errorBar: {
    color: theme.palette.secondary.light
  },
  successBar: {
    color: theme.palette.primary.light
  },
  toolBar: {
    paddingLeft: '10px'
  },
  flex: {
    flex: 1
  },
  leftIcon: {
    marginRight: theme.spacing.unit
  },
  iconSmall: {
    fontSize: 20
  },
  button: {
    margin: theme.spacing.unit
  },
  input: {
    display: 'none'
  },
  buttonProgress: {
    color: theme.palette.secondary.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -23
  }
});

function mapSuggestions(suggestions) {
  return suggestions.map(suggestion => ({ label: suggestion }));
}

class ManageBundleManifestResourcesDialog extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = {
      closing: false
    };
  }

  componentDidMount() {
    const {
      bundleId,
      getEntryRevisionsData,
      checkBundlePublicationsHealth
    } = this.props;
    getEntryRevisionsData(bundleId);
    if (this.isModifyFilesMode()) {
      checkBundlePublicationsHealth(bundleId);
    }
  }

  componentDidUpdate(prevProps) {
    const { closing } = this.state;
    if (closing) {
      return;
    }
    const { loading } = this.props;
    if (loading) {
      const { origBundle } = this.props;
      if (origBundle.mode === 'create') {
        return;
      }
    }
    const { mode, previousEntryRevision, bundlePreviousRevision } = this.props;
    if (mode !== 'revisions') {
      if (
        !prevProps.previousEntryRevision &&
        previousEntryRevision &&
        !bundlePreviousRevision &&
        getIsCompatibleVersion(previousEntryRevision)
      ) {
        const { origBundle, createEntryBundleFromDBL } = this.props;
        createEntryBundleFromDBL(
          origBundle.dblId,
          previousEntryRevision.revision,
          origBundle.license
        );
      }
    }
  }

  handleDownloadResources = (bundleId, manifestResources) => () => {
    const effectiveSelectedIds = (manifestResources || emptyArray).map(
      row => row.id
    );
    const { downloadBundleResources } = this.props;
    downloadBundleResources(bundleId, effectiveSelectedIds);
    this.handleClose();
  };

  handleCleanResources = (bundleId, storedResources) => () => {
    const { removeBundleResources } = this.props;
    removeBundleResources(bundleId, storedResources.map(r => r.uri));
  };

  handleDownloadRevision = () => {
    const { origBundle, createEntryBundleFromDBL } = this.props;
    const { selected } = this.getSelectedLocalBundle();
    createEntryBundleFromDBL(
      origBundle.dblId,
      selected.revision,
      origBundle.license
    );
  };

  handleSwitchToRevision = () => {
    const { localBundle } = this.getSelectedLocalBundle();
    const { selectEntryRevision } = this.props;
    selectEntryRevision(localBundle);
    this.handleClose();
  };

  getSelectedResourcesByStatus = () => {
    const { selectedResourcesByStatus } = this.props;
    return selectedResourcesByStatus;
  };

  handlePasteResources = () => {
    const { bundleId, pasteResourcesFromClipboard } = this.props;
    pasteResourcesFromClipboard(bundleId);
  };

  clearResourceSelectionsForPaste = urisChanged => {
    const {
      bundleId,
      selectedItemsToPaste,
      clearResourcesFromClipboard
    } = this.props;
    const {
      bundleId: bundleIdPasteSource,
      items: urisToPaste,
      itemsType
    } = selectedItemsToPaste;
    if (
      bundleId === bundleIdPasteSource &&
      itemsType === 'resources' &&
      Set(urisToPaste).subtract(urisChanged).length !== urisToPaste.length
    ) {
      clearResourcesFromClipboard(); // clear resource selections for paste
    }
  };

  handleCleanAndDiscardFiles = (
    bundleId,
    storedResources,
    discardableResources
  ) => () => {
    const discardableUris = discardableResources.map(r => r.uri);
    const { deleteBundleManifestResources, removeBundleResources } = this.props;
    if (discardableUris.length > 0) {
      this.clearResourceSelectionsForPaste(discardableUris);
      deleteBundleManifestResources(bundleId, discardableUris);
    }
    const justCleanThese = storedResources.filter(
      r => !discardableUris.includes(r.uri)
    );
    if (justCleanThese.length > 0) {
      const uris = justCleanThese.map(r => r.uri);
      this.clearResourceSelectionsForPaste(uris);
      removeBundleResources(bundleId, uris);
    }
  };

  handleDeleteFromManifest = (bundleId, manifestResources) => () => {
    const { deleteBundleManifestResources } = this.props;
    const manifestResourceUris = manifestResources.map(r => r.uri);
    deleteBundleManifestResources(bundleId, manifestResourceUris);
  };

  handleAddConvertRevise = (bundleId, toAddResources) => () => {
    const { mapperInputData = {} } = this.props;
    const { report: inputMappers = {} } = mapperInputData;
    const { selectedIdsInputConverters: selectedMapperKeys = [] } = this.props;
    const selectedMappers = Object.keys(inputMappers)
      .filter(mapperKey => selectedMapperKeys.includes(mapperKey))
      .reduce(
        (acc, mapperKey) => ({ ...acc, [mapperKey]: inputMappers[mapperKey] }),
        {}
      );
    const filesToContainers = sort(toAddResources)
      .asc('uri')
      .reduce(
        (acc, selectedResource) => ({
          ...acc,
          [selectedResource.id]: formatUriForApi(selectedResource)
        }),
        {}
      );
    const { addBundleManifestResources } = this.props;
    addBundleManifestResources(bundleId, filesToContainers, selectedMappers);
  };

  handleClose = () => {
    this.setState({ closing: true });
    const { bundleId, closeBundleResourceManager } = this.props;
    closeBundleResourceManager(bundleId);
  };

  handleGoFixError = () => {
    const { goFixPublications } = this.props;
    goFixPublications();
  };

  handleSelectedRowIds = selectedIds => {
    const { mode, selectBundleRevisions, selectBundleResources } = this.props;
    if (mode === 'revisions') {
      selectBundleRevisions(selectedIds);
    } else {
      selectBundleResources(selectedIds);
    }
  };

  getSelectedCountMessage = shouldDisableOk => {
    const { autoSelectAllResources } = this.props;
    if (shouldDisableOk()) {
      return '';
    }
    const allMsg = autoSelectAllResources ? 'All ' : '';
    const { inEffect = [] } = this.getSelectedResourcesByStatus();
    return ` (${allMsg}${inEffect.length})`;
  };

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
  };

  isNothingSelected = () => {
    const { selectedRowIds = [] } = this.props;
    return selectedRowIds.length === 0;
  };

  shouldDisableDownload = () => this.isNothingSelected();

  shouldDisableModifyFiles = () => {
    const { selectedRowIds = [] } = this.props;
    const { loading = false } = this.props;
    if (loading || selectedRowIds.length === 0) {
      return true;
    }
    const { isOkToRemoveFromManifest, isOkToAddFiles } = this.props;
    const {
      manifestResources,
      toAddResources,
      inEffect
    } = this.getSelectedResourcesByStatus();
    if (manifestResources === inEffect && !isOkToRemoveFromManifest) {
      return true;
    }
    if (toAddResources === inEffect && !isOkToAddFiles) {
      return true;
    }
    return false;
  };

  handleAddByFile = () => {
    const newAddedFilePaths = dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    });
    // console.log(newAddedFilePaths);
    if (!newAddedFilePaths) {
      return;
    }
    this.setAddedFilePathsAndSelectAll(newAddedFilePaths);
  };

  setAddedFilePathsAndSelectAll = (
    newAddedFilePaths,
    fullToRelativePaths = null
  ) => {
    const { appendResourceDialogAddedFilePaths, bundleId } = this.props;
    appendResourceDialogAddedFilePaths(
      bundleId,
      newAddedFilePaths,
      fullToRelativePaths
    );
  };

  handleAddByFolder = async () => {
    const folderPaths = dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory', 'multiSelections']
    });
    if (!folderPaths) {
      return;
    }
    const parentDir = path.resolve(folderPaths[0], '..');
    const knownUnwantedFiles = [
      'metadata.xml',
      'desktop.ini',
      'thumbs.db',
      '.DS_Store',
      ignoreHiddenFunc
    ];
    const readAllDirs = folderPaths.map(folder =>
      recursiveReadDir(folder, knownUnwantedFiles).then(fullPaths => ({
        folder,
        fullPaths,
        fullToRelativePaths: fullPaths.reduce(
          (acc, filePath) => ({
            ...acc,
            [filePath]: filePath.substr(parentDir.length)
          }),
          {}
        )
      }))
    );
    const allFilePaths = await Promise.all(readAllDirs);
    const allFullToRelativePaths = allFilePaths.reduce(
      (acc, info) => ({ ...acc, ...info.fullToRelativePaths }),
      {}
    );
    const allFullPaths = Object.keys(allFullToRelativePaths);
    // console.log(allFullPaths);
    this.setAddedFilePathsAndSelectAll(allFullPaths, allFullToRelativePaths);
  };

  filterBySelectedMappers = inputMappers => {
    const { selectedIdsInputConverters } = this.props;
    return Object.entries(inputMappers)
      .filter(([mapperKey]) => selectedIdsInputConverters.includes(mapperKey))
      .reduce(
        (acc, [mapperKey, mapperValue]) => ({
          ...acc,
          [mapperKey]: mapperValue
        }),
        {}
      );
  };

  isModifyFilesMode = () => {
    const { mode } = this.props;
    return mode === 'addFiles';
  };

  isDownloadMode = () => {
    const { mode } = this.props;
    return mode === 'download';
  };

  getOkButtonDataModifyResources = () => {
    const { classes, loading, bundleId } = this.props;
    const resourceSelectionStatus = this.getSelectedResourcesByStatus();
    const {
      discardableResources,
      storedResources,
      manifestResources,
      toAddResources,
      inEffect = []
    } = resourceSelectionStatus;
    const inEffectCount = inEffect.length;
    let OkButtonLabel = '';
    let OkButtonClickHandler;
    if ([storedResources, discardableResources].includes(inEffect)) {
      const discardMsg = discardableResources.length
        ? ` / Discard (${discardableResources.length})`
        : '';
      OkButtonLabel = `Clean (${inEffectCount -
        discardableResources.length})${discardMsg}`;
      OkButtonClickHandler = this.handleCleanAndDiscardFiles(
        bundleId,
        storedResources,
        discardableResources
      );
    } else if (manifestResources === inEffect) {
      OkButtonLabel = `Delete from Manifest (${inEffectCount})`;
      OkButtonClickHandler = this.handleDeleteFromManifest(
        bundleId,
        manifestResources
      );
    } else if (toAddResources === inEffect) {
      const revisions = toAddResources.filter(
        r => r.status === addAndOverwrite
      );
      const conversions = toAddResources.filter(
        r => r.status === addAndConvert
      );
      const conversionOverwrites = toAddResources.filter(
        r => r.status === addAndConvertOverwrite
      );
      const addCount =
        inEffectCount - conversions.length - conversionOverwrites.length;
      const addCountMsg = addCount > 0 ? ` ${addCount}` : '';
      const addMessageBuilder = [`Add${addCountMsg}`];
      if (conversions.length || conversionOverwrites.length) {
        addMessageBuilder.push(
          ` / Convert ${conversions.length + conversionOverwrites.length}`
        );
      }
      if (revisions.length || conversionOverwrites.length) {
        addMessageBuilder.push(
          ` (Revise ${revisions.length + conversionOverwrites.length})`
        );
      }
      OkButtonClickHandler = this.handleAddConvertRevise(
        bundleId,
        toAddResources
      );
      OkButtonLabel = addMessageBuilder.join('');
    } else if (loading) {
      OkButtonLabel = 'Adding...';
      OkButtonClickHandler = () => {};
    }
    const OkButtonIcon = this.getOkButtonIcon(resourceSelectionStatus, loading);
    const OkButtonProps = {
      classes,
      color: 'secondary',
      variant: 'contained',
      onClick: OkButtonClickHandler,
      disabled: this.shouldDisableModifyFiles()
    };
    return { OkButtonLabel, OkButtonIcon, OkButtonProps };
  };

  getOkButtonIcon = ({ inEffect, toAddResources }, loading) => {
    const { classes } = this.props;
    if (!loading && (!inEffect || inEffect.length === 0)) {
      return null;
    }
    if (toAddResources === inEffect || loading) {
      return <CheckIcon className={classNames(classes.leftIcon)} />;
    }
    return <Delete className={classNames(classes.leftIcon)} />;
  };

  getOkButtonDataDownloadOrCleanResources = () => {
    const { classes, bundleId } = this.props;
    const resourceSelectionStatus = this.getSelectedResourcesByStatus();
    const {
      storedResources,
      manifestResources,
      inEffect
    } = resourceSelectionStatus;
    const isManifestResourcesInEffect = manifestResources === inEffect;
    let OkButtonLabel;
    let OkButtonClickHandler;
    if (manifestResources === inEffect) {
      OkButtonLabel = `Download${this.getSelectedCountMessage(
        this.shouldDisableDownload
      )}`;
      OkButtonClickHandler = this.handleDownloadResources(
        bundleId,
        manifestResources
      );
    }
    if (storedResources === inEffect) {
      OkButtonLabel = `Clean (${storedResources.length})`;
      OkButtonClickHandler = this.handleCleanResources(
        bundleId,
        storedResources
      );
    }
    const OkButtonIcon = this.getDownloadOkButtonIcon(resourceSelectionStatus);
    const OkButtonProps = {
      classes,
      confirmingProps: { variant: 'contained' },
      color: isManifestResourcesInEffect ? 'inherit' : 'secondary',
      variant: isManifestResourcesInEffect ? 'text' : 'contained',
      onClick: OkButtonClickHandler,
      disabled: this.shouldDisableDownload()
    };
    return { OkButtonLabel, OkButtonIcon, OkButtonProps };
  };

  getDownloadOkButtonIcon = ({ inEffect, manifestResources }) => {
    const { classes } = this.props;
    if (!inEffect || inEffect.length === 0) {
      return null;
    }
    const OkButtonIcon =
      manifestResources === inEffect ? (
        <FileDownload className={classNames(classes.leftIcon)} />
      ) : (
        <Delete className={classNames(classes.leftIcon)} />
      );
    return OkButtonIcon;
  };

  modeUi = () => {
    const { mode, classes } = this.props;
    const title = 'Resources';
    switch (mode) {
      case 'download': {
        const {
          OkButtonLabel,
          OkButtonIcon,
          OkButtonProps
        } = this.getOkButtonDataDownloadOrCleanResources();
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
      case 'addFiles': {
        const {
          OkButtonLabel,
          OkButtonIcon,
          OkButtonProps
        } = this.getOkButtonDataModifyResources();
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
        const hasLocalBundle = Boolean(
          this.getSelectedLocalBundle().localBundle
        );
        const { loading } = this.props;
        return {
          mode,
          appBar: {
            title: 'Revisions',
            OkButtonProps: {
              classes,
              confirmingProps: { variant: 'contained' },
              color: hasLocalBundle ? 'inherit' : 'secondary',
              variant: hasLocalBundle ? 'text' : 'contained',
              onClick: hasLocalBundle
                ? this.handleSwitchToRevision
                : this.handleDownloadRevision,
              disabled: this.isNothingSelected() || loading
            },
            OkButtonLabel: `${this.getRevisionsOkButtonLabel()}`,
            OkButtonIcon: <CheckIcon className={classNames(classes.leftIcon)} />
          }
        };
      }
      default:
        return { appBar: { title: '', OkButtonLabel: '', OkButtonIcon: null } };
    }
  };

  getHandleAddByFile = () => {
    const { loading, isOkToAddFiles } = this.props;
    return !loading && this.isModifyFilesMode() && isOkToAddFiles
      ? this.handleAddByFile
      : undefined;
  };

  getHandleAddByFolder = () => {
    const { loading, isOkToAddFiles } = this.props;
    return !loading && this.isModifyFilesMode() && isOkToAddFiles
      ? this.handleAddByFolder
      : undefined;
  };

  getAllSuggestions = tableData => {
    const { mode } = this.props;
    if (mode !== 'addFiles') {
      return null;
    }
    return mapSuggestions(
      sort(
        utilities.union(
          tableData
            .filter(r => r.container !== NEED_CONTAINER)
            .map(r => r.container),
          ['/']
        )
      ).asc()
    );
  };

  getSuggestions = value => {
    // console.log({ getSuggestions: true, value, reason });
    const inputValue = value ? value.trim() : null;
    const { tableData } = this.props;
    const updatedResources = tableData;
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
  };

  getSelectedRowData = () => {
    const { selectedRowIds, tableData } = this.props;
    return getSelectedRowData(selectedRowIds, tableData);
  };

  hasAnySelectedUnassignedContainers = () => {
    const { tableData, selectedRowIds } = this.props;
    const selectedIdSet = Set(selectedRowIds);
    const resourcesWithUnassignedContainers = tableData.filter(
      r => r.container === NEED_CONTAINER
    );
    return resourcesWithUnassignedContainers.some(r => selectedIdSet.has(r.id));
  };

  handleAutosuggestInputChanged = newValue => {
    const { editResourceDialogContainers } = this.props;
    // console.log({ handleAutosuggestInputChanged: true, newValue, method });
    if (newValue === undefined) {
      return;
    }
    const { toAddResources, inEffect } = this.getSelectedResourcesByStatus();
    if (toAddResources !== inEffect) {
      return;
    }
    editResourceDialogContainers(newValue.trim());
  };

  renderWizardsResults = () => {
    const { wizardsResults } = this.props;
    if (!wizardsResults) {
      return null;
    }
    return Object.entries(wizardsResults).map(([wizardName, results]) => (
      <React.Fragment key="frag">
        <Typography
          key={`${wizardName}-description`}
          variant="subtitle1"
          color="inherit"
          paragraph
        >
          • <b>{results.description}</b> ({wizardName}):
        </Typography>
        <Typography
          key={`${wizardName}-documentation`}
          variant="subtitle1"
          color="inherit"
          style={{ marginLeft: '20px' }}
          paragraph
        >
          {results.documentation}
        </Typography>
      </React.Fragment>
    ));
  };

  renderTableToolbar = () => {
    const { mode, mapperInputData, selectedRowIds } = this.props;
    const addModeProps =
      mode === 'addFiles'
        ? {
            handleAddByFile: this.getHandleAddByFile(),
            handleAddByFolder: this.getHandleAddByFolder(),
            mapperInputData
          }
        : {};
    return (
      <React.Fragment>
        <EnhancedTableToolbar
          numSelected={selectedRowIds.length}
          {...addModeProps}
        />
        {this.renderInputMapperReportTable()}
      </React.Fragment>
    );
  };

  handleChangeSort = ({ order, orderBy }) => {
    const { updateResourceDialogSortOrder } = this.props;
    updateResourceDialogSortOrder(order, orderBy);
  };

  renderInputMapperReportTable = () => {
    const { mapperInputData = {} } = this.props;
    const { report = {} } = mapperInputData;
    const mapperKeys = Object.keys(report);
    if (mapperKeys.length === 0) {
      return null;
    }
    const { selectedIdsInputConverters = [] } = this.props;
    return (
      <MapperTable direction="input" selectedIds={selectedIdsInputConverters} />
    );
  };

  renderTable = () => {
    const {
      columnConfig,
      mode,
      selectedRowIds,
      tableData,
      loading,
      orderBy,
      orderDirection
    } = this.props;
    switch (mode) {
      case 'download': {
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              title="Resources"
              data={tableData}
              columnConfig={columnConfig}
              secondarySorts={secondarySorts}
              orderBy={orderBy}
              orderDirection={orderDirection}
              onSelectedRowIds={this.handleSelectedRowIds}
              onChangeSort={this.handleChangeSort}
              multiSelections
              selectedIds={selectedRowIds}
              freezeCheckedColumnState={loading}
            />
          </React.Fragment>
        );
      }
      case 'revisions': {
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              title="Revisions"
              data={tableData}
              columnConfig={columnConfig}
              customSorts={{
                revision: rData =>
                  rData.localBundle
                    ? sortLocalRevisions(rData.localBundle)
                    : parseInt(rData.revision, 10)
              }}
              secondarySorts={['revision']}
              orderBy={orderBy}
              orderDirection={orderDirection}
              onSelectedRowIds={this.handleSelectedRowIds}
              onChangeSort={this.handleChangeSort}
              selectedIds={selectedRowIds}
              freezeCheckedColumnState={loading}
            />
          </React.Fragment>
        );
      }
      case 'addFiles': {
        const {
          toAddResources,
          inEffect
        } = this.getSelectedResourcesByStatus();
        const enableEditContainer = toAddResources === inEffect;
        const editContainer = enableEditContainer
          ? {
              editContainer: {
                getSuggestions: this.getSuggestions,
                onAutosuggestInputChanged: this.handleAutosuggestInputChanged
              }
            }
          : emptyObject;
        return (
          <React.Fragment>
            {this.renderTableToolbar()}
            <EnhancedTable
              data={tableData}
              title="Resources"
              columnConfig={columnConfig}
              secondarySorts={secondarySorts}
              orderBy={orderBy}
              orderDirection={orderDirection}
              multiSelections
              onSelectedRowIds={this.handleSelectedRowIds}
              onChangeSort={this.handleChangeSort}
              selectedIds={selectedRowIds}
              freezeCheckedColumnState={loading}
              {...editContainer}
            />
          </React.Fragment>
        );
      }
      default: {
        return (
          <EnhancedTable
            data={tableData}
            columnConfig={columnConfig}
            freezeCheckedColumnState={loading}
          />
        );
      }
    }
  };

  renderOkOrPasteResourcesButton = () => {
    const {
      classes,
      loading,
      progress,
      bundleId,
      selectedItemsToPaste,
      isOkToAddFiles
    } = this.props;
    const {
      bundleId: bundleIdPasteSource,
      items: urisToPaste,
      itemsType
    } = selectedItemsToPaste;
    const modeUi = this.modeUi();
    const isModifyFilesMode = this.isModifyFilesMode();
    const isNothingSelected = this.isNothingSelected();
    if (
      isModifyFilesMode &&
      isOkToAddFiles &&
      bundleIdPasteSource &&
      isNothingSelected &&
      itemsType === 'resources' &&
      bundleId !== bundleIdPasteSource
    ) {
      return (
        <PasteButton
          key="btnPasteResources"
          classes={classes}
          color="secondary"
          variant="contained"
          onClick={this.handlePasteResources}
          disabled={urisToPaste.length === 0}
          selectedItemsToPaste={selectedItemsToPaste}
        />
      );
    }
    if (!modeUi.appBar.OkButtonIcon) {
      return null;
    }
    return (
      <ConfirmButton key="btnOk" {...modeUi.appBar.OkButtonProps}>
        {modeUi.appBar.OkButtonIcon}
        {modeUi.appBar.OkButtonLabel}
        {loading && (
          <CircularProgress
            className={classes.buttonProgress}
            size={50}
            color="secondary"
            variant="indeterminate"
            value={progress}
          />
        )}
      </ConfirmButton>
    );
  };

  render() {
    const {
      classes,
      origBundle = {},
      mode,
      publicationsHealthMessage = '',
      publicationsHealthSuccessMessage,
      loading
    } = this.props;
    const { storedResources } = this.getSelectedResourcesByStatus();
    const selectedItemsForCopy = storedResources.map(r => r.uri);
    const modeUi = this.modeUi();
    const isModifyFilesMode = this.isModifyFilesMode();
    return (
      <div>
        <EntryAppBar
          origBundle={origBundle}
          mode={mode}
          modeUi={modeUi}
          selectedItemsForCopy={selectedItemsForCopy}
          itemsTypeForCopy="resources"
          actionButton={this.renderOkOrPasteResourcesButton()}
          handleClose={this.handleClose}
        />
        <EntryDrawer activeBundle={origBundle} />
        <EntryDialogBody>
          {isModifyFilesMode && publicationsHealthMessage && (
            <Toolbar className={classes.errorBar}>
              <Typography variant="subtitle1" color="inherit">
                {publicationsHealthMessage}
              </Typography>
              <div style={{ paddingLeft: '10px' }} />
              <Button
                key="btnGoEdit"
                color="secondary"
                variant="contained"
                onClick={this.handleGoFixError}
              >
                Go Fix
              </Button>
            </Toolbar>
          )}
          {!loading && isModifyFilesMode && publicationsHealthSuccessMessage && (
            <Card className={classes.successBar} raised>
              <CardContent>
                <Typography
                  key="pubhealthSuccessMessage"
                  variant="subtitle1"
                  color="inherit"
                  gutterBottom
                >
                  {publicationsHealthSuccessMessage}
                </Typography>
                {this.renderWizardsResults()}
              </CardContent>
            </Card>
          )}
          {this.renderTable()}
        </EntryDialogBody>
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles, {
    withTheme: true,
    name: 'ManageBundleManifestResourcesDialog'
  }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ManageBundleManifestResourcesDialog);

ManageBundleManifestResourcesDialog.defaultProps = defaultProps;

function sortLocalRevisions(bundle) {
  const effectiveRevision = bundleService.getRevisionOrParentRevision(
    bundle.dblId,
    bundle.revision,
    bundle.parent
  );
  if (bundle.revision === '0') {
    return effectiveRevision + 10000;
  }
  return effectiveRevision;
}

function getArrayIfNonEmpty(array) {
  return array.length ? array : null;
}
