import React, { Component } from 'react';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Save from '@material-ui/icons/Save';
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
import CopyForPasteButton from './CopyForPasteButton';
import ConfirmButton from './ConfirmButton';
import EntryTitle from './EntryTitle';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import {
  openEntryDrawer,
  resetEntryAppBar
} from '../actions/entryAppBar.actions';
import { saveAsTemplate } from '../actions/workspace.actions';
import { selectItemsToPaste } from '../actions/clipboard.actions';
import { emptyObject } from '../utils/defaultValues';

type Props = {
  classes: {},
  origBundle: {},
  entryPageUrl: string,
  openDrawer: boolean,
  canSaveAsTemplate: boolean,
  mode: string,
  modeUi: {},
  selectedItemsForCopy?: [],
  itemsTypeForCopy?: string,
  actionButton: React.Node,
  selectItemsToPaste: () => {},
  openEntryDrawer: () => {},
  resetEntryAppBar: () => {},
  handleClose: () => {},
  saveMetadataAsTemplate: () => {}
};

const defaultProps = {
  selectedItemsForCopy: undefined,
  itemsTypeForCopy: undefined
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
    const { dblId, revision, parent } = origBundle;
    const revisionNum = bundleService.getRevisionOrParentRevision(
      dblId,
      revision,
      parent
    );
    const revisionQuery = revisionNum ? `&revision=${revisionNum}` : '';
    const url = `${dblBaseUrl}/entry?id=${dblId}${revisionQuery}`;
    return url;
  }
);

const getCurrentWorkspace = state => state.workspace || emptyObject;
const getCurrentMetadataFileChecksum = createSelector(
  [getActiveBundle],
  activeBundle => activeBundle.raw.dbl.checksum
);

const getCanSaveAsTemplate = createSelector(
  [getCurrentWorkspace, getCurrentMetadataFileChecksum, getActiveBundle],
  (currentWorkspace, currentMetadataChecksum, activeBundle) => {
    const { medium } = activeBundle;
    const { templateChecksums = emptyObject } = currentWorkspace || emptyObject;
    const templateChecksum = templateChecksums[medium];
    return (
      currentMetadataChecksum && templateChecksum !== currentMetadataChecksum
    );
  }
);

function mapStateToProps(state, props) {
  return {
    entryPageUrl: getEntryPageUrl(state, props),
    openDrawer: state.entryAppBar.openDrawer,
    canSaveAsTemplate: getCanSaveAsTemplate(state, props)
  };
}

const mapDispatchToProps = {
  selectItemsToPaste,
  openEntryDrawer,
  resetEntryAppBar,
  saveMetadataAsTemplate: saveAsTemplate
};

class EntryAppBar extends Component<Props> {
  props: Props;

  componentDidMount() {
    this.props.resetEntryAppBar();
  }

  componentWillUnmount() {
    this.props.resetEntryAppBar();
  }

  onOpenDBLEntryLink = event => {
    const { entryPageUrl } = this.props;
    utilities.onOpenLink(entryPageUrl)(event);
  };

  handleCopyFiles = () => {
    const { selectedItemsForCopy, origBundle, itemsTypeForCopy } = this.props;
    this.props.selectItemsToPaste(
      origBundle.id,
      selectedItemsForCopy,
      itemsTypeForCopy
    );
    this.props.handleClose();
  };

  handleSaveAsTemplate = () => {
    const { saveMetadataAsTemplate, origBundle } = this.props;
    saveMetadataAsTemplate(origBundle.id);
  };

  renderSecondaryActionButton = () => {
    const { classes, mode, selectedItemsForCopy } = this.props;
    if (mode === 'revisions') {
      return null;
    }
    if (selectedItemsForCopy && selectedItemsForCopy.length > 0) {
      return (
        <CopyForPasteButton
          key="btnCopyForPaste"
          classes={classes}
          color="inherit"
          onClick={this.handleCopyFiles}
          disabled={selectedItemsForCopy.length === 0}
          selectedItems={selectedItemsForCopy}
        />
      );
    }
    const { canSaveAsTemplate } = this.props;
    const buttonProps = {
      classes,
      color: 'primary',
      variant: 'contained',
      onClick: this.handleSaveAsTemplate,
      disabled: canSaveAsTemplate
    };
    return (
      <Tooltip title="Save as metadata template">
        <ConfirmButton classes={classes} {...buttonProps}>
          <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
          Save to templates
        </ConfirmButton>
      </Tooltip>
    );
  };

  render() {
    const {
      classes,
      origBundle = {},
      openDrawer,
      mode,
      modeUi,
      actionButton,
      entryPageUrl,
      handleClose
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
          {this.renderSecondaryActionButton()}
          {actionButton}
          <IconButton
            aria-label="Open drawer"
            onClick={this.props.openEntryDrawer}
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
