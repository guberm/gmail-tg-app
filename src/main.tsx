import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// Replace with your actual Google OAuth Client ID
// Instructions: 
// 1. Go to Google Cloud Console
// 2. Create credentials -> OAuth client ID
// 3. Application type: Web application
// 4. Authorized JavaScript origins: http://localhost:5173
// 5. Authorized redirect URIs: http://localhost:5173
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
