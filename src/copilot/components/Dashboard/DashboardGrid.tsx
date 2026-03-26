import React, { useState } from 'react';
import SmartWarningSystem from './SmartWarningSystem';
import RealTimeCoaching from './RealTimeCoaching';
import { useLead } from '../../hooks/useLead';
import { useGigScript } from '../../hooks/useGigScript';
import { ChevronDown, ChevronUp, User, Bot, Sparkles } from 'lucide-react';

const DashboardGrid: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');
  const { lead: apiLead } = useLead(leadId);
  const gig = apiLead?.gigId;
  
  // Fetch real script from the scripts collection
  const { scripts, loading: scriptLoading } = useGigScript(gig?._id);
  
  const [isScriptVisible, setIsScriptVisible] = useState(true);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0);

  const activeScript = scripts[selectedScriptIndex];

  // Group script by phase if available
  const scriptByPhase = activeScript?.script?.reduce((acc: any, item: any) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const hasScriptsInCollection = scripts.length > 0;

  return (
    <div className="w-full pb-4 space-y-6">
      {/* AI Overlays & Real-time Analysis */}
      <div className="space-y-6">
        <RealTimeCoaching />
        <SmartWarningSystem />
      </div>

      {/* Scripts Collection Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-500">
        <button 
          onClick={() => setIsScriptVisible(!isScriptVisible)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Script</h3>
                {hasScriptsInCollection && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-[8px] font-black text-indigo-600 rounded-full border border-indigo-100 uppercase tracking-widest">
                    {scripts.length} {scripts.length > 1 ? 'Scripts' : 'Script'} Found
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-gray-400 upperCase tracking-widest">
                {gig?.title || 'Real-time Talk Tracks'}
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
            {hasScriptsInCollection ? (
              <div className="space-y-6">
                {/* Script Selector Tabs if multiple scripts exist */}
                {scripts.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                    {scripts.map((s: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedScriptIndex(idx)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                          selectedScriptIndex === idx 
                            ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Profile {s.targetClient} {s.isActive ? '(Active)' : ''}
                      </button>
                    ))}
                  </div>
                )}

                {/* Script Info Bar */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                    activeScript.targetClient === 'D' ? 'bg-red-50 text-red-600 border-red-100' :
                    activeScript.targetClient === 'I' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                    activeScript.targetClient === 'S' ? 'bg-green-50 text-green-600 border-green-100' :
                    activeScript.targetClient === 'C' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    DISC: {activeScript.targetClient}
                  </div>
                  {activeScript.language && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {activeScript.language.split(',')[0]}
                    </div>
                  )}
                </div>

                {/* Script Context / Details */}
                {(activeScript.details || (activeScript.language && activeScript.language.includes(','))) && (
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
                          <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Tone & Guidelines</span>
                        </div>
                        <p className="text-xs text-blue-900/70 font-medium leading-relaxed">
                          {activeScript.language}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Phased Script Content - Scrollable Area */}
                <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pr-4 -mr-4">
                  <div className="space-y-6">
                    {Object.entries(scriptByPhase).map(([phase, replicas]) => (
                      <div key={phase} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-gray-100"></div>
                          <span className="text-[10px] font-black text-gray-410 uppercase tracking-[0.2em] px-2">{phase}</span>
                          <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div className="space-y-3">
                          {(replicas as any[]).map((item, idx) => (
                            <div 
                              key={idx} 
                              className={`group/replica relative flex gap-3 p-4 rounded-2xl border transition-all duration-300 ${
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
                                <div className="flex items-center justify-between">
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    item.actor === 'agent' ? 'text-indigo-500' : 'text-emerald-500'
                                  }`}>
                                    {item.actor === 'agent' ? 'Representative' : 'Lead'}
                                  </span>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(item.replica)}
                                    className="opacity-0 group-hover/replica:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded-md"
                                    title="Copy to clipboard"
                                  >
                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                  </button>
                                </div>
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
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No collection scripts available for this gig</p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Please check the Knowledge Base backend</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardGrid;
