import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import { Set } from 'immutable';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import { fetchAll, setupBundlesEventSource } from '../actions/bundle.actions';
import { ux } from '../utils/ux';
import { emptyArray, emptyFunction } from '../utils/defaultValues';
import EnhancedTable from './EnhancedTable';
import EntryRowExpandedRow from './EntryRowExpandedRow';
import EntryRowCustomBodyRenderings from './EntryRowCustomBodyRenderings';
import { saveSearchInput } from '../actions/bundleFilter.actions';

type Props = {
  fetchAllEntries: () => {},
  setupEntryBundlesEventSource: () => {},
  saveEntriesSearchInput: () => {},
  bundleItems: [],
  entriesData: [],
  starredEntries: [],
  searchText: string
};

const mapDispatchToProps = {
  fetchAllEntries: fetchAll,
  setupEntryBundlesEventSource: setupBundlesEventSource,
  saveEntriesSearchInput: saveSearchInput
};

function createEntryRowData(bundle, starredEntries = Set()) {
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
  const starred = starredEntries.has(dblId) ? 'starred' : 'unstarred';
  return {
    id,
    starred,
    medium,
    'language-country': languageAndCountry,
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

const getStarredEntries = state =>
  state.bundlesFilter.starredEntries || emptyArray;

const getSearchInput = state => state.bundlesFilter.searchInputRaw;

function mapStateToProps(state) {
  const { bundles } = state;
  const bundleItems = bundles.items || emptyArray;
  const starredEntries = getStarredEntries(state);
  const entriesData = bundleItems.map(item =>
    createEntryRowData(item, starredEntries)
  );
  const searchText = getSearchInput(state);
  console.log('mapStateToProps');
  return {
    bundleItems,
    entriesData,
    starredEntries,
    searchText
  };
}

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

  getColumnsConfigWithCustomBodyRenderings = () => {
    console.log('getColumnsConfigWithCustomBodyRenderings');
    return basicColumnsConfig.map(c => {
      switch (c.name) {
        case 'dblId': {
          return { ...c, options: { display: 'excluded' } };
        }
        case 'starred':
        case 'medium':
        case 'language-country':
        case 'name':
        case 'revision':
        case 'license':
        case 'rightsHolders':
        case 'status': {
          return {
            ...c,
            options: {
              customBodyRender: (value, tableMeta) => {
                return (
                  <EntryRowCustomBodyRenderings
                    columnName={c.name}
                    cellValue={value}
                    tableMeta={tableMeta}
                  />
                );
              }
            }
          };
        }
        default:
          return c;
      }
    });
  };

  getTableOptions = () => {
    const { searchText, saveEntriesSearchInput } = this.props;
    return {
      selectableRows: 'none',
      expandableRows: true,
      sort: false,
      searchText,
      onSearchChange: saveEntriesSearchInput,
      renderExpandableRow: (rowData, rowMeta) => {
        const colSpan = rowData.length + 1;
        const { dataIndex } = rowMeta;
        const { bundleItems } = this.props;
        const bundle = bundleItems[dataIndex];
        return (
          <TableRow>
            <TableCell colSpan={colSpan}>
              <EntryRowExpandedRow bundleId={bundle.id} {...bundle} />
            </TableCell>
          </TableRow>
        );
      }
    };
  };

  render() {
    const { entriesData, searchText } = this.props;
    const columnsConfigWithCustomBodyRenderings = this.getColumnsConfigWithCustomBodyRenderings();
    console.log('Rendering Bundles');
    if (searchText === undefined) {
      return null; // wait until we've loaded search/filter settings from disk
    }
    return (
      <div>
        <EnhancedTable
          data={entriesData}
          title="Entries"
          columnConfig={columnsConfigWithCustomBodyRenderings}
          orderBy="language-country"
          secondarySorts={emptyArray}
          orderDirection="asc"
          onSelectedRowIds={emptyFunction}
          onChangeSort={emptyFunction}
          selectedIds={emptyArray}
          tableOptions={this.getTableOptions()}
        />
      </div>
    );
  }
}

const materialStyles = theme => ux.getDblRowStyles(theme);

export default compose(
  withStyles(materialStyles),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(Bundles);
