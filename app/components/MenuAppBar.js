import React from 'react';
import Button from '@material-ui/core/Button';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { DebounceInput } from 'react-debounce-input';
import { compose } from 'recompose';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Badge from '@material-ui/core/Badge';
import Typography from '@material-ui/core/Typography';
import AssignmentIcon from '@material-ui/icons/Assignment';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { ux } from '../utils/ux';
import {
  updateSearchInput,
  clearSearch
} from '../actions/bundleFilter.actions';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';
import { workspaceHelpers } from '../helpers/workspaces.helpers';
import MediumIcon from './MediumIcon';

function mapStateToProps(state, props) {
  const { bundlesFilter, authentication, clipboard: clipboardState } = state;
  const { selectedItemsToPaste: clipboard = {} } = clipboardState;
  const { isLoading: isLoadingSearch } = bundlesFilter;
  const { isSearchActive } = bundlesFilter;
  const { searchInputRaw } = bundlesFilter;
  const { workspaceFullPath, workspaceName: workspaceNameFromState } =
    workspaceHelpers.getCurrentWorkspaceFullPath(state) || {};
  const {
    loggedIn,
    whoami,
    workspaceName = props.workspaceName || workspaceNameFromState
  } = authentication;
  const { display_name: userName = 'DEMO USER', email: userEmail } =
    whoami || {};
  return {
    loggedIn,
    userName,
    isLoadingSearch,
    isSearchActive,
    searchInputRaw,
    workspaceName,
    clipboard,
    workspaceFullPath,
    userEmail
  };
}

const mapDispatchToProps = {
  updateSearchEntriesInput: updateSearchInput,
  clearSearch
};

type Props = {
  classes: {},
  loggedIn: boolean,
  userName: string,
  isSearchActive: boolean,
  searchInputRaw: ?string,
  workspaceName: ?string,
  showSearch?: boolean,
  showClipboard?: boolean,
  showLogout?: boolean,
  clipboard: ?{},
  workspaceFullPath?: string,
  userEmail?: string,
  title?: string,
  updateSearchEntriesInput: () => {},
  children?: React.Node
};

const styles = theme => ({
  button: {
    margin: theme.spacing.unit
  },
  leftIcon: {
    marginRight: theme.spacing.unit
  },
  rightIcon: {
    marginLeft: theme.spacing.unit
  },
  iconSmall: {
    fontSize: 20
  },
  iconSmaller: {
    fontSize: 12
  },
  badge: {
    marginRight: 7,
    height: 18,
    width: 18
  },
  root: {
    flexGrow: 1
  },
  flex: {
    flex: 1
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20
  }
});

class MenuAppBar extends React.PureComponent {
  props: Props;

  state = {
    anchorEl: null
  };

  componentDidMount() {
    const {
      workspaceFullPath,
      userEmail,
      updateSearchEntriesInput
    } = this.props;
    if (workspaceFullPath && userEmail) {
      const savedSearchInput = workspaceUserSettingsStoreServices.loadBundlesSearchInput(
        workspaceFullPath,
        userEmail
      );
      if (savedSearchInput && savedSearchInput.length > 0) {
        updateSearchEntriesInput(savedSearchInput);
      }
    }
  }

  handleChange = (/* event, checked */) => {};

  handleMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  onChangeSearchInput = event => {
    const inputValue = event.target.value;
    const { updateSearchEntriesInput } = this.props;
    updateSearchEntriesInput(inputValue);
  };

  searchInputValue = () => {
    const { isSearchActive, searchInputRaw } = this.props;
    return isSearchActive ? searchInputRaw : '';
  };

  handleBackToWorkspaces = () => {
    history.push(navigationConstants.NAVIGATION_WORKSPACES);
  };

  render() {
    const {
      classes,
      loggedIn,
      userName,
      workspaceName,
      showSearch,
      showClipboard,
      clipboard,
      title,
      showLogout,
      children
    } = this.props;
    const { anchorEl } = this.state;
    const open = showLogout && Boolean(anchorEl);
    const clipboardMedium = clipboard.bundleId ? clipboard.getMedium() : '';
    const clipboardTooltip = ux.getClipboardTooltip(clipboard);
    return (
      <AppBar position="sticky">
        <Toolbar>
          {/*
          <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
            <MenuIcon />
          </IconButton>
          */}
          <Typography variant="h6" color="inherit" className={classes.flex}>
            {title}
          </Typography>
          {showSearch && (
            <div>
              <DebounceInput
                debounceTimeout={300}
                className="form-control"
                value={this.searchInputValue()}
                placeholder="Search"
                onChange={event =>
                  this.onChangeSearchInput(event, event.target.value)
                }
              />
            </div>
          )}
          {showClipboard && clipboard.bundleId && (
            <div style={{ marginLeft: '10px', marginRight: '10px' }}>
              <Tooltip title={clipboardTooltip}>
                <Button
                  key="btnClipboard"
                  color="inherit"
                  // onClick={this.handlePasteResources}
                >
                  <Badge
                    badgeContent={
                      <MediumIcon
                        medium={clipboardMedium}
                        iconProps={{
                          className: classNames(
                            classes.rightIcon,
                            classes.iconSmaller
                          )
                        }}
                      />
                    }
                  >
                    <AssignmentIcon className={classNames(classes.leftIcon)} />
                  </Badge>
                  {ux.conditionallyRenderBadge(
                    { classes: { badge: classes.badge }, color: 'secondary' },
                    clipboard.items.length,
                    ''
                  )}
                </Button>
              </Tooltip>
            </div>
          )}
          {workspaceName && (
            <div>
              <Button color="inherit" onClick={this.handleMenu}>
                {workspaceName} / {loggedIn ? userName : 'Login'}
                <AccountCircle
                  className={classNames(classes.rightIcon, classes.iconSmall)}
                />
              </Button>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right'
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right'
                }}
                open={open}
                onClose={this.handleClose}
              >
                <MenuItem onClick={this.handleBackToWorkspaces}>
                  Logout (Workspaces)
                </MenuItem>
              </Menu>
            </div>
          )}
          {children}
        </Toolbar>
      </AppBar>
    );
  }
}

MenuAppBar.defaultProps = {
  showSearch: false,
  showClipboard: false,
  showLogout: false,
  workspaceFullPath: undefined,
  userEmail: undefined,
  title: 'nathanael',
  children: null
};

export default compose(
  withStyles(styles, { name: 'MenuAppBar' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(MenuAppBar);
