import React, { PureComponent } from 'react';
import { Set } from 'immutable';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import DblDotLocalAppBar from '../components/DblDotLocalAppBar';
import { createNewBundle } from '../actions/bundle.actions';
import { setEntriesFilters, setStarredEntries } from '../actions/bundleFilter.actions';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';
import { workspaceHelpers } from '../helpers/workspaces.helpers';
import MediumIcon from '../components/MediumIcon';

type Props = {
  classes: {},
  newMediaTypes: [],
  entriesFilters: {},
  starredEntries: [],
  createNewBundle: () => {},
  setStarredEntries: () => {},
  setEntriesFilters: () => {}
};

function mapStateToProps(state) {
  const { bundles } = state;
  const { newMediaTypes = [] } = bundles;
  const { workspaceFullPath, email } = workspaceHelpers.getCurrentWorkspaceFullPath(state);
  const entriesFilters =
    workspaceUserSettingsStoreServices.loadEntriesFilters(workspaceFullPath, email);
  const starredEntries =
    workspaceUserSettingsStoreServices.loadStarredEntries(workspaceFullPath, email);
  return {
    newMediaTypes,
    entriesFilters,
    starredEntries
  };
}

const materialStyles = () => ({
  fab: {
    position: 'fixed',
    bottom: '100px',
    right: '20px'
  },
});

const mapDispatchToProps = {
  createNewBundle,
  setStarredEntries,
  setEntriesFilters
};

class BundlesPage extends PureComponent<Props> {
  props: Props;
  state = {
    anchorEl: null
  }

  componentDidMount() {
    this.props.setEntriesFilters(this.props.entriesFilters);
    this.props.setStarredEntries(Set(this.props.starredEntries));
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleCreateNew = (medium) => () => {
    this.handleCloseMenu();
    this.props.createNewBundle(medium);
  };

  render() {
    const { classes, newMediaTypes } = this.props;
    const { anchorEl } = this.state;
    return (
      <div data-tid="container">
        <MenuAppBar showSearch showClipboard title="Entries" showLogout />
        <Bundles />
        <div style={{ paddingBottom: '100px' }} />
        <Tooltip title="Create new...">
          <Fab
            aria-owns={anchorEl ? 'simple-menu' : null}
            aria-haspopup="true"
            onClick={this.handleClick}
            color="primary"
            aria-label="Add"
            className={classes.fab}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleCloseMenu}
        >
          {newMediaTypes.map(medium => (
            <MenuItem key={medium} onClick={this.handleCreateNew(medium)}>
              { <MediumIcon medium={medium} /> } { medium }
            </MenuItem>
          ))}
        </Menu>
        <DblDotLocalAppBar />
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'BundlesPage' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(BundlesPage);
