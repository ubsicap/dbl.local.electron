import React from 'react';
import PropTypes from 'prop-types';
import MuiTable from 'mui-table';
import { withStyles } from '@material-ui/core/styles';
import sort from 'fast-sort';
import Paper from '@material-ui/core/Paper';
import Checkbox from '@material-ui/core/Checkbox';
import EnhancedTableToolbar from './EnhancedTableToolbar';

let counter = 0;
function createData(name, calories, fat, carbs, protein) {
  counter += 1;
  return {
    id: counter, name, calories, fat, carbs, protein
  };
}

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
    orderBy: 'calories',
    selected: [],
    selectedRowIds: [],
    data: [
      createData('Cupcake', 305, 3.7, 67, 4.3),
      createData('Donut', 452, 25.0, 51, 4.9),
      createData('Eclair', 262, 16.0, 24, 6.0),
      createData('Frozen yoghurt', 159, 6.0, 24, 4.0),
      createData('Gingerbread', 356, 16.0, 49, 3.9),
      createData('Honeycomb', 408, 3.2, 87, 6.5),
      createData('Ice cream sandwich', 237, 9.0, 37, 4.3),
      createData('Jelly Bean', 375, 0.0, 94, 0.0),
      createData('KitKat', 518, 26.0, 65, 7.0),
      createData('Lollipop', 392, 0.2, 98, 0.0),
      createData('Marshmallow', 318, 0, 81, 2.0),
      createData('Nougat', 360, 19.0, 9, 37.0),
      createData('Oreo', 437, 18.0, 63, 4.0),
    ],
  };

  areAnyChecked = () => this.state.selectedRowIds.length > 0;

  onChangeCheckBoxHeader = () => {
    const { data } = this.state;
    this.setState(prevState => {
      if (prevState.selectedRowIds.length === data.length) {
        // deselect all
        return { selectedRowIds: [] };
      }
      return { selectedRowIds: data.map(d => d.id) };
    });
  }

  headerCheckBoxProps = () => {
    const { selectedRowIds, data } = this.state;
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

  columns = () => [
    {
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
    },
    {
      name: 'name', cellProps: { style: { paddingRight: 0 } }, header: 'Dessert (100g serving)'
    },
    {
      name: 'calories', cellProps: { numeric: true }, header: 'Calories'
    },
    {
      name: 'fat', cellProps: { numeric: true }, header: 'Fat (g)'
    },
    {
      name: 'carbs', cellProps: { numeric: true }, header: 'Carbs (g)'
    },
    {
      name: 'protein', cellProps: { numeric: true }, header: 'Protein (g)'
    }
  ];

  handleRequestSort = (column) => {
    const { name: property } = column;
    const orderBy = property;
    const order = (this.state.orderBy === property && this.state.order === 'desc') ? 'asc' : 'desc';
    this.setState({ order, orderBy });
  };

  handleSelectAllClick = (event, checked) => {
    if (checked) {
      this.setState(state => ({ selected: state.data.map(n => n.id) }));
      return;
    }
    this.setState({ selected: [] });
  };

  handleClick = (event, id) => {
    const { selected } = this.state;
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    this.setState({ selected: newSelected });
  };

  isSelected = id => this.state.selected.indexOf(id) !== -1;

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
    const { data, orderBy, order } = this.state;
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
};

export default withStyles(styles)(EnhancedTable);
