import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
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
  authentication: {},
  entriesData: [],
  columnsConfigWithCustomBodyRenderings: []
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

const basicColumnsConfig = ux.mapColumns(
  createEntryRowData(),
  () => false,
  () => null
);

function getColumnsConfigWithCustomBodyRenderings(bundleItems, columnsConfig) {
  return columnsConfig.map(c => {
    switch (c.name) {
      case 'medium': {
        const mediumIconProps = { style: { marginRight: '10px' } };
        return {
          ...c,
          options: {
            customBodyRender: value => (
              <Button size="small" style={{ minWidth: '16px' }}>
                <MediumIcon medium={value} iconProps={mediumIconProps} />
                {value}
              </Button>
            )
          }
        };
      }
      case 'dblId': {
        return { ...c, options: { display: 'excluded' } };
      }
      case 'name': {
        return {
          ...c,
          options: {
            customBodyRender: (value, tableMeta) => {
              return (
                <Grid container direction="column">
                  <Grid item>
                    <Typography variant="body1">{value}</Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="caption">
                      {bundleItems[tableMeta.rowIndex].dblId}
                    </Typography>
                  </Grid>
                </Grid>
              );
            }
          }
        };
      }
      default:
        return c;
    }
  });
}

function mapStateToProps(state) {
  const { authentication, bundles, bundlesFilter } = state;
  const bundleItems = bundles.items;
  const entriesData = bundleItems.map(createEntryRowData);
  return {
    isLoadingBundles: bundles.loading || false,
    isSearchLoading: bundlesFilter.isLoading || false,
    bundleItems,
    selectedDBLEntryId: bundles.selectedDBLEntryId,
    authentication,
    entriesData,
    columnsConfigWithCustomBodyRenderings: getColumnsConfigWithCustomBodyRenderings(
      bundleItems,
      basicColumnsConfig
    )
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
      selectedDBLEntryId,
      entriesData,
      columnsConfigWithCustomBodyRenderings
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
