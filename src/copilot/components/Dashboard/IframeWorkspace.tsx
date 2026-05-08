import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAgent } from '../../contexts/AgentContext';
import { useLead } from '../../hooks/useLead';
import { useGigScript } from '../../hooks/useGigScript';
import { 
  Globe, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  Search,
  Sparkles,
  Bot,
  User
} from 'lucide-react';

export function IframeWorkspace() {
  const { state, dispatch } = useAgent();
  const activeContact = state.callState?.contact;
  const location = useLocation();

  // Fetch script details dynamically based on URL lead and gig
  const searchParams = new URLSearchParams(location.search);
  const leadId = searchParams.get('leadId');
  const { lead: apiLead } = useLead(leadId);
  const gig = apiLead?.gigId;
  const { scripts, loading: scriptLoading } = useGigScript(gig?._id);

  const isOpen = state.isIframeOpen;
  const setIsOpen = (val: boolean) => dispatch({ type: 'TOGGLE_IFRAME', payload: val });

  const [activeTab, setActiveTab] = useState<'oggodata' | 'zoho' | 'custom'>('oggodata');
  const [customUrl, setCustomUrl] = useState('https://www.oggodata.com/');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://www.oggodata.com/');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Script visibility state
  const [showScript, setShowScript] = useState(false);

  // Phase pagination state
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  // Active replica index inside the active phase
  const [activeReplicaIndex, setActiveReplicaIndex] = useState(0);

  // Group script by phase
  const activeScript = scripts?.[0];
  const scriptByPhase = activeScript?.script?.reduce((acc: any, item: any) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const phases = Object.keys(scriptByPhase);
  const activePhase = phases[activePhaseIndex];
  const rawReplicas = activePhase ? scriptByPhase[activePhase] : [];

  // Group flat replicas of the phase into Agent-Lead pairs
  const replicas = useMemo(() => {
    const pairs: { agent?: any; lead?: any }[] = [];
    let i = 0;
    while (i < rawReplicas.length) {
      const current = rawReplicas[i];
      const isAgent = current.actor === 'agent' || current.actor?.toLowerCase() === 'agent';
      if (isAgent) {
        const next = rawReplicas[i + 1];
        const isNextLead = next && (next.actor === 'lead' || next.actor?.toLowerCase() === 'lead' || next.actor?.toLowerCase() === 'prospect');
        if (isNextLead) {
          pairs.push({ agent: current, lead: next });
          i += 2;
        } else {
          pairs.push({ agent: current });
          i += 1;
        }
      } else {
        pairs.push({ lead: current });
        i += 1;
      }
    }
    return pairs;
  }, [rawReplicas]);

  // Reset active phase and replica when script changes
  useEffect(() => {
    setActivePhaseIndex(0);
    setActiveReplicaIndex(0);
  }, [scripts]);

  // Reset replica index when phase changes
  useEffect(() => {
    setActiveReplicaIndex(0);
  }, [activePhaseIndex]);

  // Sync iframe source when active tab changes, appending gigId and leadId dynamically
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const leadId = searchParams.get('leadId') || '';
    const gigId = searchParams.get('gigId') || '';

    const appendParams = (url: string) => {
      try {
        const u = new URL(url);
        if (gigId) u.searchParams.set('gigId', gigId);
        if (leadId) u.searchParams.set('leadId', leadId);
        return u.toString();
      } catch (e) {
        const separator = url.includes('?') ? '&' : '?';
        let res = url;
        if (gigId) {
          res += `${separator}gigId=${encodeURIComponent(gigId)}`;
        }
        if (leadId) {
          res += `${res.includes('?') ? '&' : '?'}leadId=${encodeURIComponent(leadId)}`;
        }
        return res;
      }
    };

    if (activeTab === 'oggodata') {
      setCurrentIframeUrl(appendParams('https://www.oggodata.com/'));
    } else if (activeTab === 'zoho') {
      setCurrentIframeUrl(appendParams('https://crm.zoho.eu'));
    } else {
      setCurrentIframeUrl(appendParams(customUrl));
    }
  }, [activeTab, customUrl, location.search]);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = customUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    setCustomUrl(formattedUrl);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return createPortal(
    <>
      {/* Floating Button on the Center of the Right Side */}
      {!isOpen && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[160] flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-orange-400 via-rose-500 to-rose-600 hover:from-orange-500 hover:to-rose-700 text-white font-black text-[10px] tracking-widest uppercase py-4 px-2.5 rounded-l-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all duration-300 transform hover:-translate-x-1.5 flex flex-col items-center gap-2 border-y border-l border-white/20 select-none writing-mode-vertical"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
            title="Ouvrir l'Espace OGGODATA / ZOHO"
          >
            <Globe className="w-4 h-4 animate-spin-slow rotate-90" />
            <span className="mt-1 font-extrabold">EXTERNES</span>
          </button>
        </div>
      )}

      {/* Backdrop overlay for the left 30% of screen */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9998] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side drawer modal taking exactly 70% width on the right */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-[70vw] min-w-[320px] bg-slate-950 z-[9999] flex flex-col overflow-hidden border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-500">
          
          {/* CRM Header & Toolbar at the very top of the drawer */}
          <div className="p-4 md:p-6 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Globe className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white">Espace de Travail Externe</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OGGODATA, ZOHO & Outils Intégrés</p>
                </div>
              </div>

              {/* Fast Copy Actions Bar & Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {activeContact && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1 flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">
                      {activeContact.First_Name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(`${activeContact.First_Name} ${activeContact.Last_Name || ''}`.trim(), 'name')}
                        className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-0.5"
                      >
                        {copiedField === 'name' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        Nom
                      </button>
                      {activeContact.Telephony && (
                        <button
                          onClick={() => handleCopy(activeContact.Telephony, 'phone')}
                          className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-0.5"
                        >
                          {copiedField === 'phone' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          Tél
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Toggle Script Display Button */}
                <button
                  onClick={() => setShowScript(!showScript)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 border shrink-0 ${
                    showScript 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-indigo-950/40 hover:bg-indigo-900/40 border-indigo-500/30 text-indigo-300'
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${showScript ? 'animate-pulse' : ''}`} />
                  {showScript ? 'Masquer le Script' : 'Afficher le Script'}
                </button>

                {/* Close Drawer Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-300 hover:text-white transition-all flex items-center gap-1 shadow-lg shadow-rose-500/5 hover:scale-105 shrink-0"
                  title="Fermer l'espace"
                >
                  <X className="w-3.5 h-3.5" />
                  Fermer
                </button>
              </div>
            </div>

            {/* Tab Navigation & URL Address Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab('oggodata')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'oggodata' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  OGGODATA
                </button>
                <button
                  onClick={() => setActiveTab('zoho')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'zoho' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  ZOHO CRM
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  URL Perso
                </button>
              </div>

              {/* Premium Browser-like Address Bar */}
              <div className="flex-1 flex items-center gap-2">
                <button 
                  onClick={handleRefresh}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/10 transition-all shrink-0"
                  title="Actualiser l'iframe"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <form onSubmit={handleCustomUrlSubmit} className="flex-1 flex items-center gap-2 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-0.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={activeTab === 'custom' ? customUrl : currentIframeUrl}
                    onChange={(e) => {
                      if (activeTab === 'custom') setCustomUrl(e.target.value);
                    }}
                    disabled={activeTab !== 'custom'}
                    className="flex-1 bg-transparent border-none text-[11px] text-slate-300 focus:outline-none focus:ring-0 select-all font-mono py-1 disabled:text-slate-500"
                    placeholder="https://example.com"
                  />
                  {activeTab === 'custom' && (
                    <button type="submit" className="p-0.5 bg-white/5 hover:bg-white/10 rounded text-slate-300">
                      <Search className="w-3 h-3" />
                    </button>
                  )}
                </form>

                <a
                  href={currentIframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg hover:shadow-lg hover:shadow-rose-500/20 transition-all flex items-center gap-1 shrink-0"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Main Workspace Body Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900">
                      {/* Top Area: Script displayed with custom toggle */}
            {showScript && (
              <div className="w-full shrink-0 bg-slate-950/60 backdrop-blur-md border-b border-white/10 flex flex-col p-4 md:p-5 overflow-hidden animate-in slide-in-from-top duration-300">
                <div className="flex flex-col gap-3.5">
                  
                  {/* Script mini-header */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">SCRIPT DE VENTE ACTIF</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[200px] md:max-w-none">• {gig?.title || 'GUIDE DE CONVERSATION'}</span>
                    </div>
                    {scriptLoading && (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>

                  {/* Horizontal Phase Pagination Steps */}
                  {phases.length > 1 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/5 shrink-0 shadow-inner">
                      {phases.map((phaseName, idx) => (
                        <button
                          key={phaseName}
                          onClick={() => setActivePhaseIndex(idx)}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex flex-col items-center gap-0.5 text-center min-w-0 ${
                            activePhaseIndex === idx 
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 scale-102 border border-white/10' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span className="opacity-65 text-[7px] font-extrabold shrink-0">ÉTAPE {idx + 1}</span>
                          <span className="truncate w-full font-black">{phaseName}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Combined Agent-Lead responsive pairs */}
                  {scripts.length > 0 ? (
                    replicas.length > 0 ? (
                      (() => {
                        const currentPair = replicas[activeReplicaIndex];
                        if (!currentPair) return null;
                        return (
                          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                            
                            {/* Combined Stacked/Side-by-side Cards */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {/* Agent Replica Card */}
                              {currentPair.agent ? (
                                <div className="relative overflow-hidden rounded-2xl border p-4 md:p-5 pl-6 md:pl-7 flex flex-col gap-3 group transition-all duration-300 bg-gradient-to-br from-indigo-950/15 via-slate-900/90 to-slate-950/90 border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                                  {/* Glowing left accent bar */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
                                  
                                  <div className="flex gap-4 items-start">
                                    <div className="p-2.5 rounded-xl h-fit shrink-0 transition-transform duration-300 group-hover:scale-110 bg-indigo-500/20 text-indigo-300">
                                      <Bot className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                          CONSEILLER (VOUS)
                                        </span>
                                        <button
                                          onClick={() => handleCopy(currentPair.agent.replica, 'agent_replica')}
                                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-1 shrink-0"
                                          title="Copier la réplique du conseiller"
                                        >
                                          {copiedField === 'agent_replica' ? (
                                            <span className="text-emerald-400">Copié</span>
                                          ) : (
                                            <span>Copier</span>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs md:text-sm leading-relaxed font-bold text-indigo-100 group-hover:text-white">
                                        {currentPair.agent.replica}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="hidden xl:flex items-center justify-center p-6 bg-slate-900/20 border border-dashed border-white/5 rounded-2xl">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pas de réplique conseiller</p>
                                </div>
                              )}

                              {/* Lead Replica Card */}
                              {currentPair.lead ? (
                                <div className="relative overflow-hidden rounded-2xl border p-4 md:p-5 pl-6 md:pl-7 flex flex-col gap-3 group transition-all duration-300 bg-gradient-to-br from-emerald-950/15 via-slate-900/90 to-slate-950/90 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                                  {/* Glowing left accent bar */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600" />
                                  
                                  <div className="flex gap-4 items-start">
                                    <div className="p-2.5 rounded-xl h-fit shrink-0 transition-transform duration-300 group-hover:scale-110 bg-emerald-500/20 text-emerald-300">
                                      <User className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                          PROSPECT (RÉPONSE ATTENDUE)
                                        </span>
                                        <button
                                          onClick={() => handleCopy(currentPair.lead.replica, 'lead_replica')}
                                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-1 shrink-0"
                                          title="Copier la réplique attendue"
                                        >
                                          {copiedField === 'lead_replica' ? (
                                            <span className="text-emerald-400">Copié</span>
                                          ) : (
                                            <span>Copier</span>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs md:text-sm leading-relaxed font-bold text-emerald-100 group-hover:text-white">
                                        {currentPair.lead.replica}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="hidden xl:flex items-center justify-center p-6 bg-slate-900/20 border border-dashed border-white/5 rounded-2xl">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pas de réplique prospect</p>
                                </div>
                              )}
                            </div>

                            {/* Consolidated Pager & Navigation controls below the cards */}
                            <div className="p-3 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={activeReplicaIndex === 0}
                                  onClick={() => setActiveReplicaIndex(prev => Math.max(0, prev - 1))}
                                  className="px-4 py-2 bg-slate-900/80 hover:bg-slate-850 disabled:opacity-20 disabled:pointer-events-none border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 hover:scale-103 active:scale-97 shadow-sm shadow-black/20"
                                >
                                  ← Précédent
                                </button>
                                
                                <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase px-2">
                                  CONVERSATION ÉTAPE ${activeReplicaIndex + 1} / ${replicas.length}
                                </span>

                                <button
                                  disabled={activeReplicaIndex === replicas.length - 1}
                                  onClick={() => setActiveReplicaIndex(prev => Math.min(replicas.length - 1, prev + 1))}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-20 disabled:pointer-events-none text-white border border-indigo-400/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 hover:scale-103 active:scale-97 shadow-lg shadow-purple-500/15"
                                >
                                  Suivant →
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 bg-slate-900 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
                        <Sparkles className="w-6 h-6 text-slate-600 mb-2 opacity-50" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune réplique disponible pour cette étape</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 bg-slate-900 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
                      <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun script disponible</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Area: CRM Iframe Workspace */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950 relative">
              {/* Security Banner */}
              <div className="bg-slate-900/60 border-b border-white/5 px-4 py-1.5 flex items-center gap-2 text-[9px] text-amber-500 font-semibold uppercase tracking-tight select-none shrink-0">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span className="truncate">Note : Zoho ou certaines extensions peuvent bloquer l'intégration iframe directe.</span>
              </div>

              <div className="flex-1 relative bg-white min-h-0">
                <iframe
                  key={iframeKey}
                  src={currentIframeUrl}
                  className="w-full h-full border-none"
                  title="External Workspace View"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  loading="lazy"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default IframeWorkspace;
