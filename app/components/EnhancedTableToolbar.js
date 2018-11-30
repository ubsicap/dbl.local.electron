import React, { Component } from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import InfoIcon from '@material-ui/icons/Info';
import FilterListIcon from '@material-ui/icons/FilterList';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import IntegrationAutosuggest from '../components/IntegrationAutosuggest';

const toolbarStyles = theme => ({
  root: {
    paddingRight: theme.spacing.unit,
    position: 'sticky',
    top: 60,
    backgroundColor: 'white',
    zIndex: 2,
  },
  highlight:
    theme.palette.type === 'light'
      ? {
        color: theme.palette.secondary.main,
        backgroundColor: lighten(theme.palette.secondary.light, 0.85),
      }
      : {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.secondary.dark,
      },
  spacer: {
    flex: '1 1 100%',
  },
  actions: {
    color: theme.palette.text.secondary
  },
  title: {
    flex: '0 0 auto',
  },
  button: {
    margin: theme.spacing.unit,
  },
});

type Props = {
  classes: {},
  numSelected: number,
  handleAddByFile: ?() => {},
  handleAddByFolder: ?() => {},
  getSuggestions: ?() => {},
  onAutosuggestInputChanged: ?() => {}
};

class EnhancedTableToolbar extends Component<Props> {
  props: Props;
  state = {
    anchorEl: null
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleAddByFileInternal = () => {
    this.handleCloseMenu();
    this.props.handleAddByFile();
  };

  handleAddByFolderInternal = () => {
    this.handleCloseMenu();
    this.props.handleAddByFolder();
  }

  render() {
    const { numSelected, classes, handleAddByFile } = this.props;
    const { anchorEl } = this.state;
    return (
      <Toolbar
        className={classNames(classes.root, {
          [classes.highlight]: numSelected > 0,
        })}
      >
        <div className={classes.title}>
          {numSelected > 0 ? (
            <Typography color="inherit" variant="subheading">
              {numSelected} selected
            </Typography>
          ) : (
            <Typography variant="title" id="tableTitle" />
          )}
        </div>
        <div className={classes.spacer} />
        <div style={{ width: 700 }}>
          {handleAddByFile && numSelected > 0 ? (
            <IntegrationAutosuggest
              getSuggestions={this.props.getSuggestions}
              onInputChanged={this.props.onAutosuggestInputChanged}
            />) : null}
        </div>
        <div className={classes.actions}>
          {handleAddByFile ? (
            <div>
              <Tooltip title="Add resource(s)">
                <Button
                  aria-owns={anchorEl ? 'simple-menu' : null}
                  aria-haspopup="true"
                  onClick={this.handleClick}
                  variant="fab"
                  color="secondary"
                  aria-label="Add"
                  className={classes.button}
                >
                  <AddIcon />
                </Button>
              </Tooltip>
              <Menu
                id="simple-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={this.handleCloseMenu}
              >
                <MenuItem onClick={this.handleAddByFileInternal}>by File</MenuItem>
                <MenuItem onClick={this.handleAddByFolderInternal}>by Folder</MenuItem>
              </Menu>
            </div>
          ) : null
        }
        </div>
        <div className={classes.actions}>
          {numSelected > 0 ? (
            <Tooltip title="Summary">
              <IconButton aria-label="Summary">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Filter list">
              <IconButton aria-label="Filter list">
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </Toolbar>
    );
  }
}

export default withStyles(toolbarStyles)(EnhancedTableToolbar);
