import "regenerator-runtime/runtime";
import * as React from 'react';
import { Home } from './components/Home';

export default class App extends React.Component {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <div>
        <Home />
      </div>
    );
  }
}
