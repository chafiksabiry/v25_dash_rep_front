import React, { useState } from 'react';
import { PhoneOff, Brain, Volume2, MicOff, Mic, Headphones } from 'lucide-react';
import StatusCard from './StatusCard';
import { useAgent } from '../../contexts/AgentContext';

import { useAgentProfile } from '../../hooks/useAgentProfile';
import { TwilioCallService } from '../../services/twilioCallService';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';

const TopStatusBar: React.FC = () => {
  const { state, dispatch } = useAgent();

  // Use real-time audio visualizer if stream is available
  useAudioVisualizer(state.mediaStream);
  const { profile: agentProfile } = useAgentProfile();


  const [callExpanded, setCallExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Mute/unmute microphone
  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  // Toggle audio output mode (Speaker vs Headset)
  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
  };

  const handleToggleRecording = async () => {
    const { sid, isRecording } = state.callState;
    const userId = localStorage.getItem('agentId') || ""; // Fetch active agent ID with fallback

    if (!sid) {
      console.error('No active call SID found for recording toggle');
      return;
    }

    try {
      if (isRecording) {
        await TwilioCallService.stopRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: false } });
      } else {
        await TwilioCallService.startRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: true } });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 py-2">
      <div className="grid grid-cols-4 gap-3 min-h-[110px]">
        {/* CALL CARD */}
        <StatusCard
          icon={<PhoneOff size={20} className="text-white" />}
          title="Call Status"
          value={state.callState.isActive
            ? <span className="text-white font-black animate-pulse">ACTIVE CALL</span>
            : <span className="text-white/60 font-bold uppercase tracking-widest text-xs">Waiting...</span>
          }
          status="info"
          className={state.callState.isActive 
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-lg shadow-emerald-500/20" 
            : "bg-white border-gray-100"}
          expandable
          expanded={callExpanded}
          onToggle={() => setCallExpanded(e => !e)}
        />

        {/* RECORDING CARD */}
        <div className="relative group">
          <StatusCard
            icon={<Mic size={20} className={state.callState.isRecording ? "text-white" : "text-gray-400"} />}
            title="Recording"
            value={state.callState.isRecording ? (
              <span className="text-white font-black animate-pulse">LIVE REC</span>
            ) : state.callState.recordingUrl ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(state.callState.recordingUrl!, '_blank');
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Headphones size={12} />
                <span>Play</span>
              </button>
            ) : (
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Stopped</span>
            )}
            className={state.callState.isRecording 
              ? "bg-gradient-to-br from-red-600 to-rose-700 border-none shadow-lg shadow-red-500/30" 
              : "bg-white border-gray-100"}
          />
          {state.callState.isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRecording();
              }}
              className={`absolute top-2 right-2 p-1.5 rounded-xl transition-all ${state.callState.isRecording 
                ? 'bg-white/20 text-white hover:bg-white/40' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              title={state.callState.isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {state.callState.isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
        </div>

        {/* REP PROFILE CARD */}
        <StatusCard
          icon={<Brain size={20} className="text-indigo-500" />}
          title="Rep Profile"
          value={agentProfile ? (
            <div className="flex flex-col">
              <span className="text-gray-900 font-black text-sm uppercase truncate">
                {agentProfile.personalInfo.name}
              </span>
              <span className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest truncate line-clamp-1">
                {agentProfile.professionalSummary?.currentRole || 'Sales Representative'}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading...</span>
          )}
          expandable
          expanded={profileExpanded}
          onToggle={() => setProfileExpanded(e => !e)}
          className="bg-white border-gray-100 hover:border-indigo-200 group"
        />

        {/* AUDIO OUTPUT CARD */}
        <StatusCard
          icon={state.isSpeakerPhone ? <Volume2 size={20} className="text-cyan-500" /> : <Headphones size={20} className="text-cyan-500" />}
          title="Audio Output"
          value={
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-black text-xs uppercase">
                  {state.isSpeakerPhone ? 'Speaker' : 'Headset'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSpeaker();
                  }}
                  className="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-cyan-100 hover:bg-cyan-100 transition-all"
                >
                  Switch
                </button>
              </div>
              <div 
                className="w-full flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Volume2 size={12} className={state.volume === 0 ? "text-gray-400 mr-2" : "text-cyan-400 mr-2"} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          }
          className="bg-white border-gray-100 hover:border-cyan-200"
        />
      </div>
      {callExpanded && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <PhoneOff size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Call Controls & Recording</h2>
            </div>
            <button
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
              onClick={() => setCallExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 12H6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-12">
            {/* Audio Controls */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Audio Hardware</div>
              <div className="flex space-x-3">
                <button
                  className={`flex-1 p-4 rounded-2xl transition-all flex flex-col items-center gap-2 border ${state.isMicMuted ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'}`}
                  onClick={handleToggleMic}
                >
                  {state.isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{state.isMicMuted ? 'Muted' : 'Mic Active'}</span>
                </button>
                <button
                  className={`flex-1 p-4 rounded-2xl transition-all flex flex-col items-center gap-2 border ${state.isSpeakerPhone ? 'bg-cyan-50 border-cyan-100 text-cyan-600' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50'}`}
                  onClick={handleToggleSpeaker}
                >
                  {state.isSpeakerPhone ? <Volume2 size={24} /> : <Headphones size={24} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{state.isSpeakerPhone ? 'Speaker' : 'Headset'}</span>
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master Volume</span>
                  <span className="text-xs font-black text-cyan-500">{Math.round(state.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-gray-300" />
                  <input
                    type="range" min="0" max="1" step="0.01" value={state.volume}
                    onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>
            {/* Call Status */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Connection</div>
              <div className={`h-[160px] rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed transition-all ${state.callState.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`p-4 rounded-full ${state.callState.isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-gray-200 text-gray-400'}`}>
                  <PhoneOff size={32} />
                </div>
                <span className={`text-sm font-black uppercase tracking-[0.2em] ${state.callState.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {state.callState.isActive ? 'Call in Progress' : 'No Active Session'}
                </span>
              </div>
            </div>
            {/* Recording */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Data Capture</div>
              <div className="bg-gray-900 rounded-3xl p-6 flex flex-col h-[160px] justify-between shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${state.callState.isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                      {state.callState.isRecording ? 'Recording...' : 'Idle'}
                    </span>
                  </div>
                  {state.callState.isActive && (
                    <button
                      onClick={handleToggleRecording}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.callState.isRecording
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'}`}
                    >
                      {state.callState.isRecording ? 'Stop' : 'Start'}
                    </button>
                  )}
                </div>
                {state.callState.recordingUrl && (
                  <button
                    onClick={() => window.open(state.callState.recordingUrl!, '_blank')}
                    className="w-full bg-white text-gray-900 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                  >
                    <Headphones size={16} />
                    <span>Playback File</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {profileExpanded && agentProfile && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-500/20 transform rotate-3">
                {agentProfile.personalInfo.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">{agentProfile.personalInfo.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  {agentProfile.professionalSummary?.currentRole && (
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                      {agentProfile.professionalSummary.currentRole}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs font-bold">{agentProfile.personalInfo.email}</span>
                </div>
              </div>
            </div>
            <button
               className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
              onClick={() => setProfileExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 12H6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 text-gray-700">
            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6">
              <h3 className="text-indigo-500 font-black uppercase text-[10px] mb-4 tracking-[0.2em]">Expertise Summary</h3>
              <p className="text-sm leading-relaxed text-gray-600 font-medium">
                {agentProfile.professionalSummary?.yearsOfExperience ? (
                  <>Experience: <span className="text-gray-900 font-black">{agentProfile.professionalSummary.yearsOfExperience}</span> in sales and customer fulfillment.</>
                ) : "Highly skilled representative providing personalized voice interaction and strategic engagement."}
              </p>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6">
              <h3 className="text-indigo-500 font-black uppercase text-[10px] mb-4 tracking-[0.2em]">Identity & Loc</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold">Phone</span>
                  <span className="text-gray-900 font-black tracking-tight">{agentProfile.personalInfo.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold">Location</span>
                  <span className="text-gray-900 font-black tracking-tight">{agentProfile.personalInfo.location || 'Remote'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold">Network</span>
                  <span className="text-emerald-500 flex items-center font-black">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 shadow-lg shadow-emerald-500/50 animate-pulse"></span>
                    SECURE
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <Brain size={80} className="text-white" />
              </div>
              <h3 className="text-indigo-300 font-black uppercase text-[10px] mb-4 tracking-[0.2em] relative z-10">AI Methodology</h3>
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                  <Brain size={24} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-black text-sm uppercase tracking-wider">REPS V25</span>
                  <span className="text-indigo-300 text-[10px] font-bold">Adaptive Coaching Engine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopStatusBar; 
