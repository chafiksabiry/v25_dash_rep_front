import { useState, useEffect, useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useLead } from '../../hooks/useLead';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import {
  Phone, Mail, Calendar, Briefcase, Mic, MicOff, Volume2, Headphones
} from 'lucide-react';

interface TokenResponse {
  token: string;
}

export function ContactInfo() {
  const { storeCall } = useCallStorage();
  const { profile: agentProfile } = useAgentProfile();

  // Utiliser le contexte de transcription global
  const {
    startTranscription,
    stopTranscription
  } = useTranscription();

  const { dispatch, state } = useAgent();
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [, setActiveDevice] = useState<Device | null>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const isRecordingRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
  };

  // Synchronize ref with global state
  useEffect(() => {
    isRecordingRef.current = state.callState.isRecording;
  }, [state.callState.isRecording]);

  // Get leadId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId');

  // Use the hook to fetch lead data
  const { lead: apiLead, loading: leadLoading, error: leadError } = useLead(leadId);

  // Populated gig data from lead
  const gig = apiLead?.gigId;


  // Map ApiLead to the contact format expected by the component
  const contact = apiLead ? {
    id: apiLead._id,
    name: apiLead.name || (apiLead.First_Name || apiLead.Last_Name ? `${apiLead.First_Name || ''} ${apiLead.Last_Name || ''}`.trim() : 'Unknown Lead'),
    email: apiLead.email || apiLead.Email_1 || 'No email',
    phone: apiLead.phone || apiLead.Phone || '',
    company: apiLead.company || apiLead.companyId || 'Unknown Company',
    title: apiLead.title || apiLead.Activity_Tag || 'Prospect',
    avatar: apiLead.avatar || '',
    status: (apiLead.status || 'qualified') as 'qualified',
    source: (apiLead.source || 'CRM') as 'website',
    priority: (apiLead.priority || 'high') as 'high',
    lastContact: apiLead.Last_Activity_Time ? new Date(apiLead.Last_Activity_Time) : new Date(),
    nextFollowUp: apiLead.nextFollowUp ? new Date(apiLead.nextFollowUp) : new Date(Date.now() + 86400000),
    notes: apiLead.notes || apiLead.Stage || 'No notes available',
    tags: [apiLead.Pipeline || 'Standard'],
    value: apiLead.value || 0,
    assignedAgent: apiLead.assignedTo?.personalInfo?.name || agentProfile?.personalInfo?.name || 'Agent',
    timezone: apiLead.timezone || 'UTC',
    preferredContactMethod: (apiLead.preferredContactMethod || 'phone') as 'phone',
    socialProfiles: apiLead.socialProfiles || { linkedin: '', twitter: '' },
    leadScore: apiLead.leadScore || 50,
    interests: apiLead.interests || [],
    painPoints: apiLead.painPoints || [],
    budget: apiLead.budget || { min: 0, max: 0, currency: 'USD' },
    timeline: apiLead.timeline || '',
    decisionMakers: apiLead.decisionMakers || [],
    competitors: apiLead.competitors || [],
    previousInteractions: apiLead.previousInteractions || []
  } : {
    id: '65d7f6a9e8f3e4a5c6d1e456',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '',
    company: 'TechCorp Solutions',
    title: 'VP of Operations',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    status: 'qualified' as 'qualified',
    source: 'website' as 'website',
    priority: 'high' as 'high',
    lastContact: new Date(Date.now() - 86400000 * 3), // 3 days ago
    nextFollowUp: new Date(Date.now() + 86400000), // Tomorrow
    notes: 'Interested in enterprise solution. Budget approved. Decision maker identified.',
    tags: ['Enterprise', 'Hot Lead', 'Q4 Target'],
    value: 75000,
    assignedAgent: 'Agent Smith',
    timezone: 'EST',
    preferredContactMethod: 'phone' as 'phone',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      twitter: 'https://twitter.com/sarahj'
    },
    leadScore: 85,
    interests: ['Automation', 'Cost Reduction', 'Scalability'],
    painPoints: ['Manual processes', 'High operational costs', 'Limited scalability'],
    budget: {
      min: 50000,
      max: 100000,
      currency: 'USD'
    },
    timeline: 'Q4 2024',
    decisionMakers: ['Sarah Johnson (VP Operations)', 'Mike Chen (CTO)', 'Lisa Rodriguez (CFO)'],
    competitors: ['CompetitorA', 'CompetitorB'],
    previousInteractions: [
      {
        date: new Date(Date.now() - 86400000 * 7),
        type: 'email',
        outcome: 'Positive response',
        notes: 'Expressed interest in demo'
      },
      {
        date: new Date(Date.now() - 86400000 * 14),
        type: 'call',
        outcome: 'Qualified lead',
        notes: 'Budget confirmed, timeline established'
      }
    ] as { date: Date; type: 'call' | 'email' | 'meeting' | 'demo'; outcome: string; notes: string; }[]
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      return `${cleanPhone.substring(0, 5)}...`;
    }
    return `+${cleanPhone.substring(0, 4)}...`;
  };


  // Debug: Log contact data whenever it changes
  /*  console.log("Contact data:", contact);
   console.log("Contact phone:", contact.phone);
   console.log("Call status:", callStatus); */

  const initiateTwilioCall = async () => {
    /*  console.log("Contact phone number:", contact.phone);
     console.log("Contact object:", contact);
     console.log("Call status at start:", callStatus); */

    // Ensure we have valid contact data
    const phoneNumber = contact.phone;

    if (!phoneNumber) {
      console.error('No phone number available');
      return;
    }

    setIsCallLoading(true);
    setCallStatus('initiating');
    console.log("Starting Twilio call to:", phoneNumber);

    try {
      // Get Twilio token
      const apiUrl = import.meta.env.VITE_API_URL_CALL || 'http://localhost:3000';
      const tokenUrl = `${apiUrl}/api/calls/token`;
      console.log("Fetching token from:", tokenUrl);

      const response = await axios.get<TokenResponse>(tokenUrl);
      const token = response.data.token;
      console.log("Token received:", token ? "Token exists" : "No token");

      if (!token) {
        throw new Error("No token received from server");
      }

      // Create Twilio Device
      console.log("Creating Twilio Device...");
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'pcma'] as any,
        edge: ['ashburn', 'dublin', 'sydney']
      });

      // Register device
      console.log("Registering device...");
      await newDevice.register();
      console.log("Device registered successfully");

      // Connect call
      console.log("Connecting call...");
      const conn = await newDevice.connect({
        params: {
          To: phoneNumber,
          LeadId: contact.id, // Pass LeadId for dynamic Caller ID resolution
          MediaStream: true,
        },
        rtcConfiguration: {
          sdpSemantics: "unified-plan",
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        },
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        }
      } as any);
      console.log("Connection established:", conn);

      // Store active connection and device locally and globally
      setActiveConnection(conn);
      setActiveDevice(newDevice);
      dispatch({ type: 'SET_TWILIO_CONNECTION', connection: conn, device: newDevice });

      // Set up event listeners
      conn.on('connect', () => {
        const callSid = conn.parameters?.CallSid;
        console.log("CallSid:", callSid);
      });

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        const Sid = conn.parameters?.CallSid;
        console.log("CallSid recupéré", Sid);
        setCurrentCallSid(Sid);
        setCallStatus('active');

        // Ajout : dispatcher l'action START_CALL dans le contexte global
        dispatch({
          type: 'START_CALL',
          participants: [], // tu peux mettre la vraie liste si tu l'as
          contact: contact,
          sid: Sid
        });

        // Start transcription when call is accepted
        setTimeout(async () => {
          try {
            const stream = conn.getRemoteStream();
            if (stream) {
              dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: stream });

              // Attach remote stream to global call-audio element for speaker control
              const remoteAudio = document.getElementById('call-audio') as HTMLAudioElement;
              if (remoteAudio) {
                remoteAudio.srcObject = stream;
                console.log('🔊 Remote audio attached to #call-audio');
              }

              // Log de debug pour la transcription
              console.log('🌍 Starting transcription with global context');

              // NEW: Capture local microphone stream for full bidirectional transcription
              try {
                const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = localStream;
                console.log('🎤 Local microphone captured for bidirectional transcription');
                await startTranscription(stream, contact.phone, localStream);
              } catch (micError) {
                console.warn('⚠️ Could not capture local microphone, defaulting to remote only:', micError);
                await startTranscription(stream, contact.phone);
              }

              console.log('🎤 Transcription started for call phases');
            }
          } catch (error) {
            console.error('Failed to start transcription:', error);
          }
        }, 1000);

        // Set call details in global state
        console.log('Setting call details:', { callSid: Sid, agentId: contact.id });
      });

      conn.on('disconnect', async () => {
        console.log("Call disconnected");
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        setActiveDevice(null);
        dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
        dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });

        // Cleanup local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }

        // Stop transcription
        await stopTranscription();

        // Store call in database when it disconnects
        if (currentCallSid && contact.id) {
          await storeCall(currentCallSid, contact.id, isRecordingRef.current);
        }

        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

      conn.on('error', (error: any) => {
        console.error("Call error:", error);
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        setActiveDevice(null);
        dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });

        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

    } catch (err: any) {
      console.error("Failed to initiate Twilio call:", err);
      setCallStatus('idle'); // Reset to idle on error
    } finally {
      setIsCallLoading(false);
    }
  };

  const endCall = async () => {
    console.log("Ending call...");
    console.log("Contact before ending call:", contact);
    console.log("Contact phone before ending call:", contact.phone);

    if (activeConnection) {
      activeConnection.disconnect();
    }

    // Cleanup local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset call-related states only
    setActiveConnection(null);
    setActiveDevice(null);
    setCallStatus('idle'); // Reset to idle instead of 'ended'
    dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
    dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });

    // Stop transcription
    await stopTranscription();

    // Store call in database when it ends
    if (currentCallSid && contact.id) {
      await storeCall(currentCallSid, contact.id);
    }

    // Ajout : dispatch END_CALL pour mettre à jour le context global
    dispatch({ type: 'END_CALL' });

    console.log("Call ended. Contact after ending call:", contact);
    console.log("Contact phone after ending call:", contact.phone);
  };

  const handleStartCall = () => {
    initiateTwilioCall();
  };




  return (
    <>
      <div className="bg-white/80 border border-gray-100 backdrop-blur-md rounded-2xl shadow-sm px-5 py-3 flex items-center justify-between mt-2 mb-2">
        {/* Avatar + Infos */}
        {/* Avatar + Infos */}
        <div className="flex items-center space-x-4">
          {leadLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-gray-500 text-sm">Loading lead...</span>
            </div>
          ) : leadError ? (
            <div className="text-red-500 text-sm font-medium">Error: {leadError}</div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-harx flex items-center justify-center text-white text-xl font-bold shadow-sm shadow-harx-500/20">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  contact.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-lg font-black text-gray-900 tracking-tight">{contact.name}</span>
                </div>
                
                <div className="flex flex-col space-y-2 mt-2 ml-1">
                  {/* Email Section */}
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    <div className="p-1 bg-blue-50 rounded-lg">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-gray-500">{contact.email}</span>
                  </div>

                  {/* Gig Section */}
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    <div className="p-1 bg-indigo-50 rounded-lg">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="text-gray-500 uppercase tracking-widest">GiG ; <span className="text-indigo-600 font-black">{(gig as any)?.title || 'Standard Project'}</span></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Bouton Start Call + Tabs */}
          <div className="flex-1 flex flex-col items-center">
          {callStatus === 'active' ? (
            <button
              onClick={endCall}
              className="w-48 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl font-bold text-base transition-all duration-300 shadow-md bg-red-600 hover:bg-red-700 text-white hover:-translate-y-0.5"
            >
              <Phone className="w-4 h-4 mr-2" />
              End Call
            </button>
          ) : (
            <button
              onClick={handleStartCall}
              disabled={isCallLoading || callStatus === 'initiating'}
              className={`w-48 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl font-bold text-base transition-all duration-300 shadow-md hover:-translate-y-0.5
                  ${isCallLoading || callStatus === 'initiating' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-harx text-white shadow-harx-500/20 active:scale-95'}`}
            >
              <Phone className="w-4 h-4 mr-2" />
              {isCallLoading || callStatus === 'initiating' ? '...' : 'Call'}
            </button>
          )}

          <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100" title="Secure Line">
            <div className="p-1 bg-cyan-100 rounded-lg">
              <Phone className="w-3 h-3 text-cyan-600" />
            </div>
            <span className="text-gray-600">{maskPhone(contact.phone)}</span>
          </div>

        </div >
        {/* Actions à droite */}
        <div className="flex items-center space-x-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
          {/* Mute Toggle */}
          <button 
            onClick={handleToggleMic}
            className={`p-2.5 rounded-xl border transition-all shadow-sm ${state.isMicMuted ? 'bg-rose-500 text-white border-rose-600' : 'bg-white text-emerald-500 hover:bg-emerald-50 border-emerald-100'}`}
            title={state.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {state.isMicMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>

          {/* Speaker Toggle */}
          <button 
            onClick={handleToggleSpeaker}
            className={`p-2.5 rounded-xl border transition-all shadow-sm ${!state.isSpeakerPhone ? 'bg-cyan-500 text-white border-cyan-600' : 'bg-white text-indigo-500 hover:bg-indigo-50 border-indigo-100'}`}
            title={state.isSpeakerPhone ? 'Switch to headset' : 'Switch to speaker'}
          >
            {!state.isSpeakerPhone ? <Headphones className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>

          {/* Other Actions */}
          <button className="bg-white border border-gray-200 text-gray-300 p-2.5 rounded-xl cursor-not-allowed opacity-50" title="Coming Soon">
            <Calendar className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </>
  );
}
