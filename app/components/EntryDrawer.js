import React, { PureComponent } from 'react';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Drawer from '@material-ui/core/Drawer';
import MaterialUiList from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import OpenInNew from '@material-ui/icons/OpenInNew';
import {
  openMetadataFile,
  openEditMetadata
} from '../actions/bundleEditMetadata.actions';
import editMetadataService from '../services/editMetadata.service';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { openEntryReports } from '../actions/report.actions';
import { openUploadForm } from '../actions/uploadForm.actions';
import { closeEntryDrawer } from '../actions/entryAppBar.actions';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  theme: {},
  bundleId: string,
  activeBundle: {},
  openDrawer: boolean,
  formsWithErrors: [],
  hideEntryDrawer: () => {},
  openEntryMetadataFile: () => {},
  openEditEntryMetadata: () => {},
  openEntryResourceManager: () => {},
  switchToEntryReports: () => {},
  switchToUploadForm: () => {}
};

const getFormsErrors = editMetadataService.makeGetFormsErrors();

function mapStateToProps(state, props) {
  const { id: bundleId } = props.activeBundle;
  const formsWithErrors = Object.keys(
    getFormsErrors(state, props.activeBundle)
  );
  return {
    bundleId,
    formsWithErrors,
    openDrawer: state.entryAppBar.openDrawer
  };
}

const mapDispatchToProps = {
  openEntryMetadataFile: openMetadataFile,
  openEditEntryMetadata: openEditMetadata,
  openEntryResourceManager: openResourceManager,
  hideEntryDrawer: closeEntryDrawer,
  switchToEntryReports: openEntryReports,
  switchToUploadForm: openUploadForm
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  ...ux.getEntryUxStyles(theme)
});

class EntryDrawer extends PureComponent<Props> {
  props: Props;

  getBundleStatus = () => {
    const { activeBundle } = this.props;
    const { status } = activeBundle;
    return status;
  };

  getResourceMode = () => {
    const status = this.getBundleStatus();
    const mode = status === 'DRAFT' ? 'addFiles' : 'download';
    return mode;
  };

  shouldDisableUpload = () => {
    const status = this.getBundleStatus();
    const { formsWithErrors } = this.props;
    return status !== 'DRAFT' || formsWithErrors.length > 0;
  };

  getDrawerItems = () => {
    const { formsWithErrors } = this.props;
    const formsErrorCount = formsWithErrors.length;
    return [
      {
        badge: formsErrorCount,
        label: 'Metadata',
        icon: ux.getModeIcon('metadata'),
        handleClick: this.handleSwitchToMetadata
      },
      {
        label: 'Resources',
        icon: ux.getModeIcon(this.getResourceMode()),
        handleClick: this.handleSwitchToResources
      },
      {
        label: 'Revisions',
        icon: ux.getModeIcon('revisions'),
        handleClick: this.handleSwitchToRevisions
      },
      {
        label: 'Reports',
        icon: ux.getModeIcon('reports'),
        handleClick: this.handleSwitchToReports
      },
      {
        label: 'Action-Divider',
        type: 'divider'
      },
      {
        label: 'Review metadata.xml',
        icon: <OpenInNew />,
        handleClick: this.handleOpenMetadataXml
      },
      {
        label: 'Upload to DBL',
        icon: ux.getModeIcon('upload'),
        handleClick: this.handleSwitchToUploadForm,
        disabled: this.shouldDisableUpload()
      }
    ];
  };

  renderListItem = item => {
    if (item.type === 'divider') {
      return <Divider />;
    }
    const { classes } = this.props;
    return (
      <ListItem
        button
        key={item.label}
        onClick={item.handleClick}
        disabled={item.disabled}
      >
        <ListItemIcon>
          {ux.conditionallyRenderBadge(
            { className: classes.badge, color: 'error' },
            item.badge,
            item.icon
          )}
        </ListItemIcon>
        <ListItemText primary={item.label} />
      </ListItem>
    );
  };

  handleOpenMetadataXml = () => {
    const { openEntryMetadataFile, bundleId } = this.props;
    openEntryMetadataFile(bundleId);
  };

  handleSwitchToMetadata = () => {
    const { openEditEntryMetadata, bundleId } = this.props;
    openEditEntryMetadata(bundleId, undefined, false);
  };

  handleSwitchToResources = () => {
    const { openEntryResourceManager, bundleId } = this.props;
    const mode = this.getResourceMode();
    openEntryResourceManager(bundleId, mode, false);
  };

  handleSwitchToRevisions = () => {
    const { openEntryResourceManager, bundleId } = this.props;
    openEntryResourceManager(bundleId, 'revisions', false);
  };

  handleSwitchToUploadForm = () => {
    const { switchToUploadForm, bundleId } = this.props;
    switchToUploadForm(bundleId, 'reports');
  };

  handleSwitchToReports = () => {
    const { switchToEntryReports, bundleId } = this.props;
    switchToEntryReports(bundleId, 'reports');
  };

  handleSwitchToUploadForm = () => {
    const { switchToUploadForm, bundleId } = this.props;
    switchToUploadForm(bundleId);
  };

  render() {
    const { classes } = this.props;
    const items = this.getDrawerItems();
    const { theme, openDrawer, hideEntryDrawer } = this.props;
    return (
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="right"
        open={openDrawer}
        classes={{
          paper: classes.drawerPaper
        }}
      >
        <div className={classes.drawerHeader}>
          <IconButton onClick={hideEntryDrawer}>
            {theme.direction === 'rtl' ? (
              <ChevronLeftIcon />
            ) : (
              <ChevronRightIcon />
            )}
          </IconButton>
        </div>
        <MaterialUiList>{items.map(this.renderListItem)}</MaterialUiList>
      </Drawer>
    );
  }
}

export default compose(
  withStyles(materialStyles, { withTheme: true }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryDrawer);
