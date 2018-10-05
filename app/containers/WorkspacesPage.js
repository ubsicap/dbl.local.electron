import React, { PureComponent } from 'react';
import fs from 'fs-extra';
import path from 'path';
import sort from 'fast-sort';
import uuidv1 from 'uuid/v1';
import classNames from 'classnames';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import { AddCircle, ImportExport, Refresh } from '@material-ui/icons';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

const { app } = require('electron').remote;

type Props = {
  classes: {}
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
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing.unit * 6,
  },
});

const workspacesDir = path.join(app.getPath('userData'), 'workspaces');

function createWorkspace(fullPath) {
  const stats = fs.lstatSync(fullPath);
  if (!stats.isDirectory()) {
    return null;
  }
  const name = path.basename(fullPath);
  const dateModified = stats.mtime;
  const workspace = { name, fullPath, stats, dateModified };
  return workspace;
}

class WorkspacesPage extends PureComponent<Props> {
  props: Props;
  state = { cards: [] }

  componentDidMount() {
    // read directories
    this.updateAllWorkspaceCards();
  }

  updateAllWorkspaceCards = async () => {
    await fs.ensureDir(workspacesDir);
    const files = await fs.readdir(workspacesDir);
    files.map(file => path.join(workspacesDir, file)).forEach(fullPath => {
      const nextWorkspace = createWorkspace(fullPath);
      if (nextWorkspace === null) {
        return;
      }
      this.updateWorkspaceCards(nextWorkspace);
    });
  }

  refreshAll = () => {
    this.setState({ cards: [] }, this.updateAllWorkspaceCards);
  }

  updateWorkspaceCards = (nextWorkspace) => {
    const cards = [...this.state.cards, nextWorkspace];
    const orderByConfig = [{ desc: 'dateModified' }];
    const sorted = sort(cards).by(orderByConfig);
    this.setState({ cards: sorted });
  }

  handleCreateWorkspace = () => {
    const uuid1 = uuidv1();
    const name = `My Org ${uuid1.substr(0, 5)}`;
    const fullPath = path.join(workspacesDir, name);
    fs.ensureDirSync(fullPath);
    const stats = fs.lstatSync(fullPath);
    const dateModified = stats.mtime;
    this.updateWorkspaceCards({ name, fullPath, dateModified, stats });
  };

  render() {
    const { classes } = this.props;
    const { cards } = this.state;
    return (
      <React.Fragment>
        <CssBaseline />
        <AppBar className={classes.appBar}>
          <Toolbar>
            <ImportExport className={classes.icon} />
            <Typography variant="title" color="inherit" noWrap>
              nathanael
            </Typography>
          </Toolbar>
        </AppBar>
        <main>
          {/* Hero unit */}
          <div className={classes.heroUnit}>
            <div className={classes.heroContent}>
              <Typography variant="display3" align="center" color="textPrimary" gutterBottom>
                Workspaces
              </Typography>
              <Typography variant="title" align="center" color="textSecondary" paragraph>
                A workspace provides a way to associate DBL organization access tokens with their own list of DBL entries.
                Users should create a workspace for each organization for which they have DBL roles.
              </Typography>
              <div className={classes.heroButtons}>
                <Grid container spacing={16} justify="center">
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
                <Grid item key={card.name} sm={12} md={12} lg={12}>
                  <Card className={classes.card}>
                    <CardContent className={classes.cardContent}>
                      <Typography gutterBottom variant="headline" component="h2">
                        {card.name}
                      </Typography>
                      <Typography>
                        {card.dateModified.toLocaleString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="primary">
                        Edit Name
                      </Button>
                      <Button size="small" color="primary">
                        Import config.xml
                      </Button>
                      <Button variant="contained" size="small" color="primary">
                        Login
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </div>
        </main>
        {/* Footer */}
        <footer className={classes.footer}>
          <Typography variant="title" align="center" gutterBottom>
            Summary
          </Typography>
          <Typography variant="subheading" align="center" color="textSecondary" component="p">
            This nathanael has {cards.length} workspace(s)
          </Typography>
        </footer>
        {/* End footer */}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(WorkspacesPage);
