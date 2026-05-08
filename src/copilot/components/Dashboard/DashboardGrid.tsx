import React from 'react';
import SmartWarningSystem from './SmartWarningSystem';
import RealTimeCoaching from './RealTimeCoaching';

const DashboardGrid: React.FC = () => {
  return (
    <div className="w-full pb-4 space-y-6">
      {/* AI Overlays & Real-time Analysis */}
      <div className="space-y-6">
        <RealTimeCoaching />
        <SmartWarningSystem />
      </div>
    </div>
  );
};

export default DashboardGrid;
