import React, { Component } from 'react';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import MenuIcon from '@material-ui/icons/Menu';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Link from '@material-ui/icons/Link';
import classNames from 'classnames';
import { ux } from '../utils/ux';
import CopyForPasteButton from './CopyForPasteButton';
import EntryTitle from '../components/EntryTitle';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import { selectItemsToPaste } from '../actions/clipboard.actions';
import { emptyObject } from '../utils/defaultValues';

type Props = {
  classes: {},
  origBundle: {},
  entryPageUrl: string,
  openDrawer: boolean,
  mode: string,
  modeUi: {},
  selectedItemsForCopy: [],
  itemsTypeForCopy: string,
  actionButton: React.Node,
  selectItemsToPaste: () => {},
  handleDrawerOpen: () => {},
  handleClose: () => {}
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  errorBar: {
    color: theme.palette.secondary.light,
  },
  successBar: {
    color: theme.palette.primary.light,
  },
  toolBar: {
    paddingLeft: '10px',
  },
  flex: {
    flex: 1,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
  button: {
    margin: theme.spacing.unit,
  },
  input: {
    display: 'none',
  },
  buttonProgress: {
    color: theme.palette.secondary.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -23,
  }
});


const getBundleId = (state, props) => props.origBundle.id;
const getBundlesById = (state) => state.bundles.addedByBundleIds || emptyObject;
const getDblBaseUrl = (state) => state.dblDotLocalConfig.dblBaseUrl;
const getEntryPageUrl = createSelector(
  [getDblBaseUrl, getBundlesById, getBundleId],
  (dblBaseUrl, bundlesById, bundleId) => {
    const origBundle = bundlesById[bundleId];
    const { dblId, revision, parent } = origBundle;
    const revisionNum = bundleService.getRevisionOrParentRevision(dblId, revision, parent);
    const revisionQuery = revisionNum ? `&revision=${revisionNum}` : '';
    const url = `${dblBaseUrl}/entry?id=${dblId}${revisionQuery}`;
    return url;
  }
);

function mapStateToProps(state, props) {
  return {
    entryPageUrl: getEntryPageUrl(state, props)
  };
}

const mapDispatchToProps = {
  selectItemsToPaste,
};

class EntryAppBar extends Component<Props> {
  props: Props;

  onOpenDBLEntryLink = (event) => {
    utilities.onOpenLink(this.props.entryPageUrl)(event);
  }

  handleCopyFiles = () => {
    const { selectedItemsForCopy } = this.props;
    this.props.selectItemsToPaste(this.props.origBundle.id, selectedItemsForCopy, this.props.itemsTypeForCopy);
    this.props.handleClose();
  }

  render() {
    const {
      classes, origBundle = {}, openDrawer, mode, modeUi, selectedItemsForCopy,
    } = this.props;
    const { displayAs = {} } = origBundle;
    const { revision } = displayAs;
    const { status, parent, dblId } = origBundle;
    const modeIcon = ux.getModeIcon(mode, { color: 'inherit', className: classNames(classes.leftIcon) });
    const revBackground =
      ux.getDblRowBackgroundColor(false, classes, status, revision, parent, dblId, origBundle.mode);
    return (
      <AppBar className={classNames(classes.appBar, {
        [classes.appBarShift]: openDrawer,
      })}
      >
        <Toolbar className={classes.toolBar} disableGutters={!openDrawer}>
          <IconButton
            aria-label="Open drawer"
            onClick={this.props.handleDrawerOpen}
            className={classNames(classes.menuButton, openDrawer && classes.hide)}
            color="inherit"
          >
            <MenuIcon />
          </IconButton>
          <Grid container justify="flex-start" alignItems="center" spacing={24}>
            <Grid item>
              <Typography variant="h6" color="inherit" noWrap>
                {modeIcon}
                {modeUi.appBar.title}:
              </Typography>
            </Grid>
            <Grid item container justify="flex-start" alignItems="center" lg={6} sm={6} md={6}>
              <Grid item>
                <Typography variant="h6" color="inherit" noWrap>
                  {<EntryTitle bundle={origBundle} />}
                </Typography>
              </Grid>
              <Grid item>
                <Tooltip title={this.props.entryPageUrl}>
                  <Button onClick={this.onOpenDBLEntryLink} className={classNames(classes.button, revBackground)}>
                    <Link className={classNames(classes.leftIcon, classes.iconSmall)} />
                    {revision}
                  </Button>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
          <div className={classes.flex} />
          {mode !== 'revisions' &&
          <CopyForPasteButton
            key="btnCopyForPaste"
            classes={classes}
            color="inherit"
            onClick={this.handleCopyFiles}
            disabled={selectedItemsForCopy.length === 0}
            selectedItems={selectedItemsForCopy}
          />}
          {this.props.actionButton}
          <IconButton color="inherit" onClick={this.props.handleClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    );
  }
}

export default compose(
  withStyles(materialStyles, { withTheme: true }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryAppBar);