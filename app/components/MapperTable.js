import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import classNames from 'classnames';
import { Set } from 'immutable';
import { withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import EnhancedTable from './EnhancedTable';
import { ux } from '../utils/ux';
import { selectMappers } from '../actions/bundleManageResources.actions';
import { emptyObject } from '../utils/defaultValues';

type Props = {
  classes: {},
  direction: string,
  mapperData: {},
  tableData: [],
  selectedIds: [],
  columnConfig: [],
  selectConverters: () => {}
};

const mapDispatchToProps = {
  selectConverters: selectMappers
};

function createColumnConfig(direction) {
  const { id, disabled, ...columns } = createMapperRowData(direction);
  return ux.mapColumns(
    columns,
    c => ['matches', 'overwrites'].includes(c),
    () => null
  );
}

function createMapperRowData(
  direction,
  id = undefined,
  mapperReport = [],
  optionsData = {},
  mapperOverwrites = []
) {
  const matches = mapperReport.length;
  const overwritesOrNot =
    direction === 'output' ? {} : { overwrites: mapperOverwrites.length };
  const { description, medium, documentation } = optionsData;
  return {
    id,
    disabled: false,
    medium,
    matches,
    ...overwritesOrNot,
    description,
    documentation
  };
}

const secondarySorts = ['description', 'matches'];

const styles = theme => ({
  root: {
    paddingRight: theme.spacing.unit,
    position: 'sticky',
    top: 60,
    backgroundColor: 'white',
    zIndex: 2
  },
  highlight: ux.getHighlightTheme(theme, 'light')
});

class MapperTable extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = { orderDirection: 'asc', orderBy: 'description' };
  }

  componentDidMount() {
    const { selectedIds } = this.props;
    this.callSelectConverters(selectedIds);
  }

  callSelectConverters = selectedIds => {
    const { selectConverters, direction } = this.props;
    selectConverters(direction, selectedIds);
  };

  getMapperData = () => {
    const { mapperData, selectedIds } = this.props;
    const mapperReports = mapperData.report || {};
    const mappersUris = Object.values(mapperReports)
      .reduce((acc, mapperUris) => acc.union(mapperUris), Set())
      .toArray();
    const selectedMapperUris = Object.entries(mapperReports)
      .filter(([mapperKey]) => selectedIds.includes(mapperKey))
      .reduce((acc, [, mapperUris]) => acc.union(mapperUris), Set())
      .toArray();
    const mapperKeys = Object(mapperReports);
    return {
      mapperReports,
      mappersUris,
      mapperKeys,
      selectedMapperUris
    };
  };

  handleSelectedIds = selectedIds => {
    this.callSelectConverters(selectedIds);
  };

  handleChangeSort = ({ order, orderBy }) => {
    this.setState({ orderDirection: order, orderBy });
  };

  render() {
    const {
      classes,
      columnConfig,
      tableData,
      selectedIds,
      direction
    } = this.props;
    const { orderBy, orderDirection } = this.state;
    const titlePrepend = direction === 'input' ? 'Import' : 'Export /';
    return (
      <React.Fragment>
        <Toolbar
          className={classNames({
            [classes.highlight]: true
          })}
        >
          <EnhancedTable
            title={`${titlePrepend} Converters`}
            data={tableData}
            columnConfig={columnConfig}
            secondarySorts={secondarySorts}
            orderBy={orderBy}
            orderDirection={orderDirection}
            onSelectedRowIds={this.handleSelectedIds}
            onChangeSort={this.handleChangeSort}
            multiSelections
            selectedIds={selectedIds}
          />
        </Toolbar>
      </React.Fragment>
    );
  }
}

function mapStateToProps(state, props) {
  const { bundleManageResources } = state;
  const { mapperReports = {} } = bundleManageResources;
  const { [props.direction]: mapperData = {} } = mapperReports;
  const { report, options, overwrites = emptyObject } = mapperData;
  const tableData = Object.entries(report).map(([mapperKey, mapperReport]) =>
    createMapperRowData(
      props.direction,
      mapperKey,
      mapperReport,
      options[mapperKey],
      overwrites[mapperKey]
    )
  );
  return {
    columnConfig: createColumnConfig(props.direction),
    tableData,
    mapperData
  };
}

export default compose(
  withStyles(styles),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(MapperTable);
