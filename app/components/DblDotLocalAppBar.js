import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import ListIcon from '@material-ui/icons/List';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';

import { fetchDownloadQueueCounts, fetchUploadQueueCounts } from '../actions/bundle.actions';

function mapStateToProps(state) {
  const { bundlesFilter, bundles } = state;
  const {
    downloadQueue = { nSpecs: 0, nAtoms: 0 },
    uploadQueue = { nSpecs: 0, nAtoms: 0 }
  } = bundles;
  const { isSearchActive, searchResults } = bundlesFilter;
  const entriesMatching = (isSearchActive && searchResults) ? Object.keys(searchResults.bundlesMatching) : [];
  const entries = bundles.items;
  return {
    entries,
    entriesMatching,
    isSearchActive,
    downloadQueue,
    uploadQueue
  };
}

const mapDispatchToProps = {
  fetchDownloadQueueCounts,
  fetchUploadQueueCounts
};

type Props = {
    classes: {},
    entries: [],
    entriesMatching: [],
    isSearchActive: boolean,
    downloadQueue: {},
    uploadQueue: {},
    fetchDownloadQueueCounts: () => {},
    fetchUploadQueueCounts: () => {}
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

  componentDidMount() {
    this.props.fetchDownloadQueueCounts();
    this.props.fetchUploadQueueCounts();
  }

  render() {
    const {
      classes, entries, entriesMatching, isSearchActive, downloadQueue, uploadQueue
    } = this.props;
    return (
      <AppBar position="sticky" className={classes.appBar}>
        <Toolbar>
          <Tooltip title={`Entries${isSearchActive ? ' (Matching/Total)' : ''}`}>
            <div className={classes.dblDotLocalBarItem}>
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
          </Tooltip>
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
