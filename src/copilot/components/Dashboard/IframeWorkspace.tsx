import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAgent } from '../../contexts/AgentContext';
import TopStatusBar from './TopStatusBar';
import { ContactInfo } from './ContactInfo';
import DashboardGrid from './DashboardGrid';
import { TranscriptionProvider } from '../../contexts/TranscriptionContext';
import { TranscriptionBridge } from '../TranscriptionBridge';
import { useDestinationZone } from '../../hooks/useDestinationZone';
import { 
  Globe, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  Search,
  Sparkles
} from 'lucide-react';

export function IframeWorkspace() {
  const { state, dispatch } = useAgent();
  const activeContact = state.callState?.contact;
  const location = useLocation();
  const { zone: destinationZone } = useDestinationZone();

  const isOpen = state.isIframeOpen;
  const setIsOpen = (val: boolean) => dispatch({ type: 'TOGGLE_IFRAME', payload: val });

  const [activeTab, setActiveTab] = useState<'oggodata' | 'zoho' | 'custom'>('oggodata');
  const [customUrl, setCustomUrl] = useState('https://www.oggodata.com/');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://www.oggodata.com/');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

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

      {/* Fullscreen Overlay Split Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
          
          {/* Left Column: Copilot (Script & Conversation) */}
          <div className="w-full md:w-1/2 h-full bg-slate-900 border-r border-white/10 flex flex-col overflow-y-auto p-6 md:p-8">
            <TranscriptionProvider destinationZone={destinationZone || undefined}>
              <TranscriptionBridge />
              <div className="max-w-[800px] mx-auto w-full space-y-6">
                
                {/* Copilot Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Coach Copilot Actif</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Assistance en Temps Réel</p>
                    </div>
                  </div>
                </div>

                <TopStatusBar />
                <ContactInfo />
                <DashboardGrid />
              </div>
            </TranscriptionProvider>
          </div>

          {/* Right Column: CRM Iframe Workspace */}
          <div className="w-full md:w-1/2 h-full bg-slate-900 flex flex-col overflow-hidden">
            
            {/* CRM Header */}
            <div className="p-6 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <Globe className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Espace de Travail Externe</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OGGODATA, ZOHO & Outils Intégrés</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  title="Fermer l'espace scindé"
                >
                  <X className="w-4 h-4" />
                  Fermer
                </button>
              </div>

              {/* Active Call Prospect Fast Copy Bar */}
              {activeContact && (
                <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-xs uppercase">
                      {activeContact.First_Name?.[0] || 'C'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-tight">
                        Fiche Client Actif : {activeContact.First_Name} {activeContact.Last_Name || ''}
                      </h4>
                      {activeContact.Telephony && (
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Tél: {activeContact.Telephony}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fast Copy Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(`${activeContact.First_Name} ${activeContact.Last_Name || ''}`.trim(), 'name')}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      {copiedField === 'name' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Nom
                    </button>
                    {activeContact.Telephony && (
                      <button
                        onClick={() => handleCopy(activeContact.Telephony, 'phone')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Tél
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Navigation / URL Address Bar */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('oggodata')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'oggodata' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    OGGODATA
                  </button>
                  <button
                    onClick={() => setActiveTab('zoho')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'zoho' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    ZOHO CRM
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    URL Personnalisée
                  </button>
                </div>

                {/* Premium Browser-like Address Bar */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefresh}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all"
                    title="Actualiser l'iframe"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <form onSubmit={handleCustomUrlSubmit} className="flex-1 flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={activeTab === 'custom' ? customUrl : currentIframeUrl}
                      onChange={(e) => {
                        if (activeTab === 'custom') setCustomUrl(e.target.value);
                      }}
                      disabled={activeTab !== 'custom'}
                      className="flex-1 bg-transparent border-none text-xs text-slate-300 focus:outline-none focus:ring-0 select-all font-mono py-1.5 disabled:text-slate-500"
                      placeholder="https://example.com"
                    />
                    {activeTab === 'custom' && (
                      <button type="submit" className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300">
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>

                  <a
                    href={currentIframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-rose-500/20 transition-all flex items-center gap-1.5"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Frame Content Area */}
            <div className="flex-1 bg-slate-950 relative flex flex-col min-h-0">
              {/* Helpful Security Iframe Warning Banner */}
              <div className="bg-slate-900/60 border-b border-white/5 px-6 py-2 flex items-center gap-2 text-[10px] text-amber-500 font-semibold uppercase tracking-tight select-none">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Note : Zoho ou certaines extensions peuvent bloquer l'intégration iframe directe.</span>
              </div>

              <div className="flex-1 relative bg-white">
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
