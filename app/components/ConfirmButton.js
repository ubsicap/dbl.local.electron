import React, { Component } from 'react';
import classNames from 'classnames';
import Warning from '@material-ui/icons/Warning';
import Button from '@material-ui/core/Button';
import { utilities } from '../utils/utilities';

type Props = {
  onClick: () => {},
  classes: {},
  confirmingProps?: {},
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
      classes, confirmingProps, ...rest
    } = this.props;
    const buttonLabel = this.props.children[1];
    const renderButton = () => (
      <Button
        {...rest}
        color="secondary"
        onClick={this.onClick}
        {...confirmingProps}
      >
        <Warning key="btnConfirm" className={classNames(classes.leftIcon, classes.iconSmall)} />
        {buttonLabel ? 'Confirm' : ''}
      </Button>
    );
    return renderButton();
  }

  render() {
    const {
      onClick: origOnClick, classes, confirmingProps, ...restProps
    } = this.props;
    const { isConfirming } = this.state;
    return (isConfirming ?
      this.renderConfirmButton() :
      <Button {...restProps} onClick={this.onClick} onKeyPress={this.onClick}>
        {this.props.children}
      </Button>
    );
  }
}

ConfirmButton.defaultProps = {
  confirmingProps: {}
};
