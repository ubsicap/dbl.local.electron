import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import CircularProgress from '@material-ui/core/CircularProgress';
import DBLEntryRow from './DBLEntryRow';
import { fetchAll, setupBundlesEventSource } from '../actions/bundle.actions';

type Props = {
  fetchAllEntries: () => {},
  setupEntryBundlesEventSource: () => {},
  isLoadingBundles: boolean,
  isSearchLoading: boolean,
  bundleItems: [],
  selectedDBLEntryId: ?string,
  authentication: {}
};

function mapStateToProps(state) {
  const { authentication, bundles, bundlesFilter } = state;
  return {
    isLoadingBundles: bundles.loading || false,
    isSearchLoading: bundlesFilter.isLoading || false,
    bundleItems: bundles.items,
    selectedDBLEntryId: bundles.selectedDBLEntryId,
    authentication
  };
}

const mapDispatchToProps = {
  fetchAllEntries: fetchAll,
  setupEntryBundlesEventSource: setupBundlesEventSource
};

class Bundles extends PureComponent<Props> {
  props: Props;

  componentDidMount() {
    const {
      bundleItems,
      setupEntryBundlesEventSource,
      fetchAllEntries
    } = this.props;
    if (bundleItems.length === 0) {
      setupEntryBundlesEventSource();
      fetchAllEntries();
    }
  }

  render() {
    const {
      bundleItems,
      isSearchLoading,
      isLoadingBundles,
      selectedDBLEntryId
    } = this.props;
    return (
      <div>
        {(isLoadingBundles || isSearchLoading) && (
          <div
            className="row"
            style={{
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <CircularProgress size={80} thickness={5} />
          </div>
        )}
        {bundleItems &&
          bundleItems.map(d => (
            <DBLEntryRow
              key={d.id}
              bundleId={d.id}
              {...d}
              isSelected={selectedDBLEntryId === d.dblId}
            />
          ))}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Bundles);
