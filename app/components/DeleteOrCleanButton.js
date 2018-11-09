import React, { Component } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import Delete from '@material-ui/icons/Delete';
import { removeResources, removeBundle } from '../actions/bundle.actions';
import ConfirmButton from './ConfirmButton';

type Props = {
  classes: {},
  bundleId: string,
  status: string,
  shouldDisableCleanResources: boolean,
  removeResources: () => {},
  removeBundle: () => {}
};

const mapDispatchToProps = {
  removeResources,
  removeBundle
};

class DeleteOrCleanButton extends Component<Props> {
  props: Props;

  onClickDeleteBundle = (event) => {
    const { bundleId } = this.props;
    this.props.removeBundle(bundleId);
    event.stopPropagation();
  }

  onClickRemoveResources = (event) => {
    const { bundleId } = this.props;
    this.props.removeResources(bundleId);
    event.stopPropagation();
  }

  render() {
    const { status, classes, shouldDisableCleanResources } = this.props;
    if (status === 'DRAFT') {
      return (
        <ConfirmButton classes={classes} variant="text" size="small" className={classes.button}
          onKeyPress={this.onClickDeleteBundle}
          onClick={this.onClickDeleteBundle}
        >
          <Delete className={classNames(classes.leftIcon, classes.iconSmall)} />
          Delete
        </ConfirmButton>
      );
    }
    return (
      <ConfirmButton classes={classes} variant="text" size="small" className={classes.button}
        disabled={shouldDisableCleanResources}
        onKeyPress={this.onClickRemoveResources}
        onClick={this.onClickRemoveResources}
      >
        <Delete className={classNames(classes.leftIcon, classes.iconSmall)} />
        Clean
      </ConfirmButton>
    );
  }
}

export default connect(
  null,
  mapDispatchToProps
)(DeleteOrCleanButton);
