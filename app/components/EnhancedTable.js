import React from 'react';
import PropTypes from 'prop-types';
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
});

class EnhancedTable extends React.Component {
  state = {
    order: 'asc',
    orderBy: this.props.columnNames[0].name,
    selectedRowIds: []
  };

  areAnyChecked = () => this.state.selectedRowIds.length > 0;

  onChangeCheckBoxHeader = () => {
    const { data } = this.props;
    this.setState(prevState => {
      if (prevState.selectedRowIds.length === data.length) {
        // deselect all
        return { selectedRowIds: [] };
      }
      return { selectedRowIds: data.map(d => d.id) };
    });
  }

  headerCheckBoxProps = () => {
    const { data } = this.props;
    const { selectedRowIds } = this.state;
    if (this.areAnyChecked() &&
    selectedRowIds.length !== data.length) {
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
    const { columnNames } = this.props;
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
        />
      ),
      cellProps: { style: { paddingRight: 0 } },
      width: 72,
      onHeaderClick: false
    };
    const stringCellProps = { style: { paddingRight: 0 } };
    const numericCellProps = { numeric: true };
    const columns = columnNames.map(c => ({
      name: c.name,
      cellProps: c.type === 'numeric' ? numericCellProps : stringCellProps
    }));
    return [checkboxColumn, ...columns];
  };

  handleRequestSort = (column) => {
    const { name: property } = column;
    const orderBy = property;
    const order = (this.state.orderBy === property && this.state.order === 'desc') ? 'asc' : 'desc';
    this.setState({ order, orderBy });
  };

  onCellClick = (column, rowData) => {
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
    });
  }

  isCellSelected = (column, rowData) =>
    this.state.selectedRowIds.some(id => rowData && rowData.id === id);

  isCellHovered = (column, rowData, hoveredColumn, hoveredRowData) =>
    rowData.id && rowData.id === hoveredRowData.id;

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
          onCellClick={this.onCellClick}
          isCellSelected={this.isCellSelected}
          isCellHovered={this.isCellHovered}
          includeHeaders
          width={900}
          height={500}
          fixedRowCount={1}
          orderBy={orderBy}
          orderDirection={order}
          onHeaderClick={this.handleRequestSort}
          style={{ backgroundColor: 'white' }}
        />
      </Paper>
    );
  }
}

EnhancedTable.propTypes = {
  classes: PropTypes.object.isRequired,
  data: PropTypes.array.isRequired,
  columnNames: PropTypes.array.isRequired
};

export default withStyles(styles)(EnhancedTable);
