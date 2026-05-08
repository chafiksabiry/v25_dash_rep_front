import React, { useState, useEffect } from 'react';
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

  // Phase pagination state
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  // Group script by phase
  const activeScript = scripts?.[0];
  const scriptByPhase = activeScript?.script?.reduce((acc: any, item: any) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const phases = Object.keys(scriptByPhase);
  const activePhase = phases[activePhaseIndex];
  const replicas = activePhase ? scriptByPhase[activePhase] : [];

  // Reset active phase when script changes
  useEffect(() => {
    setActivePhaseIndex(0);
  }, [scripts]);

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
          
          {/* Top Half: Script with pagination */}
          <div className="w-full h-1/2 bg-slate-900 border-b border-white/10 flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="flex flex-col h-full space-y-4">
              
              {/* Script Section Header with Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white">SCRIPT DE VENTE</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {gig?.title || 'GUIDE DE CONVERSATION'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {scriptLoading && (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  )}

                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-3.5 py-1.5 bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-300 hover:text-white transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/5 hover:scale-105"
                    title="Fermer l'espace scindé"
                  >
                    <X className="w-3.5 h-3.5" />
                    Fermer
                  </button>
                </div>
              </div>

              {/* Horizontal Phase Pagination Steps */}
              {phases.length > 1 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-slate-950 rounded-2xl border border-white/5 shrink-0">
                  {phases.map((phaseName, idx) => (
                    <button
                      key={phaseName}
                      onClick={() => setActivePhaseIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex flex-col items-center gap-0.5 text-center min-w-0 ${
                        activePhaseIndex === idx 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="opacity-65 text-[7px] font-extrabold shrink-0">ÉTAPE {idx + 1}</span>
                      <span className="truncate w-full font-black">{phaseName}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Scrollable Active Phase Replicas list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {scripts.length > 0 ? (
                  replicas.length > 0 ? (
                    replicas.map((item: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`group/replica relative flex gap-3 p-4 rounded-2xl border transition-all duration-300 ${
                          item.actor === 'agent' 
                            ? 'bg-indigo-500/10 border-indigo-500/20 ml-6' 
                            : 'bg-emerald-500/10 border-emerald-500/20 mr-6'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg h-fit shrink-0 ${
                          item.actor === 'agent' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.actor === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                              item.actor === 'agent' ? 'text-indigo-400' : 'text-emerald-400'
                            }`}>
                              {item.actor === 'agent' ? 'CONSEILLER (VOUS)' : 'PROSPECT'}
                            </span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(item.replica)}
                              className="opacity-0 group-hover/replica:opacity-100 transition-opacity p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white shrink-0"
                              title="Copier la réplique"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className={`text-xs leading-relaxed font-bold ${
                            item.actor === 'agent' ? 'text-indigo-100' : 'text-emerald-100'
                          }`}>
                            {item.replica}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-slate-950/20 rounded-2xl border border-dashed border-white/5">
                      <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune réplique disponible pour cette étape</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 bg-slate-950/20 rounded-2xl border border-dashed border-white/5">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun script disponible pour cette mission</p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">Veuillez configurer un script dans la base de connaissances</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Half: CRM Iframe Workspace */}
          <div className="w-full h-1/2 bg-slate-900 flex flex-col overflow-hidden">
            
            {/* CRM Header */}
            <div className="p-4 md:p-6 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <Globe className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white">Espace de Travail Externe</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OGGODATA, ZOHO & Outils Intégrés</p>
                  </div>
                </div>

                {/* Fast Copy Actions Bar */}
                {activeContact && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5 flex items-center gap-3">
                    <span className="text-[9px] font-black text-white uppercase tracking-tight truncate max-w-[150px]">
                      Client: {activeContact.First_Name} {activeContact.Last_Name || ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(`${activeContact.First_Name} ${activeContact.Last_Name || ''}`.trim(), 'name')}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1"
                      >
                        {copiedField === 'name' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        Nom
                      </button>
                      {activeContact.Telephony && (
                        <button
                          onClick={() => handleCopy(activeContact.Telephony, 'phone')}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1"
                        >
                          {copiedField === 'phone' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          Tél
                        </button>
                      )}
                    </div>
                  </div>
                )}
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

            {/* Frame Content Area */}
            <div className="flex-1 bg-slate-950 relative flex flex-col min-h-0">
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
