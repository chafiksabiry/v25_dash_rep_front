import React from 'react';
import { AgentProvider, useAgent } from './contexts/AgentContext';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import TopStatusBar from './components/Dashboard/TopStatusBar';
import { ContactInfo } from './components/Dashboard/ContactInfo';
import DashboardGrid from './components/Dashboard/DashboardGrid';
import { TranscriptionBridge } from './components/TranscriptionBridge';
import { IframeWorkspace } from './components/Dashboard/IframeWorkspace';
import { Globe } from 'lucide-react';

import { useDestinationZone } from './hooks/useDestinationZone';

function AppContent() {
  const { state, dispatch } = useAgent();
  // Récupérer la zone de destination au niveau de l'App
  const { zone: destinationZone } = useDestinationZone();

  return (
    <TranscriptionProvider destinationZone={destinationZone || undefined}>
      <TranscriptionBridge />
      <div className="bg-transparent overflow-hidden rounded-3xl" style={{ minHeight: 'calc(100vh - 150px)' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className={`${state.isIframeOpen ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-in fade-in duration-500' : 'w-full'}`}>
            
            {/* Column 1: Copilot App (Script, contact, status) */}
            <div className="space-y-6">
              <div className="pt-2 pb-0">
                <TopStatusBar />
              </div>
              <ContactInfo />
              <DashboardGrid />
            </div>

            {/* Column 2: Full Workspace Iframe side-by-side */}
            {state.isIframeOpen && (
              <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-200px)] min-h-[650px] flex flex-col animate-in slide-in-from-right duration-500">
                <IframeWorkspace inline={true} />
              </div>
            )}

          </div>
        </div>
        {/* Hidden audio element for Twilio call audio */}
        <audio id="call-audio" autoPlay style={{ display: 'none' }} />
      </div>

      {/* Floating trigger button on the center right edge of the page */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[160] flex items-center">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_IFRAME' })}
          className="bg-gradient-to-r from-orange-400 via-rose-500 to-rose-600 hover:from-orange-500 hover:to-rose-700 text-white font-black text-[10px] tracking-widest uppercase py-4 px-2.5 rounded-l-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all duration-300 transform hover:-translate-x-1.5 flex flex-col items-center gap-2 border-y border-l border-white/20 select-none writing-mode-vertical"
          style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          title={state.isIframeOpen ? "Fermer l'Espace Externe" : "Ouvrir l'Espace Externe"}
        >
          <Globe className="w-4 h-4 animate-spin-slow rotate-90" />
          <span className="mt-1 font-extrabold">{state.isIframeOpen ? 'FERMER' : 'EXTERNES'}</span>
        </button>
      </div>
    </TranscriptionProvider>
  );
}

function App() {
  return (
    <AgentProvider>
      <AppContent />
    </AgentProvider>
  );
}

export default App;
