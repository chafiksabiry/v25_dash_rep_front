import React, { useState } from 'react';
import SmartWarningSystem from './SmartWarningSystem';
import { useLead } from '../../hooks/useLead';
import { useGigScript } from '../../hooks/useGigScript';
import { FileText, ChevronDown, ChevronUp, User, Bot, Sparkles } from 'lucide-react';

const DashboardGrid: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');
  const { lead: apiLead } = useLead(leadId);
  const gig = apiLead?.gigId;
  
  // Fetch real script from the scripts collection
  const { activeScript, loading: scriptLoading } = useGigScript(gig?._id);
  
  const [isScriptVisible, setIsScriptVisible] = useState(true);

  // Group script by phase if available
  const scriptByPhase = activeScript?.script?.reduce((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, typeof activeScript.script>) || {};

  const hasStructuredScript = activeScript && activeScript.script && activeScript.script.length > 0;

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
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Gig Script</h3>
                {hasStructuredScript && (
                  <>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-[8px] font-black text-emerald-600 rounded-full border border-emerald-100 uppercase tracking-widest">
                      <Sparkles className="w-2 h-2" /> AI Optimized
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[8px] font-black rounded-full border uppercase tracking-widest ${
                      activeScript.targetClient === 'D' ? 'bg-red-50 text-red-600 border-red-100' :
                      activeScript.targetClient === 'I' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                      activeScript.targetClient === 'S' ? 'bg-green-50 text-green-600 border-green-100' :
                      activeScript.targetClient === 'C' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      Profile {activeScript.targetClient}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] font-bold text-gray-400 upperCase tracking-widest">
                {gig?.title || 'Standard Talk Track'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {scriptLoading && (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            {isScriptVisible ? (
              <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            )}
          </div>
        </button>

        {isScriptVisible && (
          <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {hasStructuredScript ? (
              <div className="space-y-6">
                {/* Script Context / Details */}
                {(activeScript.details || activeScript.language) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {activeScript.details && (
                      <div className="bg-amber-50/30 border border-amber-100/50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Generation Context</span>
                        </div>
                        <p className="text-xs text-amber-900/70 font-medium italic leading-relaxed line-clamp-4">
                          {activeScript.details}
                        </p>
                      </div>
                    )}
                    {activeScript.language && (
                      <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Language & Tone</span>
                        </div>
                        <p className="text-xs text-blue-900/70 font-medium leading-relaxed">
                          {activeScript.language}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Phased Script Content */}
                {Object.entries(scriptByPhase).map(([phase, replicas]) => (
                  <div key={phase} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100"></div>
                      <span className="text-[10px] font-black text-gray-410 uppercase tracking-[0.2em] px-2">{phase}</span>
                      <div className="h-px flex-1 bg-gray-100"></div>
                    </div>
                    <div className="space-y-3">
                      {replicas.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex gap-3 p-4 rounded-2xl border transition-all duration-300 ${
                            item.actor === 'agent' 
                              ? 'bg-indigo-50/40 border-indigo-100/60 ml-4' 
                              : 'bg-emerald-50/40 border-emerald-100/60 mr-4'
                          }`}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-lg h-fit ${
                            item.actor === 'agent' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {item.actor === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div className="space-y-1 flex-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              item.actor === 'agent' ? 'text-indigo-500' : 'text-emerald-500'
                            }`}>
                              {item.actor === 'agent' ? 'Representative' : 'Lead'}
                            </span>
                            <p className={`text-sm leading-relaxed font-bold ${
                              item.actor === 'agent' ? 'text-indigo-900' : 'text-emerald-900'
                            }`}>
                              {item.replica}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : gig?.description ? (
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                <div className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                  {gig.description}
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
