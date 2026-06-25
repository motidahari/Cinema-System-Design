import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './core/config/i18n';
import './styles/global.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
