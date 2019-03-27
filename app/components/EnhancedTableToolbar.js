import React, { Component } from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { ux } from '../utils/ux';

const toolbarStyles = theme => ({
  root: {
    paddingRight: theme.spacing.unit,
    position: 'sticky',
    top: 60,
    backgroundColor: 'white',
    zIndex: 101,
  },
  highlight: ux.getHighlightTheme(theme, theme.palette.type),
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
  handleAddByFile?: () => {},
  handleAddByFolder?: () => {}
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
    const {
      classes, handleAddByFile
    } = this.props;
    const { anchorEl } = this.state;
    return (
      <Toolbar
        className={classNames(classes.root)}
      >
        <div className={classes.spacer} />
        <div className={classes.actions}>
          {handleAddByFile ? (
            <div>
              <Tooltip title="Add resource(s)">
                <Fab
                  aria-owns={anchorEl ? 'simple-menu' : null}
                  aria-haspopup="true"
                  onClick={this.handleClick}
                  color="secondary"
                  aria-label="Add"
                  className={classes.button}
                >
                  <AddIcon />
                </Fab>
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
      </Toolbar>
    );
  }
}

EnhancedTableToolbar.defaultProps = {
  enableEditContainer: false,
  handleAddByFile: undefined,
  handleAddByFolder: undefined
};

export default withStyles(toolbarStyles)(EnhancedTableToolbar);
