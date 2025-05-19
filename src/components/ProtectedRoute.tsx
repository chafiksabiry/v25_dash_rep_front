import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  currentStatus: number;
  children: React.ReactNode;
  minStatus?: number;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  currentStatus, 
  children, 
  minStatus = 5 
}) => {
  console.log('🛡️ Protected Route Check:', {
    currentStatus,
    requiredStatus: minStatus,
    isAllowed: currentStatus >= minStatus,
    redirectingTo: currentStatus < minStatus ? '/profile' : null
  });

  if (currentStatus < minStatus) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}; 