import React, { PureComponent } from 'react';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import Grain from '@material-ui/icons/Grain';

type Props = {
  medium: string,
  iconProps?: {}
};

export default class MediumIcon extends PureComponent<Props> {
  props: Props;
  render() {
    const { medium, iconProps } = this.props;
    return (medium === 'text' && <Book {...iconProps} />)
    || (medium === 'audio' && <Headset {...iconProps} />)
    || (medium === 'video' && <Videocam {...iconProps} />)
    || (medium === 'print' && <Print {...iconProps} />)
    || (medium === 'braille' && <Grain {...iconProps} />)
    || (null);
  }
}

MediumIcon.defaultProps = {
  iconProps: { style: { marginRight: '10px' } }
};
