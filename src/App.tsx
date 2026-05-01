import { useEffect, useState } from 'react';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RepTrainingNavProvider } from './contexts/RepTrainingNavContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { GigsMarketplace } from './pages/GigsMarketplace';
import { GigDetails } from './pages/GigDetails';
import { Profile } from './pages/Profile';
import { Payouts } from './pages/Payouts';
import { Learning } from './pages/Learning';
import { Training } from './pages/Training';
import { Operations } from './pages/Operations';
import { Workspace } from './pages/Workspace';
import { Community } from './pages/Community';
import { WalletPage } from './pages/Wallet';
import { ImportLeads } from './pages/ImportLeads';
import { SessionPlanning } from './pages/SessionPlanning';
import CallReportCard from './components/CallReport';
import { fetchProfileFromAPI } from './utils/profileUtils';
import { PhaseProtectedRoute } from './components/ProtectedRoute';

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
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
  };
}

function AppContent() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    console.log('🚀 App component mounted - initializing application');

    // Log routing information for debugging in micro-frontend environments
    console.log('📍 ROUTE INFO:', {
      url: window.location.href,
      pathname: window.location.pathname,
      isQiankun: !!qiankunWindow.__POWERED_BY_QIANKUN__,
      basename: !!qiankunWindow.__POWERED_BY_QIANKUN__ ? '/repdashboard' : '/'
    });

    const initializeProfileData = async () => {
      try {
        const profileData = await fetchProfileFromAPI();
        setUserProfile(profileData);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    initializeProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-gradient flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <RepTrainingNavProvider>
      <RoutingWrapper
        userProfile={userProfile}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
    </RepTrainingNavProvider>
  );
}

function RoutingWrapper({ userProfile, isSidebarOpen, setIsSidebarOpen }: any) {
  const location = useLocation();
  const isProfileEdit = location.pathname.includes('/profile') && location.search.includes('edit=true');

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {!isProfileEdit && (
        <Sidebar
          phases={userProfile?.onboardingProgress?.phases}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isCollapsed={false}
          setIsCollapsed={() => { }}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden bg-black">
        {!isProfileEdit && (
          <TopBar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )}
        <main className={`flex-1 overflow-y-auto bg-white rounded-tl-[24px] ${location.pathname.includes('/profile') ? 'p-0' : 'px-8 py-6'}`}>
          <Routes>
            <Route path="/" element={<Dashboard userName={userProfile?.personalInfo?.name} />} />
            <Route path="/dashboard" element={<Dashboard userName={userProfile?.personalInfo?.name} />} />
            <Route path="/gigs-marketplace" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <GigsMarketplace />
              </PhaseProtectedRoute>
            } />
            <Route path="/gig/:gigId" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <GigDetails />
              </PhaseProtectedRoute>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/training" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <Training />
              </PhaseProtectedRoute>
            } />
            <Route path="/operations" element={<Operations />} />
            <Route path="/workspace" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <Workspace />
              </PhaseProtectedRoute>
            } />
            <Route path="/community" element={<Community />} />
            <Route path="/import-leads" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                <ImportLeads />
              </PhaseProtectedRoute>
            } />
            <Route path="/session-planning" element={<SessionPlanning />} />
            <Route path="/call-report" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                <CallReportCard />
              </PhaseProtectedRoute>
            } />
            <Route path="/wallet" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                <WalletPage />
              </PhaseProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  const basename = isStandaloneMode ? '/' : '/repdashboard';

  return (
    <Router basename={basename}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;