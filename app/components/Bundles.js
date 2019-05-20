import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import classNames from 'classnames';
import { Tooltip } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import DBLEntryRow from './DBLEntryRow';
import { fetchAll, setupBundlesEventSource } from '../actions/bundle.actions';
import { ux } from '../utils/ux';
import { emptyArray } from '../utils/defaultValues';
import EnhancedTable from './EnhancedTable';
import MediumIcon from './MediumIcon';
import { bundleService } from '../services/bundle.service';

type Props = {
  classes: {},
  fetchAllEntries: () => {},
  setupEntryBundlesEventSource: () => {},
  isLoadingBundles: boolean,
  isSearchLoading: boolean,
  bundleItems: [],
  selectedDBLEntryId: ?string,
  authentication: {},
  entriesData: [],
  allBundles: []
};

function createEntryRowData(bundle) {
  const {
    id,
    medium,
    displayAs: {
      languageAndCountry,
      name,
      dblId,
      revision,
      license,
      rightsHolders,
      status
    }
  } = bundle || { displayAs: {} };
  return {
    id,
    medium,
    'language-country': languageAndCountry,
    name,
    dblId,
    revision,
    license,
    rightsHolders,
    status
  };
}

const basicColumnsConfig = ux.mapColumns(
  createEntryRowData(),
  () => false,
  () => null
);

function filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision) {
  return b => {
    if (b.id === bundleId) {
      return false;
    }
    const testEffectiveRevision = bundleService.getRevisionOrParentRevision(
      b.dblId,
      b.revision,
      b.parent
    );
    if (b.revision !== '0' && testEffectiveRevision <= effectiveRevision) {
      return false;
    }
    return true;
  };
}

function getEntryLaterRevisions(
  allBundles,
  { id: bundleId, dblId, revision, parent }
) {
  const effectiveRevision = bundleService.getRevisionOrParentRevision(
    dblId,
    revision,
    parent
  );
  const allRevisions = allBundles.filter(b => b.dblId === dblId);
  const laterRevisions = allRevisions.filter(
    filterForLaterRevisionsOrDrafts(bundleId, effectiveRevision)
  );
  return laterRevisions;
}

function mapStateToProps(state) {
  const { authentication, bundles, bundlesFilter } = state;
  const {
    bundles: { allBundles }
  } = state;
  const bundleItems = bundles.items || emptyArray;
  const entriesData = bundleItems.map(createEntryRowData);
  return {
    isLoadingBundles: bundles.loading || false,
    isSearchLoading: bundlesFilter.isLoading || false,
    bundleItems,
    selectedDBLEntryId: bundles.selectedDBLEntryId,
    authentication,
    entriesData,
    allBundles
  };
}

const mapDispatchToProps = {
  fetchAllEntries: fetchAll,
  setupEntryBundlesEventSource: setupBundlesEventSource
};

const tableOptions = {
  selectableRows: 'none'
};

class Bundles extends PureComponent<Props> {
  props: Props;

  componentDidMount() {
    const {
      bundleItems,
      setupEntryBundlesEventSource,
      fetchAllEntries
    } = this.props;
    if (bundleItems.length === 0) {
      setupEntryBundlesEventSource();
      fetchAllEntries();
    }
  }

  handleSelectedRowIds = () => {};

  getColumnsConfigWithCustomBodyRenderings = () => {
    const { classes } = this.props;
    return basicColumnsConfig.map(c => {
      switch (c.name) {
        case 'medium': {
          const mediumIconProps = { style: { marginRight: '10px' } };
          return {
            ...c,
            options: {
              customBodyRender: value => (
                <Button size="small" style={{ minWidth: '16px' }}>
                  <MediumIcon medium={value} iconProps={mediumIconProps} />
                  {value}
                </Button>
              )
            }
          };
        }
        case 'dblId': {
          return { ...c, options: { display: 'excluded' } };
        }
        case 'name': {
          return {
            ...c,
            options: {
              customBodyRender: (value, tableMeta) => {
                const { bundleItems } = this.props;
                if (bundleItems.length === 0) {
                  return undefined;
                }
                return (
                  <Grid container direction="column">
                    <Grid item>
                      <Typography variant="body1">{value}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="caption">
                        {bundleItems.length > 0
                          ? bundleItems[tableMeta.rowIndex].dblId
                          : ''}
                      </Typography>
                    </Grid>
                  </Grid>
                );
              }
            }
          };
        }
        case 'revision': {
          return {
            ...c,
            options: {
              customBodyRender: (value, tableMeta) => {
                const { bundleItems, allBundles } = this.props;
                if (bundleItems.length === 0) {
                  return undefined;
                }
                const bundle = bundleItems[tableMeta.rowIndex];
                const laterEntryRevisions = getEntryLaterRevisions(
                  allBundles,
                  bundle
                );
                const laterEntryRevisionsCount = laterEntryRevisions.length;
                const laterRevisionsBadge = laterEntryRevisionsCount
                  ? `${laterEntryRevisionsCount}+`
                  : '';
                const { dblId, status, revision, parent, mode } = bundle;
                return (
                  <Tooltip title="Switch revision">
                    <Button
                      variant="outlined"
                      size="small"
                      className={classNames(
                        classes.button,
                        ux.getDblRowBackgroundColor(
                          false,
                          classes,
                          status,
                          revision,
                          parent,
                          dblId,
                          mode
                        )
                      )}
                      disabled={dblId === undefined}
                      onClick={() => {}}
                    >
                      {ux.conditionallyRenderBadge(
                        {
                          classes: { badge: classes.badgeTight },
                          color: 'primary'
                        },
                        laterRevisionsBadge,
                        <div>{value}</div>
                      )}
                    </Button>
                  </Tooltip>
                );
              }
            }
          };
        }
        default:
          return c;
      }
    });
  };

  render() {
    const {
      bundleItems,
      isSearchLoading,
      isLoadingBundles,
      selectedDBLEntryId,
      entriesData
    } = this.props;
    const columnsConfigWithCustomBodyRenderings = this.getColumnsConfigWithCustomBodyRenderings();
    return (
      <div>
        {(isLoadingBundles || isSearchLoading) && (
          <div
            className="row"
            style={{
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <CircularProgress size={80} thickness={5} />
          </div>
        )}
        <EnhancedTable
          data={entriesData}
          title="Entries"
          columnConfig={columnsConfigWithCustomBodyRenderings}
          orderBy="language-country"
          secondarySorts={emptyArray}
          orderDirection="asc"
          onSelectedRowIds={this.handleSelectedRowIds}
          onChangeSort={() => {}}
          selectedIds={emptyArray}
          tableOptions={tableOptions}
        />
        {bundleItems &&
          bundleItems.map(d => (
            <DBLEntryRow
              key={d.id}
              bundleId={d.id}
              {...d}
              isSelected={selectedDBLEntryId === d.dblId}
            />
          ))}
      </div>
    );
  }
}

const materialStyles = theme => ux.getDblRowStyles(theme);

export default compose(
  withStyles(materialStyles),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(Bundles);
