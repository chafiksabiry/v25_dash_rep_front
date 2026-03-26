import React from 'react';
import SmartWarningSystem from './SmartWarningSystem';

const DashboardGrid: React.FC = () => {
  return (
    <div className="w-full pb-4">
      {/* AI Overlays */}
      <SmartWarningSystem />
    </div>
  );
};

export default DashboardGrid;
