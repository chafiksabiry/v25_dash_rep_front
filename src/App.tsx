import React from 'react';
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

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/app8" element={<Dashboard />} />
              <Route path="/gigs-marketplace" element={<GigsMarketplace />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/learning" element={<Learning />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/community" element={<Community />} />
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