import React, { useState } from 'react';
import SmartWarningSystem from './SmartWarningSystem';
import { useLead } from '../../hooks/useLead';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const DashboardGrid: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');
  const { lead: apiLead } = useLead(leadId);
  const gig = apiLead?.gigId;
  
  const [isScriptVisible, setIsScriptVisible] = useState(true);

  const sections = gig?.description ? [
    {
      id: 'main-script',
      title: 'Project Overview & Talk Track',
      content: gig.description,
      type: 'main' as const,
      isActive: true
    }
  ] : [];

  return (
    <div className="w-full pb-4 space-y-4">
      {/* AI Overlays */}
      <SmartWarningSystem />

      {/* Gig Script Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-500">
        <button 
          onClick={() => setIsScriptVisible(!isScriptVisible)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex flex-col items-start">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Gig Script</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {gig?.title || 'Standard Talk Track'}
              </p>
            </div>
          </div>
          {isScriptVisible ? (
            <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          )}
        </button>

        {isScriptVisible && (
          <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {sections.length > 0 ? (
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                  {gig?.description}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No script available for this gig</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardGrid;
