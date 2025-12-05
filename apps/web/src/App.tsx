import { Component, JSX } from 'solid-js';

interface AppProps {
  children?: JSX.Element;
}

export const App: Component<AppProps> = (props) => {
  return (
    <div class="app">
      {props.children}
    </div>
  );
};
