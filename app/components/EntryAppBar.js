import React, { Component } from 'react';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import MenuIcon from '@material-ui/icons/Menu';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Grid from '@material-ui/core/Grid';
import FolderOpen from '@material-ui/icons/FolderOpen';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Link from '@material-ui/icons/Link';
import classNames from 'classnames';
import { ux } from '../utils/ux';
import CopyForPasteButton from './CopyForPasteButton';
import EntryTitle from '../components/EntryTitle';

type Props = {
  classes: {},
  origBundle: {}
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

class EntryAppBar extends Component<Props> {
  props: Props;
  state = {
    openDrawer: false,
  }

  render() {
    const {
      classes, origBundle = {}
    } = this.props;
    const { openDrawer } = this.state;
    const { storedResources } = this.getSelectedResourcesByStatus();
    const { displayAs = {} } = origBundle;
    const { revision } = displayAs;
    const modeUi = this.modeUi();
    const { status, parent, dblId } = origBundle;
    const revBackground =
      ux.getDblRowBackgroundColor(false, classes, status, revision, parent, dblId);
    return (
      <AppBar className={classNames(classes.appBar, {
        [classes.appBarShift]: openDrawer,
      })}
      >
        <Toolbar className={classes.toolBar} disableGutters={!openDrawer}>
          <IconButton
            aria-label="Open drawer"
            onClick={this.handleDrawerOpen}
            className={classNames(classes.menuButton, openDrawer && classes.hide)}
            color="inherit"
          >
            <MenuIcon />
          </IconButton>
          <Grid container justify="flex-start" alignItems="center" spacing={24}>
            <Grid item>
              <Typography variant="h6" color="inherit" noWrap>
                <FolderOpen color="inherit" className={classNames(classes.leftIcon)} />
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
            disabled={storedResources.length === 0}
            selectedItems={storedResources}
          />}
          {this.renderOkOrPasteResourcesButton()}
          <IconButton color="inherit" onClick={this.handleClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    );
  }
}

export default compose(withStyles(materialStyles, { withTheme: true }))(EntryAppBar);
