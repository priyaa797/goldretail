import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store/Store';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import { FrappeProvider } from 'frappe-react-sdk';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <Suspense fallback={<Spinner />}>
      <FrappeProvider 
        url={import.meta.env.VITE_FRAPPE_URL || ''} 
        enableSocket={true}
      >
        <App />
      </FrappeProvider>
    </Suspense>
  </Provider>,
)
