import React, { Component } from 'react';
import classNames from 'classnames';
import Warning from '@material-ui/icons/Warning';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import { utilities } from '../utils/utilities';

type Props = {
  onClick: () => {},
  classes: {},
  children: React.Node
};

export default class ConfirmButton extends Component<Props> {
  props: Props;
  state = {
    isConfirming: false
  };

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onClick = async (event) => {
    const { isConfirming } = this.state;
    if (isConfirming) {
      const { onClick: origClick } = this.props;
      origClick(event);
      this.setState({ isConfirming: false });
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.setState({ isConfirming: true });
    await utilities.sleep(3000);
    if (!this.mounted) {
      return;
    }
    this.setState({ isConfirming: false });
  }

  renderConfirmButton = () => {
    const {
      classes, ...rest
    } = this.props;
    return (
      <Tooltip title={this.props.children[1]} placement="right">
        <Button
          {...rest}
          color="secondary"
          onClick={this.onClick}
        >
          <Warning key="btnConfirm" className={classNames(classes.leftIcon, classes.iconSmall)} />
          Confirm
        </Button>
      </Tooltip>
    );
  }

  render() {
    const { onClick: origOnClick, classes, ...restProps } = this.props;
    const { isConfirming } = this.state;
    return (isConfirming ?
      this.renderConfirmButton() :
      <Button {...restProps} onClick={this.onClick} onKeyPress={this.onClick}>
        {this.props.children}
      </Button>
    );
  }
}
