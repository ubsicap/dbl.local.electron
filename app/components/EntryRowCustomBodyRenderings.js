import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { Tooltip } from '@material-ui/core';
import VerifiedUserTwoTone from '@material-ui/icons/VerifiedUserTwoTone';
import VerifiedUserOutlined from '@material-ui/icons/VerifiedUserOutlined';
import VerifiedUser from '@material-ui/icons/VerifiedUser';
import Button from '@material-ui/core/Button';
import StarBorder from '@material-ui/icons/StarBorder';
import Star from '@material-ui/icons/Star';
import Copyright from '@material-ui/icons/Copyright';
import styles from './DBLEntryRow.css';
import { toggleEntryStar } from '../actions/bundleFilter.actions';
import {
  toggleSelectEntry,
  requestSaveBundleTo,
  forkIntoNewBundle,
  downloadResources,
  uploadBundle,
  updateBundle,
  createDraftRevision,
  openJobSpecInBrowser
} from '../actions/bundle.actions';
import { openEditMetadata } from '../actions/bundleEditMetadata.actions';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { bundleService } from '../services/bundle.service';
import { ux } from '../utils/ux';
import MediumIcon from './MediumIcon';
import { emptyArray, emptyObject } from '../utils/defaultValues';
import EntryRowStatusButton from './EntryRowStatusButton';

type Props = {
  classes: {},
  columnName: string,
  cellValue: string,
  bundle: {},
  bundleId: string,
  dblId: string,
  revision: string,
  parent: ?{},
  task: string,
  status: string,
  medium: string,
  displayAs: {},
  mode: string,
  bundleMatches: {},
  bundlesSaveTo: {},
  laterEntryRevisions: [],
  formsErrorStatus: {},
  formsErrors: {},
  openEntryResourceManager: () => {},
  toggleEntryStarBtn: () => {}
};

const mapDispatchToProps = {
  toggleSelectEntry,
  downloadResources,
  openEntryResourceManager: openResourceManager,
  requestSaveEntryBundleTo: requestSaveBundleTo,
  forkEntryIntoNewBundle: forkIntoNewBundle,
  openEntryEditMetadata: openEditMetadata,
  uploadEntryBundle: uploadBundle,
  updateEntryBundle: updateBundle,
  createEntryDraftRevision: createDraftRevision,
  openEntryJobSpecInBrowser: openJobSpecInBrowser,
  toggleEntryStarBtn: toggleEntryStar
};

const getBundleItems = state => state.bundles.items || emptyArray;
const getAllBundles = state => state.bundles.allBundles || emptyObject;
const getPropsTableMeta = (state, props) => props.tableMeta;
const getPropsTableMetaRowIndex = (state, props) =>
  getPropsTableMeta(state, props).rowIndex;

const mediumIconProps = { style: { marginRight: '10px' } };

const getBundleItemSelector = createSelector(
  [getBundleItems, getPropsTableMetaRowIndex],
  (bundleItems, tableMetaRowIndex) => bundleItems[tableMetaRowIndex]
);

const makeGetBundleItem = () =>
  createSelector(
    [getBundleItemSelector],
    bundleItem => bundleItem
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

const makeGetEntryLaterRevisions = () =>
  createSelector(
    [getAllBundles, getBundleItemSelector],
    getEntryLaterRevisions
  );

const makeMapStateToProps = () => {
  const getBundleItem = makeGetBundleItem();
  const getEntryLaterRevisionsSelector = makeGetEntryLaterRevisions();
  const mapStateToProps = (state, props) => {
    const bundle = getBundleItem(state, props);
    const laterEntryRevisions = getEntryLaterRevisionsSelector(state, props);
    const {
      dblId,
      id: bundleId,
      parent,
      medium,
      task,
      status,
      mode,
      displayAs,
      formsErrorStatus
    } = bundle;
    return {
      dblId,
      bundleId,
      parent,
      medium,
      task,
      status,
      mode,
      displayAs,
      formsErrorStatus,
      laterEntryRevisions
    };
  };
  return mapStateToProps;
};

class EntryRowCustomBodyRenderings extends PureComponent<Props> {
  props: Props;

  handleClickStar = event => {
    const { dblId, toggleEntryStarBtn } = this.props;
    event.stopPropagation();
    toggleEntryStarBtn(dblId);
  };

  emptyMatches = emptyArray;

  handleClickManageResources = mode => event => {
    const { bundleId, openEntryResourceManager } = this.props;
    openEntryResourceManager(bundleId, mode, true);
    event.stopPropagation();
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

  render() {
    const { classes, columnName, cellValue, dblId, bundleId } = this.props;
    console.log(`Rendering ${bundleId}: ${columnName} = ${cellValue}`);
    switch (columnName) {
      case 'starred': {
        return (
          <Tooltip title="Star entry">
            <Button
              size="small"
              style={{ minWidth: '16px' }}
              onClick={this.handleClickStar}
            >
              {cellValue === 'starred' ? (
                <Star className={classNames(classes.iconSmall)} />
              ) : (
                <StarBorder className={classNames(classes.iconSmall)} />
              )}
            </Button>
          </Tooltip>
        );
      }
      case 'medium': {
        return (
          <div>
            <MediumIcon medium={cellValue} iconProps={mediumIconProps} />
            {cellValue}
          </div>
        );
      }
      case 'language-country': {
        return (
          <span className={styles.languageAndCountryLabel}>{cellValue}</span>
        );
      }
      case 'name': {
        return (
          <Grid container direction="column">
            <Grid item>
              <Typography variant="body1">{cellValue}</Typography>
            </Grid>
            <Grid item>
              <Typography variant="caption">{dblId}</Typography>
            </Grid>
          </Grid>
        );
      }
      case 'revision': {
        const {
          status,
          revision,
          parent,
          mode,
          laterEntryRevisions
        } = this.props;
        const laterEntryRevisionsCount = laterEntryRevisions.length;
        const laterRevisionsBadge = laterEntryRevisionsCount
          ? `${laterEntryRevisionsCount}+`
          : '';
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
              onClick={this.handleClickManageResources('revisions')}
            >
              {ux.conditionallyRenderBadge(
                {
                  classes: { badge: classes.badgeTight },
                  color: 'primary'
                },
                laterRevisionsBadge,
                <div>{cellValue}</div>
              )}
            </Button>
          </Tooltip>
        );
      }
      case 'license': {
        return (
          <div>
            {this.renderLicenseIcon(cellValue)}
            {cellValue}
          </div>
        );
      }
      case 'rightsHolders': {
        return (
          <div>
            <Copyright
              className={classNames(classes.leftIcon, classes.iconSmall)}
            />
            {cellValue}
          </div>
        );
      }
      case 'status': {
        const {
          medium,
          task,
          status,
          mode,
          displayAs,
          parent,
          revision
        } = this.props;
        return (
          <EntryRowStatusButton
            bundleId={bundleId}
            dblId={dblId}
            revision={revision}
            medium={medium}
            task={task}
            mode={mode}
            status={status}
            displayAs={displayAs}
            parent={parent}
          />
        );
      }
      default:
        return null;
    }
  }
}

EntryRowCustomBodyRenderings.defaultProps = {};

const materialStyles = theme => ux.getDblRowStyles(theme);

export default compose(
  withStyles(materialStyles),
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  )
)(EntryRowCustomBodyRenderings);
