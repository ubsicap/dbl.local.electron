import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import EnhancedTable from './EnhancedTable';
import { ux } from '../utils/ux';


type Props = {
  direction: string,
  tableData: [],
  selectedIds: [],
  columnConfig: [],
  onSelectedIds: () => {}
};

function createColumnConfig() {
  const { id, disabled, ...columns } = createMapperRowData();
  return ux.mapColumns(columns, (c) => ['matches'].includes(c), () => null);
}

function createMapperRowData(id, mapperReport = [], optionsData = {}) {
  const matches = mapperReport.length;
  const { description } = optionsData;
  return {
    id, disabled: false, description, matches
  };
}

const secondarySorts = ['description', 'matches'];

class MapperTable extends Component<Props> {
  props: Props;
  render() {
    const {
      columnConfig, tableData, selectedIds, onSelectedIds
    } = this.props;
    return (<EnhancedTable
      data={tableData}
      columnConfig={columnConfig}
      secondarySorts={secondarySorts}
      defaultOrderBy="description"
      onSelectedRowIds={onSelectedIds}
      multiSelections
      selectedIds={selectedIds}
    />);
  }
}

function mapStateToProps(state, props) {
  const { bundleManageResources } = state;
  const {
    mapperReports = {}
  } = bundleManageResources;
  const { [props.direction]: mapperData = {} } = mapperReports;
  const { report, options } = mapperData;
  const tableData = Object.entries(report).map(([mapperKey, mapperReport]) =>
    createMapperRowData(mapperKey, mapperReport, options[mapperKey]));
  return {
    columnConfig: createColumnConfig(),
    tableData,
  };
}

const mapDispatchToProps = {
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(MapperTable);
