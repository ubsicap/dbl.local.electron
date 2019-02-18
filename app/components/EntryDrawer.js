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
import { openMetadataFile } from '../actions/bundleEditMetadata.actions';
import { ux } from '../utils/ux';


type Props = {
  classes: {},
  theme: {},
  bundleId: string,
  openDrawer: boolean,
  handleDrawerClose: () => {},
  openMetadataFile: () => {}
};


const mapDispatchToProps = {
  openMetadataFile,
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  errorBar: {
    color: theme.palette.secondary.light,
  },
  successBar: {
    color: theme.palette.primary.light,
  },
  toolBar: {
    paddingLeft: '10px',
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


class EntryDrawer extends PureComponent<Props> {
  props: Props;

  getDrawerItems = () => (
    [
      {
        label: 'Open metadata.xml',
        icon: <OpenInNew />,
        handleClick: this.handleOpenMetadata
      }
    ]
  );

  handleOpenMetadata = () => {
    this.props.openMetadataFile(this.props.bundleId);
  }

  renderListItem = (item) => (
    <ListItem button key={item.label} onClick={item.handleClick}>
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItem>
  );

  render() {
    const {
      classes
    } = this.props;
    const items = this.getDrawerItems();
    const { theme, openDrawer } = this.props;
    return (
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={openDrawer}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.drawerHeader}>
          <IconButton onClick={this.props.handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <Divider />
        <MaterialUiList>
          {items.map(this.renderListItem)}
        </MaterialUiList>
        { /*
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
    null,
    mapDispatchToProps
  )
)(EntryDrawer);
