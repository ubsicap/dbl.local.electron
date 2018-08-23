import React, { Component } from 'react';
import fs from 'fs-extra';
import md5 from 'md5';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import CheckIcon from '@material-ui/icons/Check';
import OpenInNew from '@material-ui/icons/OpenInNew';
import FileDownload from '@material-ui/icons/CloudDownloadOutlined';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import path from 'path';
import { closeResourceManager, getManifestResources } from '../actions/bundleManageResources.actions';
import { downloadResources } from '../actions/bundle.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';

const { dialog } = require('electron').remote;

function formatBytesByKbs(bytes) {
  return (Math.round(Number(bytes) / 1024)).toLocaleString();
}

function createResourceData(manifestResourceRaw, fileStoreInfo, mode) {
  const { uri = '', checksum = '', size: sizeRaw = 0, mimeType = '' } = manifestResourceRaw;
  const container = path.dirname(uri);
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = formatBytesByKbs(sizeRaw);
  const id = uri;
  const status = fileStoreInfo ? 'stored' : '';
  const disabled = mode === 'addFiles' ? status !== 'add?' : status === 'stored';
  return {
    id, uri, status, container, name, size, checksum, mimeType, disabled
  };
}

function createAddedResource(filePath) {
  const fileName = path.basename(filePath);
  const [id, uri, name] = [filePath, fileName, fileName, fileName];
  return {
    id, uri, status: 'add?', mimeType: '', container: '', name, size: 0, checksum: '', disabled: false
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
  return Object.keys(columns).map(c => ({ name: c, type: isNumeric(c) ? 'numeric' : 'string', label: getLabel(c) }));
}

const getRawManifestResources = (state) => state.bundleManageResources.rawManifestResources || {};
const getStoredFiles = (state) => state.bundleManageResources.storedFiles;
const getMode = (state) => state.bundleManageResources.mode;

const makeGetManifestResourcesData = () => createSelector(
  [getRawManifestResources, getStoredFiles, getMode],
  (rawManifestResources, storedFiles, mode) =>
    Object.values(rawManifestResources).map(r => createResourceData(r, storedFiles[r.uri], mode))
);

const { shell } = require('electron');

function mapStateToProps(state) {
  const { bundleManageResources, bundles, bundleEditMetadata } = state;
  const { bundleId, mode } = bundleManageResources;
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
    columnConfig
  };
}

const mapDispatchToProps = {
  closeResourceManager,
  openMetadataFile,
  getManifestResources,
  downloadResources
};

const materialStyles = theme => ({
  appBar: {
    position: 'sticky'
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

type Props = {
  classes: {},
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
  mode: string,
  showMetadataFile: ?string,
  manifestResources: [],
  columnConfig: [],
  closeResourceManager: () => {},
  openMetadataFile: () => {},
  getManifestResources: () => {},
  downloadResources: () => {}
};

class ManageBundleManifestResourcesDialog extends Component<Props> {
  props: Props;
  state = {
    selectedUris: [],
    anchorEl: null,
    addedFilePaths: []
  }

  componentDidMount() {
    const { bundleId } = this.props;
    this.props.getManifestResources(bundleId);
  }


  componentDidUpdate(prevProps) {
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
  }

  handleDownload = () => {
    const { selectedUris = [] } = this.state;
    const { bundleId } = this.props;
    this.props.downloadResources(bundleId, selectedUris);
    this.handleClose();
  }

  handleClose = () => {
    this.props.closeResourceManager(this.props.bundleId);
  };

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  onSelectedUris = (selectedUris) => {
    this.setState({ selectedUris });
  }

  shouldDisableOkButton = () => {
    const { selectedUris } = this.state;
    return selectedUris.length === 0;
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  updateAddedResourcesWithFileStats() {
    const { addedFilePaths, totalResources: totalResourcesOrig = [] } = this.state;
    addedFilePaths.forEach(async filePath => {
      const stats = await fs.stat(filePath);
      const { size: sizeRaw } = stats;
      const size = formatBytesByKbs(sizeRaw);
      const buf = await fs.readFile(filePath);
      const checksum = md5(buf);
      const totalResources = totalResourcesOrig.map(r => (r.id === filePath ? { ...r, size, checksum } : r));
      this.setState({ totalResources });
    });
  }

  handleAddByFile = () => {
    this.handleCloseMenu();
    const addedFilePaths = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    this.setState({ addedFilePaths }, this.updateTotalResources);
    console.log(addedFilePaths);
  };

  handleAddByFolder = () => {
    this.handleCloseMenu();
    const filePaths = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] });
    console.log(filePaths);
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  updateTotalResources = () => {
    const { manifestResources } = this.props;
    const { addedFilePaths = [] } = this.state;
    const addedResources = addedFilePaths.map(createAddedResource);
    this.setState(
      { totalResources: [...manifestResources, ...addedResources] },
      this.updateAddedResourcesWithFileStats
    );
  }

  isAddFilesMode = () => this.props.mode === 'addFiles';
  isDownloadMode = () => this.props.mode === 'download';

  modeUi = () => {
    const { mode, classes } = this.props;
    switch (mode) {
      case 'download':
        return {
          appBar:
          {
            title: 'Download resources',
            OkButtonLabel: 'Download',
            OkButtonIcon: <FileDownload className={classNames(classes.leftIcon)} />
          }
        };
      case 'addFiles':
        return {
          appBar: {
            title: 'Add resources',
            OkButtonLabel: 'Add',
            OkButtonIcon: <CheckIcon className={classNames(classes.leftIcon)} />
          }
        };
      default:
        return { appBar: { title: '', OkButtonLabel: '', OkButtonIcon: (null) } };
    }
  }

  render() {
    const {
      classes, open, selectedBundle = {}, columnConfig, manifestResources
    } = this.props;
    const { anchorEl, totalResources = manifestResources } = this.state;
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
                key="btnSave" color="inherit" onClick={this.handleDownload}
                disabled={this.shouldDisableOkButton()}
              >
                {modeUi.appBar.OkButtonIcon}
                {modeUi.appBar.OkButtonLabel}
              </Button>
            </Toolbar>
          </AppBar>
          <EnhancedTable
            data={totalResources}
            columnConfig={columnConfig}
            secondarySorts={secondarySorts}
            onSelectedRowIds={this.onSelectedUris}
          />
          {this.isAddFilesMode() &&
          <div className="container">
            <Button
              aria-owns={anchorEl ? 'simple-menu' : null}
              aria-haspopup="true"
              onClick={this.handleClick}
              variant="fab"
              color="primary"
              aria-label="Add"
              className={classes.fab}
            >
              <AddIcon />
            </Button>
          </div>}
          {this.isAddFilesMode() &&
          <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={this.handleCloseMenu}
          >
            <MenuItem onClick={this.handleAddByFile}>by File</MenuItem>
            <MenuItem onClick={this.handleAddByFolder}>by Folder</MenuItem>
          </Menu>}
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
