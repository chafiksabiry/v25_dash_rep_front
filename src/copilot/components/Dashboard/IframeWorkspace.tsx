import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAgent } from '../../contexts/AgentContext';
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
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export function IframeWorkspace() {
  const { state } = useAgent();
  const activeContact = state.callState?.contact;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'oggodata' | 'zoho' | 'custom'>('oggodata');
  const [customUrl, setCustomUrl] = useState('https://www.oggodata.com/');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://www.oggodata.com/');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  
  // Custom states for Split-Screen Script AI HUD
  const [showScriptHUD, setShowScriptHUD] = useState(true);
  const [copiedReplicaText, setCopiedReplicaText] = useState<string | null>(null);

  // Fetch real-time script if active contact has an associated gigId
  const rawGigId = activeContact?.gigId;
  const gigIdString = typeof rawGigId === 'object' && rawGigId?._id 
    ? rawGigId._id 
    : typeof rawGigId === 'string'
    ? rawGigId
    : undefined;

  const { scripts, activeScript, loading: scriptLoading } = useGigScript(gigIdString);

  // Sync iframe source when active tab changes
  useEffect(() => {
    if (activeTab === 'oggodata') {
      setCurrentIframeUrl('https://www.oggodata.com/');
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

  const handleCopyReplica = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReplicaText(text);
    setTimeout(() => setCopiedReplicaText(null), 1500);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  // Group script items by phase if activeScript has them
  const scriptByPhase = activeScript?.script?.reduce((acc: any, item: any) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Premium high-converting fallback objection handlers to display if no active script is generated
  const fallbackObjections = [
    {
      title: "📞 ACCROCHE / INTRO",
      actor: "agent",
      replica: "Bonjour [Nom du prospect], je suis ravi de vous avoir. Je vous contacte brièvement suite à votre intérêt pour une étude comparative de votre mutuelle santé..."
    },
    {
      title: "⏱️ OBJECTION : 'Pas le temps'",
      actor: "agent",
      replica: "Je comprends tout à fait, votre temps est précieux. C'est pour cela que je vais être très bref : l'idée est simplement de valider si vous êtes éligible aux réductions de 2026..."
    },
    {
      title: "🛡️ OBJECTION : 'Déjà assuré / Satisfait'",
      actor: "agent",
      replica: "C'est une excellente chose d'être satisfait ! Notre rôle est simplement de vérifier sans engagement si à garanties équivalentes, vous ne pourriez pas économiser entre 150€ et 300€ par an..."
    },
    {
      title: "💎 OBJECTION : 'C'est trop cher'",
      actor: "agent",
      replica: "Je comprends tout à fait. La santé est un budget important. Justement, notre comparatif intègre des offres spécifiques avec des tarifs préférentiels négociés d'avance..."
    },
    {
      title: "⚡ ENGAGEMENT / ACTION",
      actor: "agent",
      replica: "Parfait, je valide vos informations pour vous envoyer l'étude par email. Quel est votre tarif mensuel actuel pour que je calibre précisément le comparatif ?"
    }
  ];

  return createPortal(
    <>
      {/* Floating Button on the Center of the Right Side */}
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

      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[170] transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sliding Work Drawer Panel (Stretched slightly wider to accommodate split screen script) */}
      <div className={`fixed right-0 top-0 h-screen w-full md:w-[85%] lg:w-[75%] xl:w-[65%] bg-slate-900 border-l border-white/10 z-[180] shadow-2xl flex flex-col transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
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

            {/* Header Control Buttons */}
            <div className="flex items-center gap-3">
              {/* Toggle Split Script Column Button */}
              <button
                onClick={() => setShowScriptHUD(!showScriptHUD)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                  showScriptHUD 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-500/20 shadow-lg shadow-indigo-500/25' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={showScriptHUD ? "Masquer le Script d'Appel" : "Afficher le Script d'Appel"}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Script {showScriptHUD ? "Actif" : "Masqué"}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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

        {/* Drawer Split-Screen Body Frame Content Area */}
        <div className="flex-1 flex overflow-hidden bg-slate-950">
          
          {/* LEFT SPLIT PANEL: Live Copilot Script HUD */}
          {showScriptHUD && (
            <div className="w-[38%] border-r border-white/5 bg-slate-900/60 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
              {/* Header */}
              <div className="px-5 py-3 bg-slate-950/40 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">GUIDE DE VENTE AI</span>
                </div>
                {activeScript?.targetClient && (
                  <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/35 text-[8px] font-black text-indigo-400 rounded-full">
                    DISC: {activeScript.targetClient}
                  </span>
                )}
              </div>

              {/* Scrollable Script or Fallback Objection Handlers */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {scriptLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Chargement talk tracks...</p>
                  </div>
                ) : activeScript?.script?.length ? (
                  // Display real collection scripts
                  Object.entries(scriptByPhase).map(([phase, replicas]) => (
                    <div key={phase} className="space-y-2">
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="h-px flex-1 bg-white/5"></div>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">{phase}</span>
                        <div className="h-px flex-1 bg-white/5"></div>
                      </div>
                      
                      <div className="space-y-2">
                        {(replicas as any[]).map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleCopyReplica(item.replica)}
                            className={`group/replica cursor-pointer relative p-3 rounded-xl border transition-all duration-300 ${
                              item.actor === 'agent' 
                                ? 'bg-indigo-950/20 border-indigo-500/10 hover:border-indigo-500/30 text-indigo-100' 
                                : 'bg-emerald-950/20 border-emerald-500/10 hover:border-emerald-500/30 text-emerald-100'
                            }`}
                            title="Cliquez pour copier la réplique"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                item.actor === 'agent' ? 'text-indigo-400' : 'text-emerald-400'
                              }`}>
                                {item.actor === 'agent' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {item.actor === 'agent' ? 'Representative' : 'Client'}
                              </span>
                              <span className="opacity-0 group-hover/replica:opacity-100 text-[8px] font-bold text-slate-500 transition-opacity">
                                {copiedReplicaText === item.replica ? "Copié !" : "Copier"}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed font-bold">
                              {item.replica}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Display premium objection handles
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-tight leading-normal">
                        Trame d'appel Générique de Mutuelle Santé (Cliquez sur un bloc pour copier le texte)
                      </p>
                    </div>

                    {fallbackObjections.map((obj, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleCopyReplica(obj.replica)}
                        className="group/replica cursor-pointer bg-slate-950/40 border border-white/5 hover:border-rose-500/20 rounded-xl p-3 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-1 border-b border-white/5 pb-1">
                          <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">{obj.title}</span>
                          <span className="opacity-0 group-hover/replica:opacity-100 text-[8px] font-bold text-slate-500 transition-opacity">
                            {copiedReplicaText === obj.replica ? "Copié !" : "Copier"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                          {obj.replica}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT SPLIT PANEL: Iframe Workspace Area */}
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

      </div>
    </>,
    document.body
  );
}

export default IframeWorkspace;
