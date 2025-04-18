import React, { useEffect, useState } from 'react';
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

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 App component mounted - initializing application');
    
    const initializeProfileData = async () => {
      console.log('🔄 Starting profile data initialization');
      try {
        // Check if profile data is valid and not expired
        console.log('🔍 Checking profile data validity');
        const isValid = isProfileDataValid();
        
        if (!isValid) {
          console.log('🌐 Profile data invalid or expired, fetching from API');
          // Fetch fresh data if needed
          await fetchProfileFromAPI();
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
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <Routes>
              <Route path="/repdashboard" element={<Dashboard/>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/gigs-marketplace" element={<GigsMarketplace />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/community" element={<Community />} />
              <Route path="/call-report" element={<CallReportCard />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;