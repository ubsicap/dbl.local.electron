import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import EnhancedTable from './EnhancedTable';
import { ux } from '../utils/ux';


type Props = {
  classes: {},
  direction: string,
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
  highlight: ux.getHighlightTheme(theme, 'light'),
});

class MapperTable extends Component<Props> {
  props: Props;
  render() {
    const {
      columnConfig, tableData, selectedIds, onSelectedIds, classes
    } = this.props;
    return (
      <div className={classNames(classes.highlight)}>
        <EnhancedTable
          data={tableData}
          columnConfig={columnConfig}
          secondarySorts={secondarySorts}
          defaultOrderBy="description"
          onSelectedRowIds={onSelectedIds}
          multiSelections
          selectedIds={selectedIds}
        />
      </div>
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
  };
}

const mapDispatchToProps = {
};

export default compose(
  withStyles(styles),
  connect(mapStateToProps, mapDispatchToProps)
)(MapperTable);
