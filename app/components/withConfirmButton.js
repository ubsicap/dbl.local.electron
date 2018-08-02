
import React, { Component } from 'react';
import classNames from 'classnames';
import Warning from '@material-ui/icons/Warning';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { utilities } from '../utils/utilities';

type Props = {
  color: string,
  disabled?: ?boolean,
  className: string,
  classes: {},
  onClick: () => {},
  children: React.Node
};

const materialStyles = theme => ({
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
});

export default function withConfirmButton(WrappedButton) {
  const confirmBtn = class ConfirmButton extends Component<Props> {
    props: Props;
    state = {
      isConfirming: false
    };

    onClick = (event) => {
      const { disabled } = this.props;
      if (disabled) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      const { isConfirming } = this.state;
      if (isConfirming) {
        const { onClick: origOnClick } = this.props;
        origOnClick(event);
        this.setState({ isConfirming: false });
        return;
      }
      this.setState({ isConfirming: true });
      utilities.sleep(3000);
      this.setState({ isConfirming: false });
    }

    renderConfirmButton = () => {
      const {
        classes, onClick: origOnClick,
        color: origColor,
        ...restProps
      } = this.props;
      return (
        <Button
          {...restProps}
          color="secondary"
          onClick={this.onClick}
        >
          <Warning key="btnConfirm" className={classNames(classes.leftIcon, classes.iconSmall)} />
          {this.renderDeleteIconAndText()}
        </Button>
      );
    }

    render() {
      const { isConfirming } = this.state;
      const { onClick: origOnClick, ...restProps } = this.props;
      return (isConfirming ?
        this.renderConfirmButton() :
        <WrappedButton {...restProps} onClick={this.onClick} />
      );
    }
  };
  confirmBtn.defaultProps = {
    disabled: false
  };
  return withStyles(materialStyles, { name: 'ConfirmButton' })(confirmBtn);
}
