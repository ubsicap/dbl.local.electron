import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import CircularProgress from 'material-ui/CircularProgress';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import DBLEntryRow from './DBLEntryRow';
import { mockFetchAll, fetchAll,
  setupBundlesEventSource } from '../actions/bundle.actions';

type Props = {
  fetchAll: () => {},
  mockFetchAll: () => {},
  setupBundlesEventSource: () => {},
  bundles: {},
  bundlesFilter: {},
  authentication: {}
};

function mapStateToProps(state) {
  const { bundles, bundlesFilter: origBundlesFilter, authentication } = state;
  const bundlesMatching = origBundlesFilter.searchResults ?
    origBundlesFilter.searchResults.bundlesMatching : {};
  const bundlesFilter = {
    isLoading: origBundlesFilter.isLoading || false,
    isSearchActive: origBundlesFilter.isSearchActive || false,
    bundlesMatching
  };
  return {
    bundles,
    bundlesFilter,
    authentication
  };
}

const mapDispatchToProps = {
  fetchAll,
  mockFetchAll,
  setupBundlesEventSource
};

class Bundles extends PureComponent<Props> {
  props: Props;
  componentDidMount() {
    if (history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO) {
      this.props.mockFetchAll();
    } else {
      this.props.fetchAll();
    }
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

  displayRow = (bundle) => {
    const { bundlesFilter } = this.props;
    return !(bundlesFilter.isSearchActive) ||
     bundle.id in bundlesFilter.bundlesMatching;
  }

  render() {
    const { bundles, bundlesFilter } = this.props;
    return (
      <div>
        {(bundles.loading || bundlesFilter.isLoading) &&
          <div className="row" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={80} thickness={5} />
          </div>
        }
        {bundles.items && bundles.items.filter(this.displayRow).map((d) => (
          <DBLEntryRow
            key={d.id}
            bundleId={d.id}
            {...d}
            isSelected={bundles.selectedBundle && bundles.selectedBundle.id === d.id}
          />))}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Bundles);
