import React, { PureComponent } from 'react';
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
import {
  loadEntriesFilters,
  loadStarredEntries,
  loadSearchInput
} from '../actions/bundleFilter.actions';
import MediumIcon from '../components/MediumIcon';

type Props = {
  classes: {},
  newMediaTypes: [],
  createNewEntry: () => {},
  loadStarredEntriesFromDisk: () => {},
  loadEntriesFiltersFromDisk: () => {},
  loadSearchInputFromDisk: () => {}
};

function mapStateToProps(state) {
  const { bundles } = state;
  const { newMediaTypes = [] } = bundles;
  return {
    newMediaTypes
  };
}

const materialStyles = () => ({
  fab: {
    position: 'fixed',
    bottom: '100px',
    right: '20px'
  }
});

const mapDispatchToProps = {
  createNewEntry: createNewBundle,
  loadStarredEntriesFromDisk: loadStarredEntries,
  loadEntriesFiltersFromDisk: loadEntriesFilters,
  loadSearchInputFromDisk: loadSearchInput
};

class BundlesPage extends PureComponent<Props> {
  props: Props;

  state = {
    anchorEl: null
  };

  componentDidMount() {
    const {
      loadEntriesFiltersFromDisk,
      loadStarredEntriesFromDisk,
      loadSearchInputFromDisk
    } = this.props;
    loadStarredEntriesFromDisk();
    loadSearchInputFromDisk();
    loadEntriesFiltersFromDisk();
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleCreateNew = medium => () => {
    this.handleCloseMenu();
    const { createNewEntry } = this.props;
    createNewEntry(medium);
  };

  render() {
    const { classes, newMediaTypes } = this.props;
    const { anchorEl } = this.state;
    return (
      <div data-tid="container">
        <MenuAppBar showClipboard title="Entries" />
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
              {<MediumIcon medium={medium} />} {medium}
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
  )
)(BundlesPage);
