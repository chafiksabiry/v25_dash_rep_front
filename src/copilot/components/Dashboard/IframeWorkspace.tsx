import React, { useState, useEffect } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { 
  Globe, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  Search
} from 'lucide-react';

export function IframeWorkspace() {
  const { state } = useAgent();
  const activeContact = state.callState?.contact;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'oggodata' | 'zoho' | 'custom'>('oggodata');
  const [customUrl, setCustomUrl] = useState('https://oggo-data.com');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://oggo-data.com');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Sync iframe source when active tab changes
  useEffect(() => {
    if (activeTab === 'oggodata') {
      setCurrentIframeUrl('https://oggo-data.com');
    } else if (activeTab === 'zoho') {
      setCurrentIframeUrl('https://crm.zoho.eu');
    } else {
      setCurrentIframeUrl(customUrl);
    }
  }, [activeTab]);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = customUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    setCustomUrl(formattedUrl);
    setCurrentIframeUrl(formattedUrl);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <>
      {/* Floating Button on the Center of the Right Side */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] flex items-center">
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

      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sliding Work Drawer Panel */}
      <div className={`fixed right-0 top-0 h-screen w-full md:w-[75%] lg:w-[65%] xl:w-[55%] bg-slate-900 border-l border-white/10 z-[110] shadow-2xl flex flex-col transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Drawer Header */}
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
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <X className="w-5 h-5" />
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
                  <p className="text-[10px] text-slate-400 font-medium">
                    Tél: {activeContact.Telephony || 'Non renseigné'} • E-mail: {activeContact.Email_1 || 'Non renseigné'}
                  </p>
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
                {activeContact.Email_1 && (
                  <button
                    onClick={() => handleCopy(activeContact.Email_1, 'email')}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    E-mail
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

        {/* Drawer Frame Content Area */}
        <div className="flex-1 bg-slate-950 relative flex flex-col">
          {/* Helpful Security Iframe Warning Banner */}
          <div className="bg-slate-900/60 border-b border-white/5 px-6 py-2 flex items-center gap-2 text-[10px] text-amber-500 font-semibold uppercase tracking-tight select-none">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Note : Zoho ou certaines extensions peuvent bloquer l'intégration iframe directe. Si le cadre reste vide, cliquez sur le bouton rouge à droite pour ouvrir dans un onglet externe.</span>
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
    </>
  );
}

export default IframeWorkspace;
