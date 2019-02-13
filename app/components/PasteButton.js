import React, { PureComponent } from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import classNames from 'classnames';
import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import ConfirmButton from '../components/ConfirmButton';
import { ux } from '../utils/ux';

type Props = {
  onClick: () => {},
  classes: {},
  selectedItemsToPaste: {}
};

export default class PasteButton extends PureComponent<Props> {
  props: Props;

  render() {
    const {
      classes, selectedItemsToPaste, ...restProps
    } = this.props;
    const { items: itemsToPaste, itemsType } = selectedItemsToPaste || {};
    const clipboardTooltip = ux.getClipboardTooltip(selectedItemsToPaste);
    return (
      <Tooltip title={clipboardTooltip}>
        <ConfirmButton
          classes={classes}
          {...restProps}
        >
          <AssignmentTurnedInIcon className={classNames(classes.leftIcon)} />
          Paste {itemsToPaste.length ? `(${itemsToPaste.length}) ` : ''} {itemsType}
        </ConfirmButton>
      </Tooltip>
    );
  }
}
