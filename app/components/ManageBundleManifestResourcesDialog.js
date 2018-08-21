import React, { Component } from 'react';
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

function createResourceData(manifestResourceRaw, fileStoreInfo) {
  const { uri = '', checksum = '', size: sizeRaw = 0, mimeType = '' } = manifestResourceRaw;
  const container = path.dirname(uri);
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = (Math.round(Number(sizeRaw) / 1024)).toLocaleString();
  const id = uri;
  const status = fileStoreInfo ? 'stored' : '';
  const disabled = status === 'stored';
  return {
    id, uri, status, mimeType, container, name, size, checksum, disabled
  };
}

function isNumeric(columnName) {
  return ['size'].includes(columnName);
}

function getLabel(columnName) {
  return ['size'].includes(columnName) ? 'size (kb)' : null;
}

function createColumnNames() {
  const { id, disabled, ...columns } = createResourceData({}, {});
  return Object.keys(columns).map(c => ({ name: c, type: isNumeric(c) ? 'numeric' : 'string', label: getLabel(c) }));
}

const getRawManifestResources = (state) => state.bundleManageResources.rawManifestResources || {};
const getStoredFiles = (state) => state.bundleManageResources.storedFiles;

const makeGetManifestResourcesData = () => createSelector(
  [getRawManifestResources, getStoredFiles],
  (rawManifestResources, storedFiles) =>
    Object.values(rawManifestResources).map(r => createResourceData(r, storedFiles[r.uri]))
);

const { shell } = require('electron');

function mapStateToProps(state) {
  const { bundleManageResources, bundles, bundleEditMetadata } = state;
  const { bundleId } = bundleManageResources;
  const { showMetadataFile } = bundleEditMetadata;
  const { addedByBundleIds } = bundles;
  const columnConfig = createColumnNames();
  const getManifestResourceData = makeGetManifestResourcesData();
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  return {
    open: Boolean(bundleId),
    bundleId,
    selectedBundle,
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
});

type Props = {
  classes: {},
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
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
    anchorEl: null
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

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  render() {
    const {
      classes, open, selectedBundle = {}, manifestResources = [], columnConfig
    } = this.props;
    const { anchorEl } = this.state;
    const { displayAs = {} } = selectedBundle;
    const { languageAndCountry, name } = displayAs;
    return (
      <Zoom in={open}>
        <div>
          <AppBar className={classes.appBar}>
            <Toolbar className={classes.toolBar}>
              <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={classes.flex}>
                Download resources: <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              <Button
                key="btnSave" color="inherit" onClick={this.handleDownload}
                disabled={this.shouldDisableOkButton()}
              >
                <FileDownload className={classNames(classes.leftIcon)} />
                Download
              </Button>
            </Toolbar>
          </AppBar>
          <EnhancedTable
            data={manifestResources}
            columnConfig={columnConfig}
            onSelectedRowIds={this.onSelectedUris}
          />
          <input
            className={classes.input}
            id="contained-button-file-by-folder"
            type="file"
            name="filesByFolder"
            webkitdirectory=""
            onChange={this.handleChange}
          />
          <input
            className={classes.input}
            id="contained-button-file"
            multiple
            type="file"
            name="files"
            onChange={this.handleChange}
          />
          <Button
            aria-owns={anchorEl ? 'simple-menu' : null}
            aria-haspopup="true"
            onClick={this.handleClick}
            variant="fab"
            color="primary"
            aria-label="Add"
            className={classes.button}
          >
            <AddIcon />
          </Button>
          <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={this.handleClose}
          >
            <label htmlFor="contained-button-file">
              <MenuItem onClick={this.handleClose}>by File</MenuItem>
            </label>
            <label htmlFor="contained-button-file-by-folder">
              <MenuItem onClick={this.handleClose}>by Folder</MenuItem>
            </label>
          </Menu>
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
