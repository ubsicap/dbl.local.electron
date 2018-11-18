import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import ListIcon from '@material-ui/icons/List';
import ListAltIcon from '@material-ui/icons/FormatListNumberedRtl';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import { Button, Menu, MenuItem } from '@material-ui/core';

import { fetchDownloadQueueCounts, fetchUploadQueueCounts, removeExcessBundles } from '../actions/bundle.actions';

function mapStateToProps(state) {
  const { bundlesFilter, bundles } = state;
  const {
    downloadQueue = { nSpecs: 0, nAtoms: 0 },
    uploadQueue = { nSpecs: 0, nAtoms: 0 },
    allBundles
  } = bundles;
  const { isSearchActive, searchResults } = bundlesFilter;
  const entriesMatching = (isSearchActive && searchResults) ? Object.keys(searchResults.bundlesMatching) : [];
  const entries = bundles.items;
  return {
    entries,
    allBundles,
    entriesMatching,
    isSearchActive,
    downloadQueue,
    uploadQueue
  };
}

const mapDispatchToProps = {
  fetchDownloadQueueCounts,
  fetchUploadQueueCounts,
  removeExcessBundles
};

type Props = {
    classes: {},
    entries: [],
    allBundles: [],
    entriesMatching: [],
    isSearchActive: boolean,
    downloadQueue: {},
    uploadQueue: {},
    fetchDownloadQueueCounts: () => {},
    fetchUploadQueueCounts: () => {},
    removeExcessBundles: () => {}
};

const styles = theme => ({
  appBar: {
    top: 'auto',
    bottom: 0,
    position: 'fixed',
    backgroundColor: 'black'
  },
  textSmall: {
    fontSize: 16,
    fontFamily: 'monospace'
  },
  root: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  dblDotLocalBarItem: {
    marginRight: '20px'
  }
});

class DblDotLocalAppBar extends React.PureComponent {
  props: Props;
  state = {
    anchorElBundlesMenu: null
  }

  componentDidMount() {
    this.props.fetchDownloadQueueCounts();
    this.props.fetchUploadQueueCounts();
  }

  handleClickDeleteBundles = (event) => {
    this.setState({ anchorElBundlesMenu: event.currentTarget });
    event.stopPropagation();
  }

  handleCloseDeleteBundles = () => {
    this.props.removeExcessBundles();
    this.setState({ anchorElBundlesMenu: null });
  }

  render() {
    const {
      classes, entries, entriesMatching, isSearchActive, downloadQueue, uploadQueue, allBundles
    } = this.props;
    const { anchorElBundlesMenu } = this.state;
    return (
      <AppBar position="sticky" className={classes.appBar}>
        <Toolbar>
          <Tooltip title={`Entries${isSearchActive ? ' (Matching/Total)' : ''}`}>
            <Button color="inherit" className={classes.textSmall}>
              <div>
                <ListIcon />
                {isSearchActive ?
                  <Typography variant="title" color="inherit" className={classes.textSmall}>
                    {entriesMatching.length}/{entries.length}
                  </Typography>
                  :
                  <Typography variant="title" color="inherit" className={classes.textSmall}>
                    {entries.length}
                  </Typography>}
              </div>
            </Button>
          </Tooltip>
          <Tooltip title="Revisions">
            <Button
              color="inherit"
              className={classes.textSmall}
              aria-owns={anchorElBundlesMenu ? 'bundles-menu' : null}
              onClick={this.handleClickDeleteBundles}
            >
              <div>
                <ListAltIcon />
                <Typography variant="title" color="inherit" className={classes.textSmall}>
                  {allBundles.length}
                </Typography>
              </div>
            </Button>
          </Tooltip>
          <Menu
            id="bundles-menu"
            anchorEl={anchorElBundlesMenu}
            open={Boolean(anchorElBundlesMenu)}
            onClose={() => this.setState({ anchorElBundlesMenu: null })}
          >
            <MenuItem
              key="delete_empty_bundles"
              onClick={this.handleCloseDeleteBundles}
            >
                Delete Empty/Unused Revisions
            </MenuItem>
          </Menu>
          <div className={classes.flex} />
          <Tooltip title="Uploads (Entries/Atoms)">
            <div className={classes.dblDotLocalBarItem}>
              <ArrowUpwardIcon />
              <Typography variant="title" color="inherit" className={classes.textSmall}>
                {uploadQueue.nSpecs}/{uploadQueue.nAtoms}
              </Typography>
            </div>
          </Tooltip>
          <Tooltip title="Downloads (Entries/Resources)">
            <div className={classes.dblDotLocalBarItem}>
              <ArrowDownwardIcon />
              <Typography variant="title" color="inherit" className={classes.textSmall}>
                {downloadQueue.nSpecs}/{downloadQueue.nAtoms}
              </Typography>
            </div>
          </Tooltip>
        </Toolbar>
      </AppBar>
    );
  }
}

export default compose(
  withStyles(styles, { name: 'DblDotLocalAppBar' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(DblDotLocalAppBar);
