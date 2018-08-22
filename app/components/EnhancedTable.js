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
  stickyHeaderClass: {
    position: 'sticky',
    top: 100
  }
});

type Props = {
  classes: {},
  data: [],
  columnConfig: [],
  onSelectedRowIds: () => {}
};

class EnhancedTable extends Component<Props> {
  props: Props;
  state = {
    order: 'asc',
    orderBy: this.props.columnConfig[0].name,
    selectedRowIds: []
  };

  areAnyChecked = () => this.state.selectedRowIds.length > 0;

  onChangeCheckBoxHeader = () => {
    const { data } = this.props;
    this.setState(prevState => {
      const selectableData = data.filter(d => !d.disabled);
      if (prevState.selectedRowIds.length === selectableData.length) {
        // deselect all
        return { selectedRowIds: [] };
      }
      return { selectedRowIds: selectableData.map(d => d.id) };
    }, this.reportSelectedRowIds);
  }

  headerCheckBoxProps = () => {
    const { data } = this.props;
    const selectableData = data.filter(d => !d.disabled);
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
      header: (
        <Checkbox
          checked={this.areAnyChecked()}
          onChange={this.onChangeCheckBoxHeader}
          {...this.headerCheckBoxProps()}
        />
      ),
      cell: rowData => (
        <Checkbox
          checked={this.isRowChecked(rowData)}
          disabled={rowData.disabled}
        />
      ),
      cellProps: { style: { paddingRight: 0 } },
      width: 72,
      onHeaderClick: false
    };
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
      return {
        selectedRowIds: [...prevState.selectedRowIds, rowData.id]
      };
    }, this.reportSelectedRowIds);
  }

  isCellSelected = ({ rowData }) =>
    this.state.selectedRowIds.some(id => rowData && rowData.id === id);

  isCellHovered = ({ rowData, hoveredRowData }) =>
    !rowData.disabled && rowData.id && rowData.id === hoveredRowData.id;

  getSortedData = () => {
    const { data } = this.props;
    const { orderBy, order } = this.state;
    const s = sort(data).by([{ [order]: orderBy }]);
    return s;
  }

  render() {
    const { classes } = this.props;
    const { selectedRowIds, orderBy, order } = this.state;

    return (
      <Paper className={classes.root}>
        <EnhancedTableToolbar numSelected={selectedRowIds.length} />
        <MuiTable
          data={this.getSortedData()}
          columns={this.columns()}
          includeHeaders
          headerCellProps={{
            className: classes.stickyHeaderClass,
            style: { background: '#eee' }
          }}
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

export default withStyles(styles)(EnhancedTable);
