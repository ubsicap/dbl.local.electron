import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import classNames from 'classnames';
import { Tooltip } from '@material-ui/core';
import { Set } from 'immutable';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import {
  VerifiedUserTwoTone,
  VerifiedUserOutlined,
  VerifiedUser,
  StarBorder,
  Star
} from '@material-ui/icons';
import Copyright from '@material-ui/icons/Copyright';
import DBLEntryRow from './DBLEntryRow';
import { fetchAll, setupBundlesEventSource } from '../actions/bundle.actions';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { ux } from '../utils/ux';
import { emptyArray } from '../utils/defaultValues';
import EnhancedTable from './EnhancedTable';
import MediumIcon from './MediumIcon';
import { bundleService } from '../services/bundle.service';
import { toggleEntryStar } from '../actions/bundleFilter.actions';
import EntryRowStatusButton from './EntryRowStatusButton';
import EntryRowExpandedRow from './EntryRowExpandedRow';
import styles from './DBLEntryRow.css';

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
  allBundles: [],
  starredEntries: [],
  toggleEntryStarBtn: () => {},
  openEntryResourceManager: () => {}
};

const mapDispatchToProps = {
  fetchAllEntries: fetchAll,
  setupEntryBundlesEventSource: setupBundlesEventSource,
  toggleEntryStarBtn: toggleEntryStar,
  openEntryResourceManager: openResourceManager
};

function createEntryRowData(bundle, starredEntries = Set()) {
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
  const starred = starredEntries.has(dblId) ? 'starred' : 'unstarred';
  return {
    id,
    starred,
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

const getStarredEntries = state =>
  state.bundlesFilter.starredEntries || emptyArray;

function mapStateToProps(state) {
  const { authentication, bundles, bundlesFilter } = state;
  const {
    bundles: { allBundles }
  } = state;
  const bundleItems = bundles.items || emptyArray;
  const starredEntries = getStarredEntries(state);
  const entriesData = bundleItems.map(item =>
    createEntryRowData(item, starredEntries)
  );
  return {
    isLoadingBundles: bundles.loading || false,
    isSearchLoading: bundlesFilter.isLoading || false,
    bundleItems,
    selectedDBLEntryId: bundles.selectedDBLEntryId,
    authentication,
    entriesData,
    allBundles,
    starredEntries
  };
}

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

  handleClickStar = bundle => event => {
    const { dblId } = bundle;
    const { toggleEntryStarBtn } = this.props;
    event.stopPropagation();
    toggleEntryStarBtn(dblId);
  };

  handleClickManageResources = (bundle, mode) => event => {
    const { openEntryResourceManager } = this.props;
    const { id: bundleId } = bundle;
    openEntryResourceManager(bundleId, mode, true);
    event.stopPropagation();
  };

  getColumnsConfigWithCustomBodyRenderings = () => {
    const { classes } = this.props;
    return basicColumnsConfig.map(c => {
      switch (c.name) {
        case 'starred': {
          return {
            ...c,
            options: {
              customBodyRender: (value, tableMeta) => {
                const { bundleItems } = this.props;
                return (
                  <Tooltip title="Star entry">
                    <Button
                      size="small"
                      style={{ minWidth: '16px' }}
                      onClick={this.handleClickStar(
                        bundleItems[tableMeta.rowIndex]
                      )}
                    >
                      {value === 'starred' ? (
                        <Star className={classNames(classes.iconSmall)} />
                      ) : (
                        <StarBorder className={classNames(classes.iconSmall)} />
                      )}
                    </Button>
                  </Tooltip>
                );
              }
            }
          };
        }
        case 'medium': {
          const mediumIconProps = { style: { marginRight: '10px' } };
          return {
            ...c,
            options: {
              customBodyRender: value => (
                <div>
                  <MediumIcon medium={value} iconProps={mediumIconProps} />
                  {value}
                </div>
              )
            }
          };
        }
        case 'language-country': {
          return {
            ...c,
            options: {
              customBodyRender: value => (
                <span className={styles.languageAndCountryLabel}>{value}</span>
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
                      onClick={this.handleClickManageResources(
                        bundle,
                        'revisions'
                      )}
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
        case 'license': {
          return {
            ...c,
            options: {
              customBodyRender: value => {
                return (
                  <div>
                    {this.renderLicenseIcon(value)}
                    {value}
                  </div>
                );
              }
            }
          };
        }
        case 'rightsHolders': {
          return {
            ...c,
            options: {
              customBodyRender: value => {
                return (
                  <div>
                    <Copyright
                      className={classNames(
                        classes.leftIcon,
                        classes.iconSmall
                      )}
                    />
                    {value}
                  </div>
                );
              }
            }
          };
        }
        case 'status': {
          return {
            ...c,
            options: {
              customBodyRender: (value, tableMeta) => {
                const { bundleItems } = this.props;
                const bundle = bundleItems[tableMeta.rowIndex];
                return (
                  <EntryRowStatusButton bundleId={bundle.id} {...bundle} />
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

  renderLicenseIcon = license => {
    const { classes } = this.props;
    if (license === 'owned') {
      return (
        <VerifiedUser
          className={classNames(classes.leftIcon, classes.iconSmall)}
        />
      );
    }
    if (license === 'open-access') {
      return (
        <VerifiedUserTwoTone
          className={classNames(classes.leftIcon, classes.iconSmall)}
        />
      );
    }
    return (
      <VerifiedUserOutlined
        className={classNames(classes.leftIcon, classes.iconSmall)}
      />
    );
  };

  getTableOptions = () => {
    return {
      selectableRows: 'none',
      expandableRows: true,
      renderExpandableRow: (rowData, rowMeta) => {
        const colSpan = rowData.length + 1;
        const { dataIndex } = rowMeta;
        const { bundleItems } = this.props;
        const bundle = bundleItems[dataIndex];
        return (
          <TableRow>
            <TableCell colSpan={colSpan}>
              <EntryRowExpandedRow bundleId={bundle.id} {...bundle} />
            </TableCell>
          </TableRow>
        );
      }
    };
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
          onSelectedRowIds={() => {}}
          onChangeSort={() => {}}
          selectedIds={emptyArray}
          tableOptions={this.getTableOptions()}
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
