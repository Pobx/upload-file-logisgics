import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { LoginPage, UserManagementPage } from '../features/identity';
import { CustomerManagementPage } from '../features/partners';
import { CSVImportPage } from '../features/document-ingest';
import { ShipmentsPage } from '../features/shipments';
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
          <Route path="/" element={<ShipmentsPage />} />
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
