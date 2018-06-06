import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import CircularProgress from 'material-ui/CircularProgress';
import { navigationConstants } from '../constants/navigation.constants';
import DBLEntryRow from './DBLEntryRow';
import { mockFetchAll, fetchAll,
  setupBundlesEventSource } from '../actions/bundle.actions';
import { updateSearchInput, clearSearch } from '../actions/bundleFilter.actions';
import styles from './Bundles.css';
import MenuAppBar from './MenuAppBar';

type Props = {
  fetchAll: () => {},
  mockFetchAll: () => {},
  setupBundlesEventSource: () => {},
  updateSearchInput: () => {},
  clearSearch: () => {},
  history: {},
  bundles: {},
  bundlesFilter: {},
  authentication: {}
};

function mapStateToProps(state) {
  const { bundles, bundlesFilter, authentication } = state;
  return {
    bundles,
    bundlesFilter,
    authentication
  };
}

const mapDispatchToProps = {
  fetchAll,
  mockFetchAll,
  setupBundlesEventSource,
  updateSearchInput,
  clearSearch
};

class Bundles extends PureComponent<Props> {
  props: Props;
  componentDidMount() {
    const { history, clearSearch: clearSearchResults } = this.props;
    if (history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO) {
      this.props.mockFetchAll();
    } else {
      this.props.fetchAll();
    }
    history.listen(() => {
      // clear search results on location change
      clearSearchResults();
    });
    console.log('Bundles did mount');
    const { authentication } = this.props;
    if (authentication.user) {
      this.props.setupBundlesEventSource(authentication);
    }
  }

  componentWillUnmount() {
    const { bundles } = this.props;
    console.log('Bundles did unmount');
    if (bundles.eventSource) {
      bundles.eventSource.close();
      console.log('bundles EventSource closed');
    }
  }

  onChangeSearchInput = (event) => {
    const inputValue = event.target.value;
    this.props.updateSearchInput(inputValue);
  }

  searchInputValue = () => {
    const { bundlesFilter } = this.props;
    return bundlesFilter.isSearchActive ? bundlesFilter.searchInputRaw : '';
  }

  render() {
    const { bundles, bundlesFilter } = this.props;
    return (
      <div className={styles.container} style={{ paddingTop: '68px' }} data-tid="container">
        <MenuAppBar
          onChangeSearchInput={this.onChangeSearchInput}
          searchInputValue={this.searchInputValue()}
        />
        <div>
          {bundles.loading &&
            <div className="row" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress size={80} thickness={5} />
            </div>
          }
          {bundles.items && bundles.items.filter((b) => displayRow(bundlesFilter, b)).map((d) => (
            <DBLEntryRow
              key={d.id}
              bundleId={d.id}
              {...d}
              isSelected={bundles.selectedBundle && bundles.selectedBundle.id === d.id}
            />))}
        </div>

      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Bundles);

function displayRow(bundlesFilter, bundle) {
  return !(bundlesFilter.isSearchActive) ||
   bundle.id in bundlesFilter.searchResults.bundlesMatching;
}
