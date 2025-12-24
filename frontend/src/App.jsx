import React, { useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recovery from './pages/Recovery';

import { AuthProvider, AuthContext } from './contexts/AuthContext'; 

const ProtectedRoute = ({ children }) => {
  const { encKey } = useContext(AuthContext);

  if (!encKey) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          
          {/* Dashboard ROute */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/*  Dashboard ROute  */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Public Route */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path='/recovery' element={<Recovery/>} />
          
          {/*Fallback Route*/}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App;