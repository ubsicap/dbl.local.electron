import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import OpenInNew from '@material-ui/icons/OpenInNew';
import FileDownload from '@material-ui/icons/CloudDownloadOutlined';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import path from 'path';
import { closeResourceManager, getManifestResources } from '../actions/bundleManageResources.actions';
import { downloadResources } from '../actions/bundle.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';


function createResourceData(manifestResourceRaw, fileStoreInfo) {
  const { uri = '', checksum = '', size: sizeRaw = 0, mimeType = '' } = manifestResourceRaw;
  const container = path.dirname(uri);
  const name = path.basename(uri);
  /* const ext = path.extname(uri); */
  const size = (Math.round(Number(sizeRaw) / 1024)).toLocaleString();
  const id = uri;
  const status = fileStoreInfo ? 'stored' : '';
  return {
    id, uri, status, mimeType, container, name, size, checksum
  };
}

function isNumeric(columnName) {
  return ['size'].includes(columnName);
}

function getLabel(columnName) {
  return ['size'].includes(columnName) ? 'size (kb)' : null;
}

function createColumnNames() {
  const { id, ...columns } = createResourceData({}, {});
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
  const columnNames = createColumnNames();
  const getManifestResourceData = makeGetManifestResourcesData();
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  return {
    open: Boolean(bundleId),
    bundleId,
    selectedBundle,
    showMetadataFile,
    manifestResources: getManifestResourceData(state),
    columnNames
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
});

type Props = {
  classes: {},
  open: boolean,
  bundleId: ?string,
  selectedBundle: {},
  showMetadataFile: ?string,
  manifestResources: [],
  columnNames: [],
  closeResourceManager: () => {},
  openMetadataFile: () => {},
  getManifestResources: () => {},
  downloadResources: () => {}
};

class ManageBundleManifestResourcesDialog extends PureComponent<Props> {
  props: Props;
  state = {
    selectedUris: []
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

  render() {
    const {
      classes, open, selectedBundle = {}, manifestResources = [], columnNames
    } = this.props;
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
              <Button key="btnSave" color="inherit" onClick={this.handleDownload}>
                <FileDownload className={classNames(classes.leftIcon)} />
                Download
              </Button>
            </Toolbar>
          </AppBar>
          <EnhancedTable data={manifestResources} columnNames={columnNames} />
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
