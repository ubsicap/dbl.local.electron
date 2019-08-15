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
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { openEntryReports } from '../actions/report.actions';
import { closeEntryDrawer } from '../actions/entryAppBar.actions';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  theme: {},
  bundleId: string,
  activeBundle: {},
  openDrawer: boolean,
  hideEntryDrawer: () => {},
  openEntryMetadataFile: () => {},
  openEditEntryMetadata: () => {},
  openEntryResourceManager: () => {},
  switchToEntryReports: () => {}
};

function mapStateToProps(state, props) {
  const { id: bundleId } = props.activeBundle;
  return {
    bundleId,
    openDrawer: state.entryAppBar.openDrawer
  };
}

const mapDispatchToProps = {
  openEntryMetadataFile: openMetadataFile,
  openEditEntryMetadata: openEditMetadata,
  openEntryResourceManager: openResourceManager,
  hideEntryDrawer: closeEntryDrawer,
  switchToEntryReports: openEntryReports
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  ...ux.getEntryUxStyles(theme)
});

class EntryDrawer extends PureComponent<Props> {
  props: Props;

  getResourceMode = () => {
    const { activeBundle } = this.props;
    const { status } = activeBundle;
    const mode = status === 'DRAFT' ? 'addFiles' : 'download';
    return mode;
  };

  getDrawerItems = () => [
    {
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
      label: 'Upload to DBL',
      icon: ux.getModeIcon('upload'),
      handleClick: this.handleSwitchToReports
    }
  ];

  renderListItem = item => (
    <ListItem button key={item.label} onClick={item.handleClick}>
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItem>
  );

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

  handleSwitchToReports = () => {
    const { switchToEntryReports, bundleId } = this.props;
    switchToEntryReports(bundleId, 'reports');
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
        <Divider />
        <MaterialUiList>
          <ListItem
            button
            key="metadataXml"
            onClick={this.handleOpenMetadataXml}
          >
            <ListItemIcon>
              <OpenInNew />
            </ListItemIcon>
            <ListItemText primary="Review metadata.xml" />
          </ListItem>
        </MaterialUiList>
        <Divider />
        <MaterialUiList>{items.map(this.renderListItem)}</MaterialUiList>
        {/*
        <Divider />
        <MaterialUiList>
          {['Make Revision', 'Export To', 'Copy As'].map((text, index) => (
            <ListItem button key={text}>
              <ListItemIcon>{index % 2 === 0 ? <InboxIcon /> : <MailIcon />}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </MaterialUiList>
        */}
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
