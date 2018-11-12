import React from 'react';
import Button from '@material-ui/core/Button';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { DebounceInput } from 'react-debounce-input';
import { compose } from 'recompose';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import NavigateBefore from '@material-ui/icons/NavigateBefore';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';

import { updateSearchInput, clearSearch } from '../actions/bundleFilter.actions';


function mapStateToProps(state, props) {
  const { bundlesFilter, authentication } = state;
  const { isLoading: isLoadingSearch } = bundlesFilter;
  const { isSearchActive } = bundlesFilter;
  const { searchInputRaw } = bundlesFilter;
  const { loggedIn, whoami, workspaceName = props.workspaceName } = authentication;
  const { display_name: userName = 'DEMO USER' } = whoami || {};
  return {
    loggedIn,
    userName,
    isLoadingSearch,
    isSearchActive,
    searchInputRaw,
    workspaceName
  };
}

const mapDispatchToProps = {
  updateSearchInput,
  clearSearch
};

type Props = {
    classes: {},
    loggedIn: boolean,
    userName: string,
    isSearchActive: boolean,
    searchInputRaw: ?string,
    workspaceName: ?string,
    showSearch: boolean,
    updateSearchInput: () => {},
    clearSearch: () => {}
};

const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
  root: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
});

class MenuAppBar extends React.PureComponent {
  props: Props;
  state = {
    anchorEl: null,
  };

  handleChange = (event, checked) => {
  };

  handleMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  onChangeSearchInput = (event) => {
    const inputValue = event.target.value;
    this.props.updateSearchInput(inputValue);
  }

  searchInputValue = () => {
    const { isSearchActive, searchInputRaw } = this.props;
    return isSearchActive ? searchInputRaw : '';
  }

  handleBackToWorkspaces = () => {
    history.push(navigationConstants.NAVIGATION_WORKSPACES);
  }

  render() {
    const { classes, loggedIn, userName, workspaceName, showSearch } = this.props;
    const { anchorEl } = this.state;
    const open = Boolean(anchorEl);

    return (
      <AppBar position="sticky">
        <Toolbar>
          <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="title" color="inherit" className={classes.flex}>
            nathanael
          </Typography>
          {showSearch &&
          <div>
            <DebounceInput
              debounceTimeout={300}
              className="form-control"
              value={this.searchInputValue()}
              placeholder="Search"
              onChange={(event) => this.onChangeSearchInput(event, event.target.value)}
            />
          </div>}
          {workspaceName && (
            <div>
              <Button color="inherit" onClick={this.handleMenu}>
                { workspaceName } / {loggedIn ? userName : 'Login' }
                <AccountCircle className={classNames(classes.rightIcon, classes.iconSmall)} />
              </Button>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={open}
                onClose={this.handleClose}
              >
                <MenuItem onClick={this.handleBackToWorkspaces}>Logout (Workspaces)</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
    );
  }
}

export default compose(
  withStyles(styles, { name: 'MenuAppBar' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(MenuAppBar);