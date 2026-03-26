import fs from 'fs';

const files = [
  'd:/HARX2026/microfrontends/v25_dash_rep_front/src/copilot/components/Dashboard/TopStatusBar.tsx',
  'd:/HARX2026/microfrontends/v25_dash_rep_front/src/copilot/components/Dashboard/DashboardGrid.tsx',
  'd:/HARX2026/microfrontends/v25_dash_rep_front/src/copilot/App.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
      console.log('File missing: ', file);
      return;
  }
  let content = fs.readFileSync(file, 'utf8');

  // Replace dark mode background tokens
  content = content.replace(/bg-\[#232f47\]/g, 'bg-white border border-gray-100');
  content = content.replace(/bg-\[#1b253a\]/g, 'bg-gray-50 border border-gray-100');
  content = content.replace(/bg-\[#26314a\]/g, 'bg-gray-50 border border-gray-100');
  content = content.replace(/bg-\[#3a4661\]/g, 'bg-gray-200');
  content = content.replace(/bg-\[#22304a\]/g, 'bg-gray-100 border border-gray-200');
  content = content.replace(/bg-mesh-gradient/g, 'bg-transparent');

  // Text colors
  content = content.replace(/text-white/g, 'text-gray-900');
  content = content.replace(/text-slate-200/g, 'text-gray-700');
  content = content.replace(/text-slate-300/g, 'text-gray-600');
  content = content.replace(/text-slate-400/g, 'text-gray-500');
  content = content.replace(/text-slate-500/g, 'text-gray-400');

  // Specific buttons / items
  content = content.replace(/bg-slate-700/g, 'bg-gray-100');
  content = content.replace(/border-slate-700\/50/g, 'border-gray-100');
  
  // Specific glass-card styling for live widgets
  content = content.replace(/bg-slate-900\/40/g, 'bg-white/60 text-gray-900 border border-gray-200');
  content = content.replace(/bg-slate-900\/90 text-blue-400 border border-blue-500\/20/g, 'bg-white/95 border border-harx-200 text-harx-600 shadow-sm');
  content = content.replace(/bg-slate-900\/90 text-harx-400 border border-harx-500\/20/g, 'bg-white/95 border border-harx-200 text-harx-600 shadow-sm');
  
  content = content.replace(/bg-slate-900\/90 text-[^\s]+ text-\[10px\]/g, 'bg-white border border-gray-200 text-gray-600 text-[10px] shadow-sm');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Replaced styles successfully');
