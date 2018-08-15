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
import Save from '@material-ui/icons/Save';
import classNames from 'classnames';
import Zoom from '@material-ui/core/Zoom';
import { closeResourceManager } from '../actions/bundleManageResources.actions';
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import rowStyles from './DBLEntryRow.css';

function mapStateToProps(state) {
  const { bundleManageResources, bundles } = state;
  const { bundleId } = bundleManageResources;
  const { addedByBundleIds } = bundles;
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  return {
    open: Boolean(bundleId),
    bundleId,
    selectedBundle
  };
}

const mapDispatchToProps = {
  closeResourceManager,
  openMetadataFile
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
  closeResourceManager: () => {},
  openMetadataFile: () => {}
};

class ManageBundleManifestResourcesDialog extends PureComponent<Props> {
  props: Props;

  handleClose = () => {
    this.props.closeResourceManager(this.props.bundleId);
  };

  handleReview = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  render() {
    const { classes, open, selectedBundle = {} } = this.props;
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
                Manage resources: <span className={rowStyles.languageAndCountryLabel}>{languageAndCountry} </span> {name}
              </Typography>
              <Button key="btnOpenXml" color="inherit" disable={this.props.showMetadataFile} onClick={this.handleReview}>
                <OpenInNew className={classNames(classes.leftIcon, classes.iconSmall)} />
                Review
              </Button>
              <Button key="btnSave" color="inherit" onClick={this.handleClose}>
                <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
                Save
              </Button>
            </Toolbar>
          </AppBar>
          Show resources here
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
