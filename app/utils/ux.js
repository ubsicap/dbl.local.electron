import React from 'react';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import Grain from '@material-ui/icons/Grain';

export const ux = {
  getMediumIcon,
  getFormattedRevision
};
export default ux;

function getMatchingParentEntryRevision(bundle) {
  const { parent } = bundle;
  if (!parent || !parent.revision) {
    return null;
  }
  const { revision: parentRevision = null } = parent || {};
  if (parentRevision && parent.dblId === bundle.dblId) {
    return parentRevision;
  }
  return null;
}

function getFormattedRevision(bundle, insertStr) {
  const { revision } = bundle;
  const parentRevision = getMatchingParentEntryRevision(bundle);
  if (parentRevision) {
    return `> ${insertStr}${parentRevision}`;
  } else if (revision === '0') {
    return `${insertStr}1 (New)`;
  }
  return `${insertStr}${revision}`;
}

export function getMediumIcon(medium, props = { style: { marginRight: '10px' } }) {
  return (medium === 'text' && <Book {...props} />)
  || (medium === 'audio' && <Headset {...props} />)
  || (medium === 'video' && <Videocam {...props} />)
  || (medium === 'print' && <Print {...props} />)
  || (medium === 'braille' && <Grain {...props} />)
  || (null);
}
