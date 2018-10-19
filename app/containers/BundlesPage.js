import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import DblDotLocalAppBar from '../components/DblDotLocalAppBar';
import { ux } from '../utils/ux';
import { loadHtmlBaseUrl } from '../actions/dblDotLocalConfig.actions';
import { createNewBundle } from '../actions/bundle.actions';

type Props = {
  classes: {},
  newMediaTypes: [],
  loadHtmlBaseUrl: () => {},
  createNewBundle: () => {}
};

function mapStateToProps(state) {
  const { bundles } = state;
  const { newMediaTypes = [] } = bundles;
  return {
    newMediaTypes
  };
}

const materialStyles = () => ({
  fab: {
    position: 'fixed',
    bottom: '100px',
    right: '20px'
  },
});

const mapDispatchToProps = {
  loadHtmlBaseUrl,
  createNewBundle
};

class BundlesPage extends PureComponent<Props> {
  props: Props;
  state = {
    anchorEl: null
  }
  componentDidMount() {
    this.props.loadHtmlBaseUrl();
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  handleCreateNew = (medium) => () => {
    this.handleCloseMenu();
    this.props.createNewBundle(medium);
  };

  render() {
    const { classes, newMediaTypes } = this.props;
    const { anchorEl } = this.state;
    return (
      <div data-tid="container">
        <MenuAppBar showSearch />
        <Bundles />
        <div style={{ paddingBottom: '100px' }} />
        <Tooltip title="Create new...">
          <Button
            aria-owns={anchorEl ? 'simple-menu' : null}
            aria-haspopup="true"
            onClick={this.handleClick}
            variant="fab"
            color="primary"
            aria-label="Add"
            className={classes.fab}
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
          {newMediaTypes.map(medium => (
            <MenuItem key={medium} onClick={this.handleCreateNew(medium)}>
              { ux.getMediumIcon(medium) }{medium}
            </MenuItem>
          ))}
        </Menu>
        <DblDotLocalAppBar />
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'BundlesPage' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(BundlesPage);
