import React from 'react';
import { Navigate } from 'react-router-dom';

interface Phase {
  status: string;
  completedAt?: string;
  requiredActions?: any[];
  optionalActions?: any[];
}

interface Phases {
  phase1: Phase;
  phase2: Phase;
  phase3: Phase;
  phase4: Phase;
  phase5: Phase;
}

interface ProtectedRouteProps {
  phases: Phases | undefined;
  children: React.ReactNode;
  requiredPhase?: number;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  phases, 
  children, 
  requiredPhase = 5 
}) => {
  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (!phases) return false;
    return phases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
  };

  console.log('🛡️ Protected Route Check:', {
    phases,
    requiredPhase,
    isAllowed: isPhaseCompleted(requiredPhase),
    redirectingTo: !isPhaseCompleted(requiredPhase) ? '/profile' : null
  });

  if (!isPhaseCompleted(requiredPhase)) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}; 