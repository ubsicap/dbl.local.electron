import React, { Component } from 'react';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Link from '@material-ui/icons/Link';
import classNames from 'classnames';
import { ux } from '../utils/ux';
import EntryTitle from './EntryTitle';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import {
  openEntryDrawer,
  resetEntryAppBar
} from '../actions/entryAppBar.actions';
import { emptyObject } from '../utils/defaultValues';

type Props = {
  classes: {},
  origBundle: {},
  entryPageUrl: string,
  openDrawer: boolean,
  mode: string,
  modeUi: {},
  actionButton: React.Node,
  secondaryActionButton?: React.Node,
  openEntryActionDrawer: () => {},
  refreshEntryAppBar: () => {},
  handleClose: () => {}
};

const defaultProps = {
  secondaryActionButton: null
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  ...ux.getEntryUxStyles(theme)
});

const getBundleId = (state, props) => props.origBundle.id;
const getBundlesById = state => state.bundles.addedByBundleIds || emptyObject;
const getDblBaseUrl = state => state.dblDotLocalConfig.dblBaseUrl;
const getActiveBundle = createSelector(
  [getBundlesById, getBundleId],
  (bundlesById, bundleId) => bundlesById[bundleId]
);

const getEntryPageUrl = createSelector(
  [getDblBaseUrl, getActiveBundle],
  (dblBaseUrl, origBundle) => {
    const url = bundleService.getEntryRevisionUrl(dblBaseUrl, origBundle);
    return url;
  }
);

function mapStateToProps(state, props) {
  return {
    entryPageUrl: getEntryPageUrl(state, props),
    openDrawer: state.entryAppBar.openDrawer
  };
}

const mapDispatchToProps = {
  openEntryActionDrawer: openEntryDrawer,
  refreshEntryAppBar: resetEntryAppBar
};

class EntryAppBar extends Component<Props> {
  props: Props;

  componentDidMount() {
    this.refreshAppBar();
  }

  componentWillUnmount() {
    this.refreshAppBar();
  }

  refreshAppBar = () => {
    const { refreshEntryAppBar } = this.props;
    refreshEntryAppBar();
  };

  onOpenDBLEntryLink = event => {
    const { entryPageUrl } = this.props;
    utilities.onOpenLink(entryPageUrl)(event);
  };

  render() {
    const {
      classes,
      origBundle = {},
      openDrawer,
      mode,
      modeUi,
      actionButton,
      secondaryActionButton,
      entryPageUrl,
      handleClose,
      openEntryActionDrawer
    } = this.props;
    const { displayAs = {} } = origBundle;
    const { revision } = displayAs;
    const { status, parent, dblId } = origBundle;
    const modeIcon = ux.getModeIcon(mode, {
      color: 'inherit',
      className: classNames(classes.leftIcon)
    });
    const revBackground = ux.getDblRowBackgroundColor(
      false,
      classes,
      status,
      revision,
      parent,
      dblId,
      origBundle.mode
    );
    return (
      <AppBar
        className={classNames(classes.appBar, {
          [classes.appBarShift]: openDrawer
        })}
      >
        <Toolbar className={classes.toolBar} disableGutters={!openDrawer}>
          <IconButton color="inherit" onClick={handleClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
          <Grid container justify="flex-start" alignItems="center" spacing={24}>
            <Grid item>
              <Typography variant="h6" color="inherit" noWrap>
                {modeIcon}
                {modeUi.appBar.title}:
              </Typography>
            </Grid>
            <Grid
              item
              container
              justify="flex-start"
              alignItems="center"
              lg={6}
              sm={6}
              md={6}
            >
              <Grid item>
                <Typography variant="h6" color="inherit" noWrap>
                  {<EntryTitle bundle={origBundle} />}
                </Typography>
              </Grid>
              <Grid item>
                <Tooltip title={entryPageUrl}>
                  <Button
                    onClick={this.onOpenDBLEntryLink}
                    className={classNames(classes.button, revBackground)}
                  >
                    <Link
                      className={classNames(
                        classes.leftIcon,
                        classes.iconSmall
                      )}
                    />
                    {revision}
                  </Button>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
          <div className={classes.flex} />
          {secondaryActionButton}
          <div style={{ marginRight: '20px' }} />
          {actionButton}
          <IconButton
            aria-label="Open drawer"
            onClick={openEntryActionDrawer}
            className={classNames(
              classes.menuButton,
              openDrawer && classes.hide
            )}
            color="inherit"
          >
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    );
  }
}

EntryAppBar.defaultProps = defaultProps;

export default compose(
  withStyles(materialStyles, { withTheme: true }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryAppBar);
