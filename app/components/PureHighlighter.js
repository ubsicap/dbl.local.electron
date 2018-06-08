import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import Highlighter from 'react-highlight-words';
import styles from './PureHighlighter.css';

type Props = {
  textToHighlight: string,
  matches: []
};

class PureHighlighter extends PureComponent<Props> {
  props: Props;

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
