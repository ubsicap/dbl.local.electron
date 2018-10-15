import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

import { updateSearchInput, clearSearch } from '../actions/bundleFilter.actions';


function mapStateToProps(state) {
  const { bundlesFilter, bundles } = state;
  const { isSearchActive, searchResults } = bundlesFilter;
  const entriesMatching = (isSearchActive && searchResults) ? Object.keys(searchResults.bundlesMatching) : [];
  const entries = bundles.items;
  return {
    entries,
    entriesMatching,
    isSearchActive,
  };
}

const mapDispatchToProps = {
  updateSearchInput,
  clearSearch
};

type Props = {
    classes: {},
    entries: [],
    entriesMatching: [],
    isSearchActive: boolean
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
  }
});

class DblDotLocalAppBar extends React.PureComponent {
  props: Props;

  render() {
    const {
      classes, entries, entriesMatching, isSearchActive
    } = this.props;
    return (
      <AppBar position="sticky" className={classes.appBar}>
        <Toolbar>
          {isSearchActive &&
          <Typography variant="title" color="inherit" className={classes.textSmall}>
            {entriesMatching.length}/
          </Typography>}
          <Typography variant="title" color="inherit" className={classes.textSmall}>
            {entries.length}
          </Typography>
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
