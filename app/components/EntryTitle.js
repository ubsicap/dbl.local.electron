import React, { PureComponent } from 'react';
import rowStyles from './DBLEntryRow.css';
import MediumIcon from './MediumIcon';

type Props = {
  bundle: {}
};

export default class EntryTitle extends PureComponent<Props> {
  props: Props;

  render() {
    const { bundle = {} } = this.props;
    const { displayAs = {}, medium } = bundle;
    const { languageAndCountry, name } = displayAs;
    return (
      <React.Fragment>
        <MediumIcon medium={medium} />
        <span className={rowStyles.languageAndCountryLabel}>
          {languageAndCountry}{' '}
        </span>
        {name}
      </React.Fragment>
    );
  }
}
