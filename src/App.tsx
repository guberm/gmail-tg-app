import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import EmailDetails from './pages/EmailDetails';
import Compose from './pages/Compose';

const PrivateRoute = ({ children }: { children: React.JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/email/:id" 
        element={
          <PrivateRoute>
            <EmailDetails />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/compose" 
        element={
          <PrivateRoute>
            <Compose />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
