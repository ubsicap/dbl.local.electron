import React, { Component } from 'react';
import MuiTable from 'mui-table';
import { withStyles } from '@material-ui/core/styles';
import sort from 'fast-sort';
import Paper from '@material-ui/core/Paper';
import Checkbox from '@material-ui/core/Checkbox';
import EnhancedTableToolbar from './EnhancedTableToolbar';

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
  orderDirection?: string,
  columnConfig: [],
  defaultOrderBy: string,
  secondarySorts: [],
  selectedIds: [],
  multiSelections?: boolean,
  customSorts?: {},
  onSelectedRowIds: () => {}
};

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
    // You don't have to do this check first, but it can help prevent an unneeded render
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

  headerCheckBoxProps = () => {
    const { data } = this.props;
    const selectableData = getSelectableData(data);
    const { selectedRowIds } = this.state;
    if (selectableData.length === 0) {
      return {
        disabled: true
      };
    }
    if (this.areAnyChecked() &&
        selectedRowIds.length !== selectableData.length) {
      return {
        indeterminate: true,
        color: 'default'
      };
    }
    return {};
  }

  isRowChecked = (rowData) => (
    this.state.selectedRowIds.some(id => rowData.id === id));

  columns = () => {
    const { columnConfig } = this.props;
    const checkboxColumn = {
      name: 'checkbox',
      cell: rowData => (
        !rowData.disabled ?
          <Checkbox
            checked={this.isRowChecked(rowData)}
          /> :
          null
      ),
      cellProps: { style: { paddingRight: 0 } },
      width: 72,
      onHeaderClick: false
    };
    if (this.props.multiSelections) {
      const header = (
        <Checkbox
          checked={this.areAnyChecked()}
          onChange={this.onChangeCheckBoxHeader}
          {...this.headerCheckBoxProps()}
        />);
      checkboxColumn.header = header;
    }
    const stringCellProps = { style: { paddingRight: 0 } };
    const numericCellProps = { numeric: true };
    const columns = columnConfig.map(c => ({
      name: c.name,
      header: c.label,
      cellProps: c.type === 'numeric' ? numericCellProps : stringCellProps
    }));
    return [checkboxColumn, ...columns];
  };

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

  getSortMethod = (orderBy) => {
    const { customSorts } = this.props;
    const customSort = customSorts[orderBy];
    if (customSort) {
      return customSort;
    }
    return orderBy;
  }

  getSortedData = () => {
    const { data, secondarySorts } = this.props;
    const { orderBy, order } = this.state;
    const secondaryOrderBys = secondarySorts.filter(s => s !== orderBy).map((s) =>
      ({ asc: this.getSortMethod(s) }));
    const orderByConfig = [{ [order]: this.getSortMethod(orderBy) }, ...secondaryOrderBys];
    const sorted = sort(data).by(orderByConfig);
    return sorted;
  }

  bodyRowProps = ({ rowData }) => {
    const { classes } = this.props;
    return rowData.disabled ? { className: classes.rowDisabled } : {};
  }

  render() {
    const { classes } = this.props;
    const { orderBy, order } = this.state;

    return (
      <Paper className={classes.root}>
        <MuiTable
          data={this.getSortedData()}
          columns={this.columns()}
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
  multiSelections: false
};

export default withStyles(styles)(EnhancedTable);
