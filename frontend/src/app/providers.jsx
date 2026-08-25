import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { FrappeProvider } from 'frappe-react-sdk';
import { ThemeEngine } from '../theme/ThemeEngine';
import { BrowserRouter } from 'react-router-dom';

export function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <ThemeEngine>
        <FrappeProvider 
          url={import.meta.env.DEV ? 'http://newgoldmfg.com:8000' : ''} 
          enableSocket={true}
        >
          <BrowserRouter basename="/frontend">
            {children}
          </BrowserRouter>
        </FrappeProvider>
      </ThemeEngine>
    </Provider>
  );
}
