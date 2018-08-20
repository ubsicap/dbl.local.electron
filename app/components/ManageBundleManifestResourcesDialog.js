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
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';
import EnhancedTable from './EnhancedTable';


function createResourceData(resourceRaw) {
  const { uri = '', checksum = '', size = 0 } = resourceRaw;
  const container = path.dirname(uri);
  const name = path.basename(uri);
  const id = uri;
  return {
    id, uri, container, name, size, checksum
  };
}

function isNumeric(columnName) {
  return ['size'].includes(columnName);
}

function createColumnNames() {
  const { id, ...columns } = createResourceData({});
  return Object.keys(columns).map(c => ({ name: c, type: isNumeric(c) ? 'numeric' : 'string' }));
}

const getRawManifestResources = (state) => state.bundleManageResources.rawManifestResources || {};

const makeGetManifestResourcesData = () => createSelector(
  [getRawManifestResources],
  (rawManifestResources) => Object.values(rawManifestResources).map(createResourceData)
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
  getManifestResources
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
  getManifestResources: () => {}
};

class ManageBundleManifestResourcesDialog extends PureComponent<Props> {
  props: Props;

  componentDidMount() {
    const { bundleId } = this.props;
    this.props.getManifestResources(bundleId);
  }


  componentDidUpdate(prevProps) {
    if (this.props.showMetadataFile && !prevProps.showMetadataFile) {
      shell.openExternal(this.props.showMetadataFile);
    }
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
              <Button key="btnSave" color="inherit" onClick={this.handleClose}>
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
