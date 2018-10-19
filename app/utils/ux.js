import React from 'react';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import Grain from '@material-ui/icons/Grain';

export const ux = {
  getMediumIcon
};
export default ux;

export function getMediumIcon(medium) {
  const style = { style: { marginRight: '10px' } };
  return (medium === 'text' && <Book {...style} />)
  || (medium === 'audio' && <Headset {...style} />)
  || (medium === 'video' && <Videocam {...style} />)
  || (medium === 'print' && <Print {...style} />)
  || (medium === 'braille' && <Grain {...style} />)
  || (null);
}
