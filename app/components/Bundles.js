import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import DBLEntryRow from './DBLEntryRow';
import { fetchAll, setupBundlesEventSource } from '../actions/bundle.actions';
import { ux } from '../utils/ux';
import { emptyArray } from '../utils/defaultValues';
import EnhancedTable from './EnhancedTable';
import MediumIcon from './MediumIcon';

type Props = {
  fetchAllEntries: () => {},
  setupEntryBundlesEventSource: () => {},
  isLoadingBundles: boolean,
  isSearchLoading: boolean,
  bundleItems: [],
  selectedDBLEntryId: ?string,
  authentication: {}
};

function createEntryRowData(bundle) {
  const {
    id,
    medium,
    displayAs: {
      languageAndCountry,
      name,
      dblId,
      revision,
      license,
      rightsHolders,
      status
    }
  } = bundle || { displayAs: {} };
  return {
    id,
    medium,
    languageAndCountry,
    name,
    dblId,
    revision,
    license,
    rightsHolders,
    status
  };
}

const columnsConfig = ux.mapColumns(
  createEntryRowData(),
  () => false,
  () => null
);

const columnsConfigWithCustomBodyRenderings = columnsConfig.map(c => {
  switch (c.name) {
    case 'medium': {
      const mediumIconProps = { style: { marginRight: '10px' } };
      return {
        ...c,
        customBodyRender: value => (
          <Button size="small" style={{ minWidth: '16px' }}>
            <MediumIcon medium={value} iconProps={mediumIconProps} />
            {value}
          </Button>
        )
      };
    }
    default:
      return c;
  }
});

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

  handleSelectedRowIds = () => {};

  render() {
    const {
      bundleItems,
      isSearchLoading,
      isLoadingBundles,
      selectedDBLEntryId
    } = this.props;
    const entriesData = bundleItems.map(createEntryRowData);
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
        <EnhancedTable
          data={entriesData}
          title="Entries"
          columnConfig={columnsConfigWithCustomBodyRenderings}
          orderBy="languageAndCountry"
          secondarySorts={emptyArray}
          orderDirection="asc"
          onSelectedRowIds={this.handleSelectedRowIds}
          onChangeSort={() => {}}
          selectedIds={emptyArray}
        />
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
