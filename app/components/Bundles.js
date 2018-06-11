import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
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
  isLoadingBundles: boolean,
  isSearchLoading: boolean,
  eventSource: ?{},
  bundleItems: [],
  selectedBundleId: ?string,
  authentication: {}
};


function mapStateToProps(state) {
  const { authentication, bundles, bundlesFilter } = state;
  return {
    isLoadingBundles: bundles.loading || false,
    isSearchLoading: bundlesFilter.isLoading || false,
    bundleItems: bundles.items,
    eventSource: bundles.eventSource,
    selectedBundleId: bundles.selectedBundle ? bundles.selectedBundle.id : null,
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
    const { eventSource } = this.props;
    console.log('Bundles did unmount');
    if (eventSource) {
      eventSource.close();
      console.log('bundles EventSource closed');
    }
  }

  render() {
    const { bundleItems, isSearchLoading, isLoadingBundles, selectedBundleId } = this.props;
    return (
      <div>
        {(isLoadingBundles || isSearchLoading) &&
          <div
            className="row"
            style={{
 height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'
}}
          >
            <CircularProgress size={80} thickness={5} />
          </div>
        }
        {bundleItems && bundleItems.map((d) => (
          <DBLEntryRow
            key={d.id}
            bundleId={d.id}
            {...d}
            isSelected={selectedBundleId && selectedBundleId === d.id}
          />))}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Bundles);
