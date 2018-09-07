import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { compose } from 'recompose';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Tooltip from '@material-ui/core/Tooltip';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import { loadHtmlBaseUrl } from '../actions/dblDotLocalConfig.actions';

type Props = {
  classes: {},
  loadHtmlBaseUrl: () => {}
};

const materialStyles = theme => ({
  fab: {
    position: 'fixed',
    bottom: '10px',
    right: '20px'
  },
});

const mapDispatchToProps = {
  loadHtmlBaseUrl,
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

  render() {
    const { classes } = this.props;
    const { anchorEl } = this.state;
    return (
      <div data-tid="container">
        <MenuAppBar />
        <Bundles />
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
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'BundlesPage' }),
  connect(
    null,
    mapDispatchToProps
  ),
)(BundlesPage);
