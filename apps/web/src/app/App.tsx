import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { UserManagementPage } from '../features/user/UserManagementPage';
import { CustomerManagementPage } from '../features/customer/CustomerManagementPage';
import { CSVImportPage } from '../features/import/CSVImportPage';
import { SearchPage } from '../features/search/SearchPage';
import { LoginPage } from '../features/auth/LoginPage';
import { getAuthToken } from '../lib/api-client';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (!token && window.location.pathname !== '/login') {
    return <Navigate to="/login?reason=session_expired" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Application Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<SearchPage />} />
          <Route path="/import" element={<CSVImportPage />} />
          <Route path="/customers" element={<CustomerManagementPage />} />
          <Route path="/users" element={<UserManagementPage />} />
        </Route>

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
