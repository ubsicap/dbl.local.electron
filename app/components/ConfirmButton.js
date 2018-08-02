import React, { Component } from 'react';
import classNames from 'classnames';
import Warning from '@material-ui/icons/Warning';
import Button from '@material-ui/core/Button';
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

  async componentDidUpdate(prevProps, prevState) {
    const { isConfirming } = this.state;
    const { isConfirming: prevIsConfirming } = prevState;
    if (isConfirming && !prevIsConfirming) {
      await utilities.sleep(3000);
      this.setState({ isConfirming: false });
    }
  }

  onClick = (event) => {
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
  }

  renderConfirmButton = () => {
    const {
      classes,
    } = this.props;
    return (
      <Button
        {...this.props}
        color="secondary"
        onClick={this.onClick}
      >
        <Warning key="btnConfirm" className={classNames(classes.leftIcon, classes.iconSmall)} />
        Confirm
      </Button>
    );
  }

  render() {
    const { onClick: origOnClick, ...restProps } = this.props;
    const { isConfirming } = this.state;
    return (isConfirming ?
      this.renderConfirmButton() :
      <Button {...restProps} onClick={this.onClick} onKeyPress={this.onClick}>
        {this.props.children}
      </Button>
    );
  }
}
