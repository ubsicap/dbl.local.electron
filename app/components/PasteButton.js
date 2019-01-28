import React, { Component } from 'react';
import classNames from 'classnames';
import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import ConfirmButton from '../components/ConfirmButton';

type Props = {
  onClick: () => {},
  classes: {},
  itemsToPaste: [],
  itemsType: string
};

export default class PasteButton extends Component<Props> {
  props: Props;

  render() {
    const {
      classes, itemsToPaste, itemsType, ...restProps
    } = this.props;
    return (
      <ConfirmButton
        classes={classes}
        {...restProps}
      >
        <AssignmentTurnedInIcon className={classNames(classes.leftIcon)} />
        Paste {itemsToPaste.length ? `(${itemsToPaste.length}) ` : ''} {itemsType}
      </ConfirmButton>
    );
  }
}
