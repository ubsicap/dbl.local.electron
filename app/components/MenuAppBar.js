import React from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { DebounceInput } from 'react-debounce-input';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import { history } from '../store/configureStore';
import { updateSearchInput, clearSearch } from '../actions/bundleFilter.actions';


function mapStateToProps(state) {
  const { bundlesFilter } = state;
  return {
    bundlesFilter
  };
}

const mapDispatchToProps = {
  updateSearchInput,
  clearSearch
};

type Props = {
    classes: {},
    bundlesFilter: {},
    updateSearchInput: () => {},
    clearSearch: () => {}
};

const styles = {
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
};

class MenuAppBar extends React.PureComponent {
  props: Props;
  state = {
    auth: true,
    anchorEl: null,
  };

  componentDidMount() {
    const { clearSearch: clearSearchResults } = this.props;
    history.listen(() => {
      // clear search results on location change
      clearSearchResults();
    });
  }

  handleChange = (event, checked) => {
    this.setState({ auth: checked });
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
    const { bundlesFilter } = this.props;
    return bundlesFilter.isSearchActive ? bundlesFilter.searchInputRaw : '';
  }

  render() {
    const { classes } = this.props;
    const { auth, anchorEl } = this.state;
    const open = Boolean(anchorEl);

    return (
      <div className={classes.root}>
        <AppBar position="fixed">
          <Toolbar>
            <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
              <MenuIcon />
            </IconButton>
            <Typography variant="title" color="inherit" className={classes.flex}>
              Nathanael
            </Typography>
            <div>
              <DebounceInput
                debounceTimeout={300}
                className="form-control"
                value={this.searchInputValue()}
                placeholder="Search"
                onChange={(event) => this.onChangeSearchInput(event, event.target.value)}
              />
            </div>
            {auth && (
              <div>
                <IconButton
                  aria-owns={open ? 'menu-appbar' : null}
                  aria-haspopup="true"
                  onClick={this.handleMenu}
                  color="inherit"
                >
                  <AccountCircle />
                </IconButton>
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
                  <MenuItem onClick={this.handleClose}>Profile</MenuItem>
                  <MenuItem onClick={this.handleClose}>My account</MenuItem>
                </Menu>
              </div>
            )}
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

// from https://stackoverflow.com/a/45708498. Alternatively use npm 'recompose' module
MenuAppBar = withStyles(styles, { name: 'MenuAppBar' })(MenuAppBar); // eslint-disable-line no-class-assign
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MenuAppBar);
