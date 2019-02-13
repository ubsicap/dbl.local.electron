import React from 'react';
import Badge from '@material-ui/core/Badge';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import { bundleService } from '../services/bundle.service';

export const ux = {
  getFormattedRevision,
  getDblRowStyles,
  getDblRowBackgroundColor,
  mapColumns,
  getHighlightTheme,
  conditionallyRenderBadge
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

function getDblRowStyles(theme) {
  return ({
    button: {
      margin: theme.spacing.unit,
    },
    badge: {
      marginRight: theme.spacing.unit * 2,
    },
    badgeTight: {
      marginRight: -15,
    },
    leftIcon: {
      marginRight: theme.spacing.unit,
    },
    rightIcon: {
      marginLeft: theme.spacing.unit,
    },
    iconSmall: {
      fontSize: 20,
    },
    iconSmaller: {
      fontSize: 10,
    },
    draftRevision: { backgroundColor: lighten(theme.palette.secondary.light, 0.85) },
    draftNew: { backgroundColor: lighten(theme.palette.primary.main, 0.60) },
    storedMode: { backgroundColor: 'white' },
    noneStoredMode: { backgroundColor: '#EDEDED' },
  });
}

function mapColumns(columns, getIsNumeric, getColumnLabel) {
  return Object.keys(columns)
    .map(c => ({ name: c, type: getIsNumeric(c) ? 'numeric' : 'string', label: getColumnLabel(c) }));
}

function getDblRowBackgroundColor(isForRow, classes, status, revision, parent, dblId) {
  switch (status) {
    case 'DRAFT': {
      if (isForRow) {
        return classes.storedMode;
      }
      const effectiveRevision = bundleService.getRevisionOrParentRevision(dblId, revision, parent);
      return effectiveRevision ? classes.draftRevision : classes.draftNew;
    }
    case 'NOT_STARTED': return classes.noneStoredMode;
    default:
      return classes.storedMode;
  }
}

function getHighlightTheme(theme, themeType) {
  return (themeType === 'light'
    ? {
      color: theme.palette.secondary.main,
      backgroundColor: lighten(theme.palette.secondary.light, 0.85),
    }
    : {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.secondary.dark,
    });
}

function conditionallyRenderBadge(props, content, node) {
  if (!content) {
    return node;
  }
  return <Badge key="badge" {...props} badgeContent={content}>{node}</Badge>;
}
