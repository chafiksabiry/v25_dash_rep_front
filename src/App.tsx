import React, { useEffect, useState } from 'react';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { GigsMarketplace } from './pages/GigsMarketplace';
import { Profile } from './pages/Profile';
import { Payouts } from './pages/Payouts';
import { Learning } from './pages/Learning';
import { Operations } from './pages/Operations';
import { Workspace } from './pages/Workspace';
import { Community } from './pages/Community';
import { WalletPage } from './pages/Wallet';
import CallReportCard from './components/CallReport';
import { fetchProfileFromAPI, isProfileDataValid } from './utils/profileUtils';
import { ProtectedRoute } from './components/ProtectedRoute';

interface UserProfile {
  onboardingProgress: {
    currentPhase: number;
    phases: {
      phase1: {
        status: string;
        completedAt?: string;
        requiredActions: any[];
        optionalActions: any[];
      };
      phase2: {
        status: string;
        completedAt?: string;
        requiredActions: any[];
        optionalActions: any[];
      };
      phase3: {
        status: string;
        completedAt?: string;
        requiredActions: any[];
        optionalActions: any[];
      };
      phase4: {
        status: string;
        completedAt?: string;
        requiredActions: any[];
        optionalActions: any[];
      };
      phase5: {
        status: string;
        completedAt?: string;
        requiredActions: any[];
        optionalActions: any[];
      };
    };
  };
  // Add other profile fields as needed
}

function App() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    console.log('🚀 App component mounted - initializing application');
    
    // Log routing information
    console.log('📍 ROUTE INFO:', {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      isQiankun: qiankunWindow.__POWERED_BY_QIANKUN__,
      basename: qiankunWindow.__POWERED_BY_QIANKUN__ ? '/repdashboard' : '/',
      effectivePath: qiankunWindow.__POWERED_BY_QIANKUN__ 
        ? window.location.pathname.replace('/repdashboard', '') 
        : window.location.pathname
    });
    
    const initializeProfileData = async () => {
      console.log('🔄 Starting profile data initialization');
      try {
        // Check if profile data is valid and not expired now
        console.log('🔍 Checking profile data validity');
        const isValid = false; //isProfileDataValid();
        
        if (!isValid) {
          console.log('🌐 Profile data invalid or expired, fetching from API');
          // Fetch fresh data if needed
          const profileData = await fetchProfileFromAPI();
          setUserProfile(profileData);
          
          // Log detailed onboarding progress
          console.log('👤 User Onboarding Status:', {
            currentPhase: profileData.onboardingProgress.currentPhase,
            phaseDetails: {
              phase1: {
                status: profileData.onboardingProgress.phases.phase1.status,
                completedAt: profileData.onboardingProgress.phases.phase1.completedAt,
                requiredActions: profileData.onboardingProgress.phases.phase1.requiredActions,
                optionalActions: profileData.onboardingProgress.phases.phase1.optionalActions
              },
              phase2: {
                status: profileData.onboardingProgress.phases.phase2.status,
                requiredActions: profileData.onboardingProgress.phases.phase2.requiredActions,
                optionalActions: profileData.onboardingProgress.phases.phase2.optionalActions
              },
              phase3: {
                status: profileData.onboardingProgress.phases.phase3.status,
                requiredActions: profileData.onboardingProgress.phases.phase3.requiredActions,
                optionalActions: profileData.onboardingProgress.phases.phase3.optionalActions
              }
            },
            lastUpdated: profileData.onboardingProgress.lastUpdated
          });
          
          console.log('✅ Fresh profile data loaded successfully');
        } else {
          console.log('✅ Using existing profile data from cache');
        }
        
        setLoading(false);
        console.log('✅ Application initialization complete');
      } catch (err) {
        console.error('❌ Error initializing profile data:', err);
        setLoading(false);
        console.log('⚠️ Application continuing with initialization errors');
      }
    };

    initializeProfileData();
    
    // Set up routing change listener
    const handleRouteChange = () => {
      console.log('📍 ROUTE CHANGED:', {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        // Check if running inside Qiankun micro-frontend framework
        isQiankun: !!qiankunWindow.__POWERED_BY_QIANKUN__,
        basename: !!qiankunWindow.__POWERED_BY_QIANKUN__ ? '/repdashboard' : '/',
        effectivePath: !!qiankunWindow.__POWERED_BY_QIANKUN__ 
          ? window.location.pathname.replace('/repdashboard', '') 
          : window.location.pathname
      });
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  if (loading) {
    console.log('⏳ App is in loading state, showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  console.log('🖥️ Rendering main application interface');
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  const basename = isStandaloneMode ? '/' : '/repdashboard';
  return (
    <Router basename={basename}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar phases={userProfile?.onboardingProgress?.phases} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/gigs-marketplace" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <GigsMarketplace />
                </ProtectedRoute>
              } />
              <Route path="/payouts" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Payouts />
                </ProtectedRoute>
              } />
              <Route path="/learning" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Learning />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={<Profile />} />
              <Route path="/operations" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Operations />
                </ProtectedRoute>
              } />
              <Route path="/workspace" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                  <Workspace />
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <Community />
                </ProtectedRoute>
              } />
              <Route path="/call-report" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <CallReportCard />
                </ProtectedRoute>
              } />
              <Route path="/wallet" element={
                <ProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                  <WalletPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/profile" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;