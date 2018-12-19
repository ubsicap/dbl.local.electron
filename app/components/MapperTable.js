import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import classNames from 'classnames';
import { Set } from 'immutable';
import { withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import EnhancedTable from './EnhancedTable';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  direction: string,
  mapperData: {},
  tableData: [],
  selectedIds: [],
  columnConfig: [],
  onSelectedIds: () => {}
};

function createColumnConfig() {
  const { id, disabled, ...columns } = createMapperRowData();
  return ux.mapColumns(columns, (c) => ['matches', 'overwrites'].includes(c), () => null);
}

function createMapperRowData(id, mapperReport = [], optionsData = {}, mapperOverwrites = []) {
  const matches = mapperReport.length;
  const overwrites = mapperOverwrites.length;
  const { description, medium, documentation } = optionsData;
  return {
    id, disabled: false, medium, matches, overwrites, description, documentation
  };
}

const secondarySorts = ['description', 'matches'];

const styles = theme => ({
  root: {
    paddingRight: theme.spacing.unit,
    position: 'sticky',
    top: 60,
    backgroundColor: 'white',
    zIndex: 2,
  },
  highlight: ux.getHighlightTheme(theme, 'light'),
});

class MapperTable extends Component<Props> {
  props: Props;


  getMapperData = () => {
    const { mapperData, selectedIds } = this.props;
    const mapperReports = mapperData.report || {};
    const mappersUris = Object.values(mapperReports)
      .reduce((acc, mapperUris) => acc.union(mapperUris), Set()).toArray();
    const selectedMapperUris = Object.entries(mapperReports)
      .filter(([mapperKey]) => selectedIds.includes(mapperKey))
      .reduce((acc, [, mapperUris]) => acc.union(mapperUris), Set()).toArray();
    const mapperKeys = Object(mapperReports);
    return {
      mapperReports, mappersUris, mapperKeys, selectedMapperUris
    };
  }

  getMapperMessage = () => {
    const {
      mapperReports, mappersUris, selectedMapperUris
    } = this.getMapperData();
    const { selectedIds } = this.props;
    if (!mapperReports) {
      return '';
    }
    if (mappersUris.length === 0) {
      return '(No matches found for converters)';
    }
    if (selectedIds.length === 0) {
      return `(Select converter(s) below for upto ${mappersUris.length} matches)`;
    }
    return `(${selectedMapperUris.length} of ${mappersUris} matches in ${selectedIds.length} converters)`;
  }

  render() {
    const {
      columnConfig, tableData, selectedIds, onSelectedIds, classes
    } = this.props;
    const mapperMessage = this.getMapperMessage();
    return (
      <Toolbar
        className={classNames(classes.root, {
          [classes.highlight]: true,
        })}
      >
        <div className={classes.title}>
          <Typography color="inherit" variant="subheading">
            {mapperMessage}
          </Typography>
        </div>
        <EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
          secondarySorts={secondarySorts}
          defaultOrderBy="description"
          onSelectedRowIds={onSelectedIds}
          multiSelections
          selectedIds={selectedIds}
        />
      </Toolbar>
    );
  }
}

function mapStateToProps(state, props) {
  const { bundleManageResources } = state;
  const {
    mapperReports = {}
  } = bundleManageResources;
  const { [props.direction]: mapperData = {} } = mapperReports;
  const { report, options, overwrites } = mapperData;
  const tableData = Object.entries(report).map(([mapperKey, mapperReport]) =>
    createMapperRowData(mapperKey, mapperReport, options[mapperKey], overwrites[mapperKey]));
  return {
    columnConfig: createColumnConfig(),
    tableData,
    mapperData
  };
}

const mapDispatchToProps = {
};

export default compose(
  withStyles(styles),
  connect(mapStateToProps, mapDispatchToProps)
)(MapperTable);
