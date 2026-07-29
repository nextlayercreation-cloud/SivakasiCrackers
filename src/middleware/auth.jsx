import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Route guard middleware.
 * Admin and user are fully separate auth domains: an unauthenticated
 * admin route attempt redirects to /admin-login, never to the
 * customer /login page, and vice versa.
 */
export const ProtectedRoute = ({ children, user, requiredRole }) => {
  if (requiredRole === 'admin') {
    if (!user || user.role !== 'admin') return <Navigate to="/admin-login" replace />;
    return children;
  }
  if (!user || user.role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
};
