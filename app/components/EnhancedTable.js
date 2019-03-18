import React, { Component } from 'react';
import MuiTable from 'mui-table';
import { withStyles } from '@material-ui/core/styles';
import sort from 'fast-sort';
import Paper from '@material-ui/core/Paper';
import Checkbox from '@material-ui/core/Checkbox';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import { emptyObject, emptyArray } from '../utils/defaultValues';

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
  rowDisabled: {
    backgroundColor: 'lightgrey'
  },
  stickyHeaderClass: {
    position: 'sticky',
    top: 118
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
  multiSelections?: boolean,
  customSorts?: {},
  freezeCheckedColumnState?: boolean,
  onSelectedRowIds: () => {},
  onChangeSort: () => {}
};

const defaultProps = {
  orderDirection: 'asc',
  customSorts: emptyObject,
  multiSelections: false,
  freezeCheckedColumnState: false
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
const getOrder = (state, props) =>
  props.orderDirection || defaultProps.orderDirection;

const getSortedDataSelector = createSelector(
  [getData, getSecondarySorts, getCustomSorts, getOrderBy, getOrder],
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

function isRowChecked(rowData, selectedRowIds) {
  return selectedRowIds.some(id => rowData.id === id);
}

function renderCheckBoxInRow(rowData, freezeCheckedColumnState, selectedRowIds) {
  return (<Checkbox
    disabled={freezeCheckedColumnState}
    checked={isRowChecked(rowData, selectedRowIds)}
  />);
}

function getHeaderCheckBoxProps(selectableData, selectedRowIds, areAnyChecked) {
  if (selectableData.length === 0) {
    return {
      disabled: true
    };
  }
  if (areAnyChecked &&
      selectedRowIds.length !== selectableData.length) {
    return {
      indeterminate: true,
      color: 'default'
    };
  }
  return {};
}

function renderCheckBoxInHeader(
  areAnyChecked,
  onSelectedRowIds,
  selectableData,
  selectedRowIds
) {
  return (<Checkbox
    checked={areAnyChecked}
    onChange={onChangeCheckBoxHeader(selectedRowIds, selectableData, onSelectedRowIds)}
    {...getHeaderCheckBoxProps(selectableData, selectedRowIds, areAnyChecked)}
  />);
}


const getColumnConfig = (state, props) => props.columnConfig;
const getMultiSelections = (state, props) =>
  props.multiSelections || defaultProps.multiSelections;
const getFreezeCheckedColumnState = (state, props) =>
  props.freezeCheckedColumnState || defaultProps.freezeCheckedColumnState;
const getSelectedRowIds = (state, props) => props.selectedIds;
const getOnSelectedRowIds = (state, props) => props.onSelectedRowIds;

const getAreAnyCheckedSelector = createSelector(
  [getSelectedRowIds],
  (selectedRowIds) => selectedRowIds.length > 0
);

const getSelectableDataSelector = createSelector([getData], getSelectableData);

function getSelectableData(data) {
  return data.filter(d => !d.disabled);
}

const getColumnsSelector = createSelector(
  [getColumnConfig, getMultiSelections, getFreezeCheckedColumnState,
    getSelectedRowIds, getAreAnyCheckedSelector,
    getSelectableDataSelector, getOnSelectedRowIds],
  getColumns
);

function onChangeCheckBoxHeader(selectedRowIds, selectableData, onSelectedRowsIds) {
  return () => {
    const newlySelectedRowIds = selectedRowIds.length === selectableData.length ?
      emptyArray : getDataRowIds(selectableData);
    onSelectedRowsIds(newlySelectedRowIds);
  };
}

function getColumns(
  columnConfig,
  multiSelections,
  freezeCheckedColumnState,
  selectedRowIds,
  areAnyChecked,
  selectableData,
  onSelectedRowIds
) {
  const checkboxColumn = {
    name: 'checkbox',
    cell: rowData => (
      !rowData.disabled ?
        renderCheckBoxInRow(rowData, freezeCheckedColumnState, selectedRowIds) :
        null
    ),
    cellProps: { style: { paddingRight: 0 } },
    width: 72,
    onHeaderClick: false
  };
  if (multiSelections) {
    const header = renderCheckBoxInHeader(
      areAnyChecked,
      onSelectedRowIds,
      selectableData,
      selectedRowIds
    );
    checkboxColumn.header = header;
  }
  const stringCellProps = { style: { paddingRight: 0 } };
  const numericCellProps = { align: 'right' };
  const columns = columnConfig.map(c => ({
    name: c.name,
    header: c.label,
    cellProps: c.type === 'numeric' ? numericCellProps : stringCellProps
  }));
  return [checkboxColumn, ...columns];
}

function mapStateToProps(state, props) {
  const sortedData = getSortedDataSelector(state, props);
  const columns = getColumnsSelector(state, props);
  const selectableData = getSelectableDataSelector(state, props);
  return {
    sortedData,
    columns,
    selectableData
  };
}

function getDataRowIds(data) {
  return data.map(d => d.id);
}

class EnhancedTable extends Component<Props> {
  props: Props;
  state = {
    selectedRowIds: this.props.selectedIds
  };

  componentWillReceiveProps(nextProps) {
    // TODO: phase this out by removing state.selectedRowIds
    if (nextProps.selectedIds !== this.props.selectedIds) {
      this.setState({ selectedRowIds: nextProps.selectedIds });
    }
  }

  areAnyChecked = () => this.state.selectedRowIds.length > 0;

  handleRequestSort = ({ column }) => {
    const { name: property } = column;
    const orderBy = property;
    const order = (this.props.orderBy === property && this.props.orderDirection === 'desc') ? 'asc' : 'desc';
    this.props.onChangeSort({ order, orderBy });
  };

  reportSelectedRowIds = (selectedRowIds) => {
    this.props.onSelectedRowIds(selectedRowIds);
    return emptyObject;
  }

  onCellClick = ({ rowData }) => {
    if (rowData.disabled) {
      return;
    }
    this.setState(prevState => {
      if (prevState.selectedRowIds.some(id => rowData.id === id)) {
        // remove
        return this.reportSelectedRowIds(prevState.selectedRowIds.filter(id => id !== rowData.id));
      }
      if (this.props.multiSelections) {
        return this.reportSelectedRowIds([...prevState.selectedRowIds, rowData.id]);
      }
      return this.reportSelectedRowIds([rowData.id]);
    });
  }

  isCellSelected = ({ rowData }) =>
    this.state.selectedRowIds.some(id => rowData && rowData.id === id);

  isCellHovered = ({ rowData, hoveredRowData }) =>
    !rowData.disabled && rowData.id && rowData.id === hoveredRowData.id;

  bodyRowProps = ({ rowData }) => {
    const { classes } = this.props;
    return rowData.disabled ? { className: classes.rowDisabled } : {};
  }

  render() {
    const {
      classes, sortedData, columns, orderBy, orderDirection
    } = this.props;

    return (
      <Paper className={classes.root}>
        <MuiTable
          data={sortedData}
          columns={columns}
          includeHeaders
          headerCellProps={{
            className: classes.stickyHeaderClass,
            style: { background: '#eee', zIndex: 1 }
          }}
          cellProps={this.bodyRowProps}
          onHeaderClick={this.handleRequestSort}
          onCellClick={this.onCellClick}
          isCellSelected={this.isCellSelected}
          isCellHovered={this.isCellHovered}
          orderBy={orderBy}
          orderDirection={orderDirection}
          style={{ backgroundColor: 'white' }}
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
