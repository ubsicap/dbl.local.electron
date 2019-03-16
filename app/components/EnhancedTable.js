import React, { Component } from 'react';
import MuiTable from 'mui-table';
import { withStyles } from '@material-ui/core/styles';
import sort from 'fast-sort';
import Paper from '@material-ui/core/Paper';
import Checkbox from '@material-ui/core/Checkbox';
import { connect } from 'react-redux';
import { compose } from 'recompose';

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
  columnConfig: [],
  columns: [],
  defaultOrderBy: string,
  secondarySorts: [],
  selectedIds: [],
  multiSelections?: boolean,
  customSorts?: {},
  freezeCheckedColumnState?: boolean,
  onSelectedRowIds: () => {}
};


function getSortMethod(customSorts, orderBy) {
  const customSort = customSorts[orderBy];
  if (customSort) {
    return customSort;
  }
  return orderBy;
}

/* TODO
  state = {
    order: this.props.orderDirection,
    orderBy: this.props.defaultOrderBy || this.props.columnConfig[0].name,
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
  onChangeCheckBoxHeader,
  selectableData,
  selectedRowIds
) {
  return (<Checkbox
    checked={areAnyChecked}
    onChange={onChangeCheckBoxHeader}
    {...getHeaderCheckBoxProps(selectableData, selectedRowIds, areAnyChecked)}
  />);
}

function getColumns(columnConfig, multiSelections) {
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
      onChangeCheckBoxHeader,
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
};

function mapStateToProps(state, props) {
  return {
    sortedData,
    columns,
    selectableData
  };
}

function getDataRowIds(data) {
  return data.map(d => d.id);
}

function getSelectableData(data) {
  return data.filter(d => !d.disabled);
}

class EnhancedTable extends Component<Props> {
  props: Props;
  state = {
    order: this.props.orderDirection,
    orderBy: this.props.defaultOrderBy || this.props.columnConfig[0].name,
    selectedRowIds: this.props.selectedIds
  };

  componentWillReceiveProps(nextProps) {
    // TODO: phase this out by removing state.selectedRowIds
    if (nextProps.selectedIds !== this.props.selectedIds) {
      this.setState({ selectedRowIds: nextProps.selectedIds });
    }
  }

  areAnyChecked = () => this.state.selectedRowIds.length > 0;

  onChangeCheckBoxHeader = () => {
    const { data } = this.props;
    this.setState(prevState => {
      const selectableData = getSelectableData(data);
      if (prevState.selectedRowIds.length === selectableData.length) {
        // deselect all
        return { selectedRowIds: [] };
      }
      return { selectedRowIds: getDataRowIds(selectableData) };
    }, this.reportSelectedRowIds);
  }

  handleRequestSort = ({ column }) => {
    const { name: property } = column;
    const orderBy = property;
    const order = (this.state.orderBy === property && this.state.order === 'desc') ? 'asc' : 'desc';
    this.setState({ order, orderBy });
  };

  reportSelectedRowIds = () => {
    this.props.onSelectedRowIds(this.state.selectedRowIds);
  }

  onCellClick = ({ rowData }) => {
    if (rowData.disabled) {
      return;
    }
    this.setState(prevState => {
      if (prevState.selectedRowIds.some(id => rowData.id === id)) {
        // remove
        return {
          selectedRowIds: prevState.selectedRowIds.filter(id => id !== rowData.id)
        };
      }
      if (this.props.multiSelections) {
        return {
          selectedRowIds: [...prevState.selectedRowIds, rowData.id]
        };
      }
      return {
        selectedRowIds: [rowData.id]
      };
    }, this.reportSelectedRowIds);
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
    const { classes, sortedData, columns } = this.props;
    const { orderBy, order } = this.state;

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
          orderDirection={order}
          style={{ backgroundColor: 'white' }}
        />
      </Paper>
    );
  }
}

EnhancedTable.defaultProps = {
  orderDirection: 'asc',
  customSorts: {},
  multiSelections: false,
  freezeCheckedColumnState: false
};

export default compose(
  withStyles(styles),
  connect(
    mapStateToProps,
    null
  ),
)(EnhancedTable);
