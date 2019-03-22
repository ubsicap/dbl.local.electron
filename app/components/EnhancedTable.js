import React, { Component } from 'react';
import MUIDataTable from 'mui-datatables';
import { withStyles } from '@material-ui/core/styles';
import sort from 'fast-sort';
import Paper from '@material-ui/core/Paper';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import Typography from '@material-ui/core/Typography';
import { emptyObject } from '../utils/defaultValues';

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 3,
  },
  table: {
    minWidth: 1020,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  stickyHeaderClass: {
    position: 'sticky',
    top: 118
  },
  toolBarSelectTitleSelected: {
    top: '50%', position: 'relative', paddingRight: '26px', transform: 'translateY(-50%)'
  }
});

type Props = {
  classes: {},
  data: [],
  sortedData: [],
  selectableData: [],
  orderDirection?: string,
  orderBy: string,
  columnConfig: [],
  columns: [],
  secondarySorts: [],
  selectedIds: [],
  selectedDataIndexes: [],
  multiSelections?: boolean,
  customSorts?: {},
  freezeCheckedColumnState?: boolean,
  title?: string,
  onSelectedRowIds: () => {},
  onChangeSort: () => {}
};

const defaultProps = {
  orderDirection: 'asc',
  customSorts: emptyObject,
  multiSelections: false,
  freezeCheckedColumnState: false,
  title: undefined
};

function getSortMethod(customSorts, orderBy) {
  const customSort = customSorts[orderBy];
  if (customSort) {
    return customSort;
  }
  return orderBy;
}

const getData = (state, props) => props.data;
const getSecondarySorts = (state, props) => props.secondarySorts;
const getCustomSorts = (state, props) =>
  props.customSorts || defaultProps.customSorts;
const getOrderBy = (state, props) =>
  props.orderBy || this.props.columnConfig[0].name;
const getOrderDirection = (state, props) =>
  props.orderDirection || defaultProps.orderDirection;

const getSortedDataSelector = createSelector(
  [getData, getSecondarySorts, getCustomSorts, getOrderBy, getOrderDirection],
  getSortedData
);

/* TODO
  state = {
    order: this.props.orderDirection,
    orderBy: this.props.orderBy || this.props.columnConfig[0].name,
    selectedRowIds: this.props.selectedIds
  };
*/
function getSortedData(data, secondarySorts, customSorts, orderBy, order) {
  const secondaryOrderBys = secondarySorts.filter(s => s !== orderBy).map((s) =>
    ({ asc: getSortMethod(customSorts, s) }));
  const orderByConfig = [{ [order]: getSortMethod(customSorts, orderBy) }, ...secondaryOrderBys];
  const sorted = sort(data).by(orderByConfig);
  return sorted;
}

const getColumnConfig = (state, props) => props.columnConfig;
const getSelectedRowIds = (state, props) => props.selectedIds;

const getSelectedDataIndexesSelector =
  createSelector([getData, getSelectedRowIds], getSelectedDataIndexes);

function getSelectedDataIndexes(data, selectedIds) {
  const dataIdToIndex = data.reduce((acc, row, index) => { acc[row.id] = index; return acc; }, {});
  return selectedIds.map(rowId => dataIdToIndex[rowId]);
}

const getSelectableDataSelector = createSelector([getData], getSelectableData);

function getSelectableData(data) {
  return data.filter(d => !d.disabled);
}

const getColumnsSelector = createSelector(
  [getColumnConfig, getSortedDataSelector, getOrderBy, getOrderDirection],
  getColumns
);

function getColumns(
  columnConfig,
  sortedData,
  orderBy,
  orderDirection,
) {
  const columns = columnConfig.map(c => ({
    name: c.name,
    label: c.label,
    options: {
      filter: !(['name', 'size'].includes(c.name)),
      ...getSortDirection(c, orderBy, orderDirection),
      setCellProps: (row, dataIndex) => getCellProps(c, row, dataIndex, sortedData),
    }
  }));
  return columns;
}

function getSortDirection(columnData, orderBy, orderDirection) {
  return (columnData.name === orderBy) ? { sortDirection: orderDirection } : {};
}

function getCellProps(columnData, row, dataIndex, sortedData) {
  const fullRowData = sortedData[dataIndex] || emptyObject;
  const { disabled = false } = fullRowData;
  // how can I right-align header as well?
  // columnData.type === 'numeric' ? { align: 'right' } : undefined;
  return disabled ? { style: { backgroundColor: 'lightgrey' } } : {};
}

function mapStateToProps(state, props) {
  const sortedData = getSortedDataSelector(state, props);
  const columns = getColumnsSelector(state, props);
  const selectableData = getSelectableDataSelector(state, props);
  const selectedDataIndexes = getSelectedDataIndexesSelector(state, props);
  return {
    sortedData,
    columns,
    selectableData,
    selectedDataIndexes
  };
}

class EnhancedTable extends Component<Props> {
  props: Props;

  handleRequestSort = (changedColumn: string, direction: string) => {
    const orderDirection = direction === 'descending' ? 'desc' : 'asc';
    this.props.onChangeSort({ order: orderDirection, orderBy: changedColumn });
  };

  reportSelectedRowIds = (selectedRowIds) => {
    this.props.onSelectedRowIds(selectedRowIds);
    return emptyObject;
  }

  handleRowsSelect = (currentRowsSelected: array, allRowsSelected: array) => {
    const { sortedData } = this.props;
    const currentDataIndexesSelected = currentRowsSelected.map(r => r.dataIndex);
    // there seems to be a bug in using rowsSelected in context of an filter active
    // (see https://github.com/gregnb/mui-datatables/issues/514)
    // for now remove duplicate dataIndexes (assuming the user is disabling a checkbox)
    const matchingDataIndexes =
      allRowsSelected
        .map(rowMeta => rowMeta.dataIndex)
        .filter(dataIndex => currentDataIndexesSelected.includes(dataIndex));
    const allSelectedIds =
    allRowsSelected
      .filter(filterOutDuplicateDataIndexes(matchingDataIndexes))
      .map(rowMeta => sortedData[rowMeta.dataIndex].id);
    if (!this.props.multiSelections && allSelectedIds.length > 0) {
      return this.reportSelectedRowIds([allSelectedIds[0]]);
    }
    return this.reportSelectedRowIds(allSelectedIds);
  }

  handleRowClick = (rowData, rowMeta: { dataIndex: number, rowIndex: number }) => {
    const { selectedDataIndexes, selectedIds, sortedData } = this.props;
    const fullRowData = sortedData[rowMeta.dataIndex];
    if (fullRowData.disabled) {
      return;
    }
    if (selectedDataIndexes.some(idx => rowMeta.dataIndex === idx)) {
      // remove
      return this.reportSelectedRowIds(selectedIds.filter(id => id !== fullRowData.id));
    }
    if (this.props.multiSelections) {
      return this.reportSelectedRowIds([...selectedIds, fullRowData.id]);
    }
    return this.reportSelectedRowIds([fullRowData.id]);
  };

  getCustomToolbarSelect = () => {
    const { title } = this.props;
    if (!title) {
      return emptyObject;
    }
    const { classes } = this.props;
    return {
      customToolbarSelect:
        (selectedRows, displayData, setSelectedRows) =>
          <div><Typography variant="h6" className={classes.toolBarSelectTitleSelected}>{title}</Typography></div>
    };
  }

  render() {
    const {
      classes, sortedData, columns, selectedDataIndexes, selectableData,
      freezeCheckedColumnState, title
    } = this.props;
    const customToolbarSelect = this.getCustomToolbarSelect();
    const options = {
      filterType: 'multiselect',
      fixedHeader: false,
      responsive: 'scroll',
      rowsSelected: selectedDataIndexes,
      onRowsSelect: this.handleRowsSelect,
      onRowClick: this.handleRowClick,
      selectableRows: selectableData.length > 0,
      isRowSelectable: (dataIndex) => !freezeCheckedColumnState && !sortedData[dataIndex].disabled,
      customSort: (data) => data,
      ...customToolbarSelect,
      onColumnSortChange: this.handleRequestSort,
    };
    return (
      <Paper className={classes.root}>
        <MUIDataTable
          title={title}
          data={sortedData}
          columns={columns}
          options={options}
        />
      </Paper>
    );
  }
}

EnhancedTable.defaultProps = defaultProps;

export default compose(
  withStyles(styles),
  connect(
    mapStateToProps,
    null
  ),
)(EnhancedTable);

function filterOutDuplicateDataIndexes(matchingDataIndexes) {
  return (rowMeta) => {
    const matchedDataIndexes =
    matchingDataIndexes.filter(dataIndex => dataIndex === rowMeta.dataIndex);
    return (matchedDataIndexes.length === 1 ?
      true : !matchedDataIndexes.includes(rowMeta.dataIndex));
  };
}
