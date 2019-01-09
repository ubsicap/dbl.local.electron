import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import fs from 'fs-extra';
import path from 'path';
import sort from 'fast-sort';
import uuidv1 from 'uuid/v1';
import classNames from 'classnames';
import Button from '@material-ui/core/Button';
import { AddCircle, Refresh, Settings, Delete } from '@material-ui/icons';
import Tooltip from '@material-ui/core/Tooltip';
import Link from '@material-ui/icons/Link';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import { gotoWorkspaceLoginPage, getDblDotLocalExecStatus } from '../actions/dblDotLocalConfig.actions';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { clearClipboard } from '../actions/bundleManageResources.actions';
import { logout } from '../actions/user.actions';
import MenuAppBar from '../components/MenuAppBar';
import WorkspaceEditDialog from '../components/WorkspaceEditDialog';
import ConfirmButton from '../components/ConfirmButton';
import { utilities } from '../utils/utilities';

type Props = {
  classes: {},
  isRunningUnknownDblDotLocalProcess: boolean,
  isRequestingStopDblDotLocalExecProcess: boolean,
  getDblDotLocalExecStatus: () => {},
  gotoWorkspaceLoginPage: () => {},
  logout: () => {},
  clearClipboard: () => {}
};

function mapStateToProps(state) {
  const { dblDotLocalConfig } = state;
  const {
    isRunningUnknownDblDotLocalProcess = false,
    isRequestingStopDblDotLocalExecProcess = false
  } = dblDotLocalConfig;
  return {
    isRequestingStopDblDotLocalExecProcess,
    isRunningUnknownDblDotLocalProcess
  };
}

const mapDispatchToProps = {
  getDblDotLocalExecStatus,
  gotoWorkspaceLoginPage,
  logout,
  clearClipboard
};

const styles = theme => ({
  appBar: {
    position: 'sticky',
  },
  icon: {
    marginRight: theme.spacing.unit * 2,
  },
  heroUnit: {
    backgroundColor: theme.palette.background.paper,
  },
  heroContent: {
    maxWidth: 600,
    margin: '0 auto',
    padding: `${theme.spacing.unit * 8}px 0 ${theme.spacing.unit * 6}px`,
  },
  heroButtons: {
    marginTop: theme.spacing.unit * 4,
  },
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(1100 + theme.spacing.unit * 3 * 2)]: {
      width: 1100,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  },
  cardGrid: {
    padding: `${theme.spacing.unit * 8}px 0`,
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardMedia: {
    paddingTop: '56.25%', // 16:9
  },
  cardContent: {
    flexGrow: 1,
  },
  subHeading: {
    marginLeft: '20px'
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing.unit * 6,
  },
});

const workspacesDir = dblDotLocalService.getWorkspacesDir();

async function createWorkspace(fullPath) {
  const stats = fs.lstatSync(fullPath);
  if (!stats.isDirectory()) {
    return null;
  }
  const name = path.basename(fullPath);
  const dateModified = stats.mtime;
  const workspace = { name, fullPath, stats, dateModified };
  const configXmlPath = dblDotLocalService.getConfigXmlFullPath(workspace);
  const hasConfigXml = fs.existsSync(configXmlPath);
  const configXmlSettings = hasConfigXml ? await dblDotLocalService.convertConfigXmlToJson(workspace) : null;
  const key = `${name}/${configXmlSettings ? JSON.stringify(configXmlSettings) : ''}`;
  return { ...workspace, hasConfigXml, configXmlPath, configXmlSettings, key };
}

class WorkspacesPage extends PureComponent<Props> {
  props: Props;
  state = { cards: [] }

  componentDidMount() {
    this.props.logout();
    this.props.getDblDotLocalExecStatus();
    this.props.clearClipboard();
    this.updateAllWorkspaceCards();
  }

  updateAllWorkspaceCards = async () => {
    await fs.ensureDir(workspacesDir);
    const files = await fs.readdir(workspacesDir);
    files.map(file => path.join(workspacesDir, file)).forEach(async fullPath => {
      const nextWorkspace = await createWorkspace(fullPath);
      if (nextWorkspace === null) {
        return;
      }
      this.updateWorkspaceCards(nextWorkspace);
    });
  }

  refreshAll = () => {
    this.props.getDblDotLocalExecStatus();
    this.setState({ cards: [] }, this.updateAllWorkspaceCards);
  }

  updateWorkspaceCards = (nextWorkspace, workspaceToRemove) => {
    const workspacesToAdd = nextWorkspace ? [nextWorkspace] : [];
    const cards = [...this.state.cards.filter(w => w !== workspaceToRemove), ...workspacesToAdd];
    const orderByConfig = [{ desc: 'dateModified' }];
    const sorted = sort(cards).by(orderByConfig);
    this.setState({ cards: sorted });
  }

  handleCreateWorkspace = async () => {
    const uuid1 = uuidv1();
    const name = `My Org ${uuid1.substr(0, 5)}`;
    const fullPath = path.join(workspacesDir, name);
    fs.ensureDirSync(fullPath);
    const workspace = await createWorkspace(fullPath);
    this.updateWorkspaceCards(workspace);
  };

  onClickDeleteWorkspace = (workspace) => async () => {
    fs.removeSync(workspace.fullPath);
    this.updateWorkspaceCards(null, workspace);
  }

  handleEdit = (workspace) => async (event) => {
    // launch edit dialog
    const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(workspace);
    this.setState({ openEditDialog: { workspace, configXmlSettings } });
  }

  handleClickOkEdit = (oldSettings, newSettings) => async (event) => {
    const { workspace: { fullPath: oldWorkspacePath } } = oldSettings;
    const { workspace: { fullPath: newWorkspacePath } } = newSettings;
    if (oldWorkspacePath !== newWorkspacePath) {
      try {
        // console.log(`renaming workspace path to ${newWorkspacePath}`);
        fs.renameSync(oldWorkspacePath, newWorkspacePath);
      } catch (error) {
        console.log(error);
      }
    }
    dblDotLocalService.updateAndWriteConfigXmlSettings(newSettings);
    const newWorkspace = await createWorkspace(newWorkspacePath);
    this.updateWorkspaceCards(newWorkspace, oldSettings.workspace);
    this.setState({ openEditDialog: null });
  }

  handleClickCancelEdit = (event) => {
    this.setState({ openEditDialog: null });
  }

  handleLogin = (workspace) => (event) => {
    updateWorkspaceLastAccess(workspace);
    this.props.gotoWorkspaceLoginPage(workspace);
  }

  getInitialFormErrors = (card) => (formErrors) => {
    // console.log({ card, formErrors });
    const { name } = card;
    this.setState({ configXmlErrors: { ...(this.state.configXmlErrors || {}), [name]: formErrors } });
    // , console.log(this.state.configXmlErrors)
  }

  shouldDisableLogin = (card) => {
    const { isRunningUnknownDblDotLocalProcess } = this.props;
    const { configXmlErrors } = this.state;
    const { name } = card;
    return isRunningUnknownDblDotLocalProcess || !configXmlErrors || !configXmlErrors[name] || Boolean(configXmlErrors[name].length);
  }

  shouldOpenEditDialog = (card) =>
    (this.state.openEditDialog && this.state.openEditDialog.workspace === card);

  renderWorkspaceCards = () => {
    const { classes, isRunningUnknownDblDotLocalProcess, isRequestingStopDblDotLocalExecProcess } = this.props;
    const { cards, openEditDialog } = this.state;
    return (
      <React.Fragment>
        <main>
          {/* Hero unit */}
          <div className={classes.heroUnit}>
            <div className={classes.heroContent}>
              <Typography variant="display3" align="center" color="textPrimary" gutterBottom>
                Workspaces
              </Typography>
              <Typography variant="title" align="center" color="textSecondary" paragraph>
                Each workspace associates a DBL organization access token/secret pair with their own list of DBL entries.
                Users should create a workspace for each organization for which they have DBL roles.
              </Typography>
              <div className={classes.heroButtons}>
                <Grid container spacing={16} justify="center">
                  {isRunningUnknownDblDotLocalProcess &&
                  <Grid item>
                    <Button disabled={isRequestingStopDblDotLocalExecProcess} variant="contained" color="secondary" onClick={this.handleLogin()}>
                      Login to Unknown Workspace
                    </Button>
                  </Grid>}
                  <Grid item>
                    <Button variant="contained" color="primary" onClick={this.handleCreateWorkspace}>
                      <AddCircle className={classes.icon} />
                      Create A Workspace
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button variant="outlined" color="primary" onClick={this.refreshAll}>
                      <Refresh className={classes.icon} />
                      Refresh All
                    </Button>
                  </Grid>
                </Grid>
              </div>
            </div>
          </div>
          <div className={classNames(classes.layout, classes.cardGrid)}>
            {/* End hero unit */}
            <Grid container spacing={40}>
              {cards.map(card => (
                <Grid item key={card.key} sm={12} md={12} lg={12}>
                  <Card className={classes.card}>
                    <CardContent className={classes.cardContent}>
                      <Typography gutterBottom variant="headline" component="h2">
                        <div>
                          {card.name}
                        </div>
                      </Typography>
                      <Typography variant="caption">
                        <b>Last Accessed:</b>
                      </Typography>
                      <Typography variant="caption">
                        {card.dateModified.toLocaleString()}
                      </Typography>
                      {card.configXmlSettings &&
                      <div>
                        <Typography variant="subheading" align="center">
                          <b>{card.configXmlSettings.settings.dbl[0].organizationType[0].toUpperCase()}</b>
                        </Typography>
                        <Typography variant="body1" align="center" paragraph>
                          {card.configXmlSettings.settings.dbl[0].downloadOpenAccessEntries[0] === 'true' ?
                            'download open-access entries is ENABLED' : 'download open-access entries is DISABLED'}
                        </Typography>
                        <Typography variant="subheading" align="center">
                          <b>Access Token:</b>
                        </Typography>
                        <Typography align="center" paragraph>
                          {card.configXmlSettings.settings.dbl[0].accessToken[0]}
                        </Typography>
                        <Typography align="center">
                          <Button variant="text" onClick={utilities.onOpenLink(getDblWebsiteUrl(card))}>
                            <Link className={classes.icon} /><span style={{ color: 'blue' }}>{getDblWebsiteUrl(card)}</span>
                          </Button>
                        </Typography>
                      </div>}
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="primary" onClick={this.handleEdit(card)}>
                        <Settings className={classes.icon} />
                        Settings
                      </Button>
                      {(card.configXmlSettings || this.shouldOpenEditDialog(card)) &&
                      <WorkspaceEditDialog
                        open={Boolean(this.shouldOpenEditDialog(card))}
                        settings={{ workspace: card, configXmlSettings: card.configXmlSettings || openEditDialog.configXmlSettings }}
                        handleClickOk={this.handleClickOkEdit}
                        handleClickCancel={this.handleClickCancelEdit}
                        getInitialFormErrors={this.getInitialFormErrors(card)}
                      />}
                      <Button disabled={this.shouldDisableLogin(card)} variant="contained" size="small" color="primary" onClick={this.handleLogin(card)}>
                        Login
                      </Button>
                      <div style={{ flex: 1 }} />
                      <ConfirmButton
                        classes={classes}
                        variant="text"
                        size="small"
                        onClick={this.onClickDeleteWorkspace(card)}
                      >
                        <Tooltip title="Delete">
                          <Delete className={classNames(classes.leftIcon, classes.iconSmall)} />
                        </Tooltip>
                      </ConfirmButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </div>
        </main>
        <footer className={classes.footer}>
          <Typography variant="title" align="center" gutterBottom>
            Summary
          </Typography>
          <Typography variant="subheading" align="center" color="textSecondary" component="p">
            This nathanael has {cards.length} workspace(s)
          </Typography>
        </footer>
      </React.Fragment>);
  }

  render() {
    return (
      <React.Fragment>
        <CssBaseline />
        <MenuAppBar />
        {this.renderWorkspaceCards()}
      </React.Fragment>
    );
  }
}

export default compose(
  withStyles(styles, { name: 'WorkspacesPage' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(WorkspacesPage);

function getDblWebsiteUrl(workspace) {
  const dblBaseUrl = workspace.configXmlSettings.settings.dbl[0].html[0];
  const transport = dblBaseUrl.startsWith('http') ? '' : 'https://';
  return `${transport}${dblBaseUrl}`;
}

function updateWorkspaceLastAccess(workspace) {
  if (!workspace || !workspace.fullPath) {
    // unknown workspace
    return;
  }
  const lastAccessedTokenPath = path.join(workspace.fullPath, '.lastAccessed');
  fs.ensureFileSync(lastAccessedTokenPath);
  fs.removeSync(lastAccessedTokenPath);
}
