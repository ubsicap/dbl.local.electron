import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { connect } from 'react-redux';
import Highlighter from 'react-highlight-words';
import styles from './PureHighlighter.css';
import { utilities } from '../utils/utilities';

type Props = {
  textToHighlight: string,
  matches: []
};

class PureHighlighter extends Component<Props> {
  props: Props;

  shouldComponentUpdate(nextProps, nextState) {
    const arePropsOrStateDifferent = shallowCompare(this, nextProps, nextState);
    const shouldUpdate = arePropsOrStateDifferent &&
        (this.props.textToHighlight !== nextProps.textToHighlight ||
        !utilities.areEqualArraysDeep(this.props.matches, nextProps.matches));
    return shouldUpdate;
  }

  emptyArray = [];

  updateMatches = () => this.props.matches;

  render() {
    const { textToHighlight } = this.props;
    return (
      <Highlighter
        textToHighlight={textToHighlight}
        searchWords={this.emptyArray}
        highlightClassName={styles.Highlight}
        findChunks={this.updateMatches}
      />
    );
  }
}

export default connect()(PureHighlighter);
