import React, { Component } from 'react';
import fs from 'fs-extra';
import sort from 'fast-sort';
import md5File from 'md5-file/promise';
import recursiveReadDir from 'recursive-readdir';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import OpenInNew from '@material-ui/icons/OpenInNew';
import FileDownload from '@material-ui/icons/CloudDownloadOutlined';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import path from 'path';
import { findChunks } from 'highlight-words-core';
import { history } from '../store/configureStore';
import { closeResourceManager,
  getManifestResources, addManifestResources, checkPublicationsHealth
} from '../actions/bundleManageResources.actions';
import { downloadResources } from '../actions/bundle.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';
import { utilities } from '../utils/utilities';

const { dialog } = require('electron').remote;
const { shell } = require('electron');

const NEED_CONTAINER = '/?';

type Props = {
  classes: {},
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
  mode: string,
  showMetadataFile: ?string,
  manifestResources: [],
  columnConfig: [],
  isOkToAddFiles: boolean,
  publicationsHealthMessage: ?string,
  publicationsHealthMessageLink: ?string,
  closeResourceManager: () => {},
  openMetadataFile: () => {},
  getManifestResources: () => {},
  downloadResources: () => {},
  addManifestResources: () => {},
  checkPublicationsHealth: () => {}
};

function createUpdatedTotalResources(origTotalResources, filePath, update) {
  return origTotalResources.map(r => (r.id === filePath ? { ...r, ...update } : r));
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

function createResourceData(manifestResourceRaw, fileStoreInfo, mode) {
  const { uri = '', checksum = '', size: sizeRaw = 0, mimeType = '' } = manifestResourceRaw;
  const container = formatContainer(path.dirname(uri));
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = formatBytesByKbs(sizeRaw);
  const id = uri;
  const status = fileStoreInfo ? 'stored' : '';
  const disabled = mode === 'addFiles' ? status !== 'add?' : status === 'stored';
  return {
    id, uri, status, container, name, mimeType, size, checksum, disabled
  };
}

function createAddedResource(filePath) {
  const fileName = path.basename(filePath);
  const [id, uri, name] = [filePath, fileName, fileName, fileName];
  return {
    id, uri, status: 'add?', mimeType: '', container: NEED_CONTAINER, name, size: 0, checksum: '', disabled: false
  };
}

function isNumeric(columnName) {
  return ['size'].includes(columnName);
}

function getLabel(columnName) {
  return ['size'].includes(columnName) ? 'size (kb)' : null;
}

const secondarySorts = ['container', 'name'];

function createColumnConfig() {
  const { id, uri, disabled, ...columns } = createResourceData({}, {}, 'ignore');
  return Object.keys(columns)
    .map(c => ({ name: c, type: isNumeric(c) ? 'numeric' : 'string', label: getLabel(c) }));
}

const getRawManifestResources = (state) => state.bundleManageResources.rawManifestResources || {};
const getStoredFiles = (state) => state.bundleManageResources.storedFiles;
const getMode = (state) => state.bundleManageResources.mode;

const makeGetManifestResourcesData = () => createSelector(
  [getRawManifestResources, getStoredFiles, getMode],
  (rawManifestResources, storedFiles, mode) =>
    Object.values(rawManifestResources)
      .map(r => createResourceData(r, storedFiles[r.uri], mode))
);

function mapStateToProps(state, props) {
  const { bundles, bundleEditMetadata, bundleManageResources } = state;
  const { publicationsHealth } = bundleManageResources;
  const { errorMessage: publicationsHealthMessage,
    navigation: publicationsHealthMessageLink } = publicationsHealth || {};
  const { bundleId, mode } = props.match.params;
  const { showMetadataFile } = bundleEditMetadata;
  const { addedByBundleIds } = bundles;
  const columnConfig = createColumnConfig();
  const getManifestResourceData = makeGetManifestResourcesData();
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  return {
    open: Boolean(bundleId),
    bundleId,
    selectedBundle,
    mode,
    showMetadataFile,
    manifestResources: getManifestResourceData(state),
    columnConfig,
    isOkToAddFiles: !publicationsHealthMessage,
    publicationsHealthMessage,
    publicationsHealthMessageLink
  };
}

const mapDispatchToProps = {
  closeResourceManager,
  openMetadataFile,
  getManifestResources,
  downloadResources,
  addManifestResources,
  checkPublicationsHealth
};

const materialStyles = theme => ({
  appBar: {
    position: 'sticky'
  },
  errorBar: {
    color: theme.palette.secondary.light,
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
  fab: {
    margin: 0,
    top: 'auto',
    right: 20,
    bottom: 20,
    left: 'auto',
    position: 'sticky',
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
    selectAll: true
  }

  componentDidMount() {
    const { bundleId } = this.props;
    this.props.getManifestResources(bundleId);
    if (this.isAddFilesMode()) {
      this.props.checkPublicationsHealth(bundleId);
    }
  }


  componentDidUpdate(prevProps) {
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
  }

  handleClickOk = () => {
    if (this.isDownloadMode()) {
      this.handleDownload();
      this.handleClose();
    } else if (this.isAddFilesMode()) {
      this.handleAddFiles();
      // this.handleClose(); // seems to hang with too many requests
    }
  }

  handleDownload = () => {
    const { selectedIds = [] } = this.state;
    const { bundleId } = this.props;
    this.props.downloadResources(bundleId, selectedIds);
  }

  handleAddFiles = () => {
    const { bundleId } = this.props;
    const selectedResources = this.getSelectedResources();
    const filesToContainers = selectedResources.reduce((acc, selectedResource) =>
      ({ ...acc, [selectedResource.id]: formatUriForApi(selectedResource) }), {});
    this.props.addManifestResources(bundleId, filesToContainers);
  }

  handleClose = () => {
    this.props.closeResourceManager(this.props.bundleId);
  };

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  handleGoFixError = () => {
    history.push(this.props.publicationsHealthMessageLink);
  }

  onSelectedIds = (selectedIds) => {
    this.setState({ selectedIds, selectAll: false });
  }

  shouldDisableDownload = () => {
    const { selectedIds = [] } = this.state;
    return selectedIds.length === 0;
  }

  shouldDisableAddFiles = () => {
    const { selectedIds = [] } = this.state;
    const { isOkToAddFiles = false } = this.props;
    return selectedIds.length === 0 || !isOkToAddFiles || this.hasAnySelectedUnassignedContainers();
  }

  getUpdatedTotalResources(filePath, update) {
    const { totalResources } = this.state;
    return createUpdatedTotalResources(totalResources, filePath, update);
  }

  updateAddedResourcesWithFileStats = (newlyAddedFilePaths) => () => {
    newlyAddedFilePaths.forEach(async filePath => {
      const stats = await fs.stat(filePath);
      const { size: sizeRaw } = stats;
      const size = formatBytesByKbs(sizeRaw);
      const checksum = await md5File(filePath);
      const totalResources = this.getUpdatedTotalResources(filePath, { size, checksum });
      this.setState({ totalResources });
    });
  }

  updateSelectedResourcesContainers = (newContainer) => {
    const { totalResources: origTotalResources, selectedIds } = this.state;
    const totalResources = selectedIds.reduce((acc, filePath) => {
      const container = formatContainer(newContainer);
      const updatedTotalResources = createUpdatedTotalResources(
        acc,
        filePath, { container }
      );
      return updatedTotalResources;
    }, origTotalResources);
    return totalResources;
  }

  updateSelectedResourcesContainersSetState = (newContainer) => {
    const totalResources = this.updateSelectedResourcesContainers(newContainer);
    this.setState({ totalResources });
  }

  handleAddByFile = () => {
    const newAddedFilePaths = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    console.log(newAddedFilePaths);
    if (!newAddedFilePaths) {
      return;
    }
    const { addedFilePaths: origAddedFilePaths = [] } = this.state;
    const addedFilePaths = utilities.union(origAddedFilePaths, newAddedFilePaths);
    const { selectedIds: origSelectedIds } = this.state;
    const selectedIds = utilities.union(origSelectedIds, addedFilePaths);
    this.setState({ addedFilePaths, selectedIds }, this.updateTotalResources(newAddedFilePaths));
  };

  handleAddByFolder = async () => {
    const folderPaths = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] });
    console.log(folderPaths);
    if (!folderPaths) {
      return;
    }
    const parentDir = path.resolve(folderPaths[0], '..');
    const readAllDirs = folderPaths.map(folder => recursiveReadDir(folder).then(results => ({ folder, paths: results.map(filePath => filePath.substr(parentDir.length)) })));
    const allFilePaths = await Promise.all(readAllDirs);
    const flattenedFilePaths = allFilePaths.reduce((acc, info) => [...acc, ...info.paths], []);
    console.log(flattenedFilePaths);
  };

  updateTotalResources = (newAddedFilePaths) => () => {
    const { manifestResources } = this.props;
    const { totalResources = manifestResources } = this.state;
    const otherResources = totalResources.filter(r => !newAddedFilePaths.includes(r.id));
    const newlyAddedResources = newAddedFilePaths.map(createAddedResource);
    this.setState(
      { totalResources: [...otherResources, ...newlyAddedResources] },
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
            OkButtonLabel: 'Download',
            OkButtonIcon: <FileDownload className={classNames(classes.leftIcon)} />,
            OkButtonDisable: this.shouldDisableDownload
          }
        };
      case 'addFiles':
        return {
          mode,
          appBar: {
            title: 'Add resources',
            OkButtonLabel: 'Add',
            OkButtonIcon: <CheckIcon className={classNames(classes.leftIcon)} />,
            OkButtonDisable: this.shouldDisableAddFiles
          }
        };
      default:
        return { appBar: { title: '', OkButtonLabel: '', OkButtonIcon: (null) } };
    }
  }

  getHandleAddByFile = () => (
    (this.isAddFilesMode() && this.props.isOkToAddFiles) ? this.handleAddByFile : null
  )

  getHandleAddByFolder = () => (
    (this.isAddFilesMode() && this.props.isOkToAddFiles) ? this.handleAddByFolder : null
  )

  getAllSuggestions = (totalResources) => {
    const { mode } = this.props;
    if (mode !== 'addFiles') {
      return null;
    }
    return mapSuggestions(sort(utilities.union(totalResources
      .filter(r => r.container !== NEED_CONTAINER)
      .map(r => r.container), ['/'])).asc());
  }

  getSuggestions = (value, reason) => {
    console.log({ getSuggestions: true, value, reason });
    const inputValue = value ? value.trim() : null;
    const updatedResources = this.updateSelectedResourcesContainers(value || '');
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

  getSelectedResources = () => {
    const { manifestResources } = this.props;
    const { totalResources = manifestResources, selectedIds } = this.state;
    const selectedIdSet = new Set(selectedIds);
    return totalResources.filter(r => selectedIdSet.has(r.id));
  }

  hasAnySelectedUnassignedContainers = () => {
    const { manifestResources } = this.props;
    const { totalResources = manifestResources, selectedIds } = this.state;
    const selectedIdSet = new Set(selectedIds);
    const resourcesWithUnassignedContainers =
      totalResources
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

  render() {
    const {
      classes, open, selectedBundle = {}, columnConfig, manifestResources,
      publicationsHealthMessage = ''
    } = this.props;
    const { selectAll, totalResources = manifestResources } = this.state;
    const { displayAs = {} } = selectedBundle;
    const { languageAndCountry, name } = displayAs;
    const modeUi = this.modeUi();
    return (
      <Zoom in={open}>
        <div>
          <AppBar className={classes.appBar}>
            <Toolbar className={classes.toolBar}>
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                {modeUi.appBar.title}: <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              <Button
                key="btnOk" color="inherit" onClick={this.handleClickOk}
                disabled={modeUi.appBar.OkButtonDisable()}
              >
                {modeUi.appBar.OkButtonIcon}
                {modeUi.appBar.OkButtonLabel}
              </Button>
            </Toolbar>
          </AppBar>
          {this.isAddFilesMode() && publicationsHealthMessage &&
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
          <EnhancedTable
            data={totalResources}
            columnConfig={columnConfig}
            secondarySorts={secondarySorts}
            defaultOrderBy="container"
            onSelectedRowIds={this.onSelectedIds}
            selectAll={selectAll}
            handleAddByFile={this.getHandleAddByFile()}
            handleAddByFolder={this.getHandleAddByFolder()}
            getSuggestions={this.getSuggestions}
            onAutosuggestInputChanged={this.handleAutosuggestInputChanged}
          />
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
