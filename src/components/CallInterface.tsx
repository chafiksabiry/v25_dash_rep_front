import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { Device, Call } from '@twilio/voice-sdk';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calls } from "@qalqul/sdk-call";
import { QalqulSDK } from "@qalqul/sdk-call/dist/model/QalqulSDK";
import io from "socket.io-client";
import { callsApi } from "../services/api/calls";
import { AIAssistantAPI } from './GlobalAIAssistant';
import { useNavigate } from 'react-router-dom';

// Constants for speech recognition


// Define interfaces for Qalqul SDK types
interface QalqulCall {
  status: string;
  isMuted: () => boolean;
  unMute: () => void;
  mute: () => void;
  isOnHold: () => boolean;
  resume: () => void;
  hold: () => void;
  hangup: () => void;
}

interface QalqulSDKType {
  new (io: any, settings: any, callback: () => void): QalqulSDKType;
  getCalls: () => Promise<QalqulCall[]>;
  dial: (recipient: string) => Promise<string>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

// Cast the QalqulSDK class to our type
const QalqulSDKWithTypes = QalqulSDK as unknown as QalqulSDKType;

type CallStatus = 'idle' | 'initiating' | 'active' | 'ended';

interface AIAssistantMessage {
  role: 'assistant' | 'system';
  content: string;
  timestamp: Date;
  category: 'suggestion' | 'alert' | 'info' | 'action';
  priority: 'high' | 'medium' | 'low';
  isProcessed?: boolean;
}

interface CallInterfaceProps {
  phoneNumber: string;
  agentId: string;
  onEnd: () => void;
  onCallSaved?: () => void;
  provider?: 'twilio' | 'qalqul';
  keepAIPanelAfterCall?: boolean;
  callId: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Add these interfaces at the top of the file with other interfaces
interface AudioProcessingEvent extends Event {
  inputBuffer: AudioBuffer;
  outputBuffer: AudioBuffer;
  playbackTime: number;
}

interface AudioWorkletMessage extends MessageEvent {
  data: ArrayBuffer;
}

export function CallInterface({ phoneNumber, agentId, onEnd, onCallSaved, provider = 'twilio', keepAIPanelAfterCall = true, callId }: CallInterfaceProps) {
  // Constants for audio processing and transcription
  const SPEECH_THRESHOLD = 0.015;
  const SILENCE_TIMEOUT = 2000;
  const TRANSCRIPT_PROCESS_DELAY = 2000;
 

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [connection, setConnection] = useState<Call | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioProcessor, setAudioProcessor] = useState<AudioWorkletNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const { currentUser } = useAuth();
  let qalqulSDK: QalqulSDKType | undefined;
  let calls: any[] = [];
  let isSdkInitialized: boolean = false;
  let start_timer_var = 0;  
  let callTimer = "00:00:00";
  let uuId: string | null = null;

  // Qalqul settings
  let settings1 = {
    generalSettings: {
      agent: {
        username: "Agent.1",
        password: "ewyaHtvzDPRdXrZL",
        name: "Agent.1",
        sipAddress: `sip:Agent.1@digital-works.qalqul.io`,
      },
      baseUrl: 'https://digital-works.qalqul.io',
      server: {
        realm: 'digital-works.qalqul.io',
        ws: 'wss://digital-works.qalqul.io:10443',
      },
      iceServers: [{ url: "stun:digital-works.qalqul.io:3478" }],
      logLevel: false
    },
    headerData: {
      ...(phoneNumber.startsWith('+212') || phoneNumber.startsWith('00212') ? {
        callerId: 8678,
        outCallerId: "0522774125",
        CampaignID: 3,
        agent: 7,
        sipNumber: 8595,
        QueueName: 'DigitalWorksQueueMA',
        queueId: 11,
        CountryCode: 212,
        outRouteId: 72,
        outGatewayId: 94,
        outGatewayName: 'Ma_GW',
      } : phoneNumber.startsWith('+33') || phoneNumber.startsWith('0033') ? {
        callerId: 8678,
        outCallerId: "33162151114",
        CampaignID: 3, 
        agent: 7,
        sipNumber: 8595,
        QueueName: 'DigitalWorksQueueFR',
        queueId: 2,
        CountryCode: 33,
        outRouteId: 47,
        outGatewayId: 29,
        outGatewayName: 'GW_FR_new',
      } : {}),
      agentusername: 'Agent.1',
      CampaignName: "",
      Disposition: "",
      InteractionID: null,
      PCIRecord: false,
      RecordChannel: "",
      UniqueID: null,
      WrapupStrict: 'No',
      WrapupTime: 0,
      DispositionType: 'Yes',
      transfer: false,
      WrapupStatus: false,
      profileId: '16045',
    }
  };

  let callManage: NodeJS.Timeout | undefined;
  let intervalTimer: NodeJS.Timeout | undefined;

  // Speech recognition states
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('');
  const [transcriptBuffer, setTranscriptBuffer] = useState<string>('');
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [lastProcessedText, setLastProcessedText] = useState<string>('');
  const [currentSpeechSegment, setCurrentSpeechSegment] = useState<string>('');
  const [lastSpeechTimestamp, setLastSpeechTimestamp] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const navigate = useNavigate();
  const socketRef = useRef<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getLanguageFromPhoneNumber = (phone: string): { 
    languageCode: string, 
    alternativeLanguageCodes: string[] 
  } => {
    // Base configuration
    const config = {
      languageCode: 'en-US',
      alternativeLanguageCodes: ['en-US', 'fr-FR', 'ar-MA', 'es-ES', 'de-DE']
    };

    // Determine primary language based on phone number
    if (phone.startsWith('+1') || phone.startsWith('001')) {
      config.languageCode = 'en-US';
      config.alternativeLanguageCodes = ['en-US', 'es-US']; // Add Spanish US as alternative for US numbers
    } else if (phone.startsWith('+33') || phone.startsWith('0033')) {
      config.languageCode = 'fr-FR';
    } else if (phone.startsWith('+212') || phone.startsWith('00212')) {
      config.languageCode = 'ar-MA';
      config.alternativeLanguageCodes = ['ar-MA', 'fr-FR', 'en-US'];
    } else if (phone.startsWith('+34') || phone.startsWith('0034')) {
      config.languageCode = 'es-ES';
    } else if (phone.startsWith('+49') || phone.startsWith('0049')) {
      config.languageCode = 'de-DE';
    }

    return config;
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Speech recognition result:', data);
      
      if (data.error) {
        console.error('❌ Speech recognition error:', data.error);
        return;
      }

      // Extract transcript and metadata
      let transcriptToProcess = '';
      let confidence = 0;
      let detectedLanguage = '';

      if (data.transcript) {
        transcriptToProcess = data.transcript;
        confidence = data.confidence || 0;
        detectedLanguage = data.languageCode;
      } else if (data.results?.[0]?.alternatives?.[0]) {
        const result = data.results[0].alternatives[0];
        transcriptToProcess = result.transcript;
        confidence = result.confidence || 0;
        detectedLanguage = data.results[0].languageCode || data.languageCode;
      }

      // Log detailed recognition info for debugging
      console.log('🎯 Recognition details:', {
        transcript: transcriptToProcess,
        confidence,
        language: detectedLanguage,
        isFinal: data.isFinal
      });

      // Process all transcripts, regardless of confidence
      if (transcriptToProcess?.trim()) {
        // Clean the transcription from previous repetitions
        const cleanedTranscript = transcriptToProcess.replace(lastProcessedText, '').trim();
        
        if (cleanedTranscript) {
          console.log('✨ New transcript segment:', {
            text: cleanedTranscript,
            confidence,
            language: detectedLanguage
          });
          
          // Clear any existing timeout
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }

          // If it's a final result, process it immediately
          if (data.isFinal) {
            console.log('🏁 Final transcript received');
            const fullSegment = `${currentSpeechSegment} ${cleanedTranscript}`.trim();
            processTranscriptionSegment(fullSegment, true);
          } else {
            // For interim results, update current segment
            const newSegment = `${currentSpeechSegment} ${cleanedTranscript}`.trim();
            setCurrentSpeechSegment(newSegment);
            
            // Set timeout for processing, but only if we have enough silence
            transcriptTimeoutRef.current = setTimeout(() => {
              if (hasEnoughSilence()) {
                processTranscriptionSegment(newSegment, false);
              }
            }, TRANSCRIPT_PROCESS_DELAY);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  };

  let callback = async () => {
    console.log("Start callback function");
    if (!qalqulSDK) return;
    
    //Get Calls from SDK Qalqul
    await updateCallsState();
    console.log("callback function suite");
    //There is no call : appel terminé
    const calls = await qalqulSDK.getCalls();
    if (calls.length === 0) {
      console.log("fin du call:", qalqulSDK);
      console.log("clear timer to getCalls:", callManage);
      clearInterval(callManage);
      callManage = undefined;
      console.log("stop call timer:", intervalTimer);
      clearInterval(intervalTimer);
      await setCallStatus('ended');
      console.log("terminated call -> popup to register info in DB");
      //function to update the rest of call details in DB
      if (uuId) {
        await updateCallDetailsInDB(uuId);
      }
    }
  };

  let updateCallDetailsInDB = async (callSid: string) => {
    console.log("update call details in DB:", callSid);
    //function to update the rest of call details in DB

    const res = await callsApi.storeCallInDBAtEndCall(phoneNumber, callSid);
    const callDetails = res.data.data;
    console.log("call details from DB:", callDetails);
  };

  let updateCallsState = async () => {
    console.log("Début de la fonction : updateCallsState");
    if (!qalqulSDK) return;
    calls = await qalqulSDK.getCalls();
    console.log(" Fin : calls in update calls state:", calls);
  };

  let handleDial = async () => {
    console.log("Start Handle Dial Function:");
    start_timer_var = 0;
    callTimer = "00 : 00 : 00";
    const recipient = phoneNumber;
    console.log("Lead phone number to call:", recipient);
    try {
      if (!qalqulSDK) {
        console.error("SDK not initialized");
        return;
      }
      
      const newUuid = await qalqulSDK.dial(recipient);
      if (newUuid) {
        uuId = newUuid;
        console.log("Call initiated with UUID:", uuId);
        await storeQalqulCallInDbInStart(newUuid);
        console.log("in dial after store in db");

        await updateCallsState();
        await getCalls();
      }
    } catch (error) {
      console.error("Error dialing:", error);
    } finally {
      console.log("Finish Handle Dial Function:");
    }
  };

  useEffect(() => {
    const initiateCall = async () => {
      if (!currentUser) {
        setError('You must be logged in to make calls');
        return;
      }

      console.log('Initiating the call...');

      try {
        if (provider === 'qalqul') {
          // Initialize Qalqul with credentials
          await initializeSdk();
          if(isSdkInitialized){
            await handleDial();
          }
        } else {
          // Existing Twilio implementation
          const response = await axios.get(`${import.meta.env.VITE_API_URL_CALL}/api/calls/token`);
          const token = response.data.token;

          const newDevice = new Device(token, {
            codecPreferences: ['pcmu', 'pcma'] as any,
            edge: ['ashburn', 'dublin', 'sydney']
          });
          
          await newDevice.register();
          const conn = await newDevice.connect({
            params: { 
              To: phoneNumber,
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

          setConnection(conn);
          setCallStatus("initiating");

          conn.on('connect', () => {
            const callSid = conn.parameters.CallSid;
            console.log("CallSid:", callSid);
          });

          conn.on('accept', () => {
            console.log("✅ Call accepted");
            const Sid = conn.parameters.CallSid;
            console.log("CallSid recupéré", Sid);
            setCallSid(Sid);
            // Set call details in global state
            AIAssistantAPI.setCallDetails(Sid, agentId);
            setCallStatus("active");

            // Wait a moment for the media stream to be ready
            setTimeout(() => {
              const stream = conn.getRemoteStream();
              console.log("mediaStream:", stream);
              
              if (stream) {
                try {
                  // Create an audio context to process the stream
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  setAudioContext(audioContext);
                  const source = audioContext.createMediaStreamSource(stream);
                  
                  // Create audio analyzer to monitor audio levels
                  const analyzer = audioContext.createAnalyser();
                  analyzer.fftSize = 2048;
                  source.connect(analyzer);

                  let isCallActive = true;
                  let cleanupInitiated = false;

                  const cleanup = async () => {
                    if (cleanupInitiated) return;
                    cleanupInitiated = true;
                    console.log("🧹 Starting cleanup...");
                    
                    isCallActive = false;
                    
                    // Close WebSocket first
                    if (ws?.readyState === WebSocket.OPEN) {
                      console.log("🔌 Closing WebSocket connection...");
                      ws.close(1000, "Call ended normally");
                    }

                    // Wait a bit for WebSocket to close cleanly
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Then cleanup audio
                    try {
                      console.log("🎵 Cleaning up audio resources...");
                      if (analyzer) {
                        analyzer.disconnect();
                      }
                      if (source) {
                        source.disconnect();
                      }
                      if (audioProcessor) {
                        audioProcessor.disconnect();
                      }
                      if (audioContext) {
                        await audioContext.close();
                      }
                    } catch (error) {
                      console.error("❌ Error during audio cleanup:", error);
                    }

                    console.log("✅ Cleanup complete");
                  };

                  // Initialize WebSocket connection for streaming audio to backend
                  const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
                  console.log('Connecting to WebSocket URL:', wsUrl);
                  const newWs = new WebSocket(wsUrl);
                  setWs(newWs);
                  let newAudioProcessor: AudioWorkletNode | null = null;

                  newWs.onopen = async () => {
                    if (!isCallActive) {
                      console.log("Call no longer active, closing new WebSocket connection");
                      newWs.close(1000, "Call already ended");
                      return;
                    }

                    console.log('🔌 WebSocket connection established for speech-to-text');
                    try {
                      // Create audio worklet for processing after WebSocket is ready
                      await audioContext.audioWorklet.addModule('/audio-processor.js');
                      newAudioProcessor = new AudioWorkletNode(audioContext, 'audio-processor', {
                        numberOfInputs: 1,
                        numberOfOutputs: 1,
                        channelCount: 1,
                        processorOptions: {
                          sampleRate: audioContext.sampleRate
                        }
                      });
                      setAudioProcessor(newAudioProcessor);
                      
                      source.connect(newAudioProcessor);
                      newAudioProcessor.connect(audioContext.destination);

                      // Send configuration message with improved settings
                      const config = {
                        config: {
                          encoding: 'LINEAR16',
                          sampleRateHertz: audioContext.sampleRate,
                          languageCode: getLanguageFromPhoneNumber(phoneNumber).languageCode,
                          enableAutomaticPunctuation: true,
                          model: 'phone_call',
                          useEnhanced: true,
                          audioChannelCount: 1,
                          enableWordConfidence: true,
                          enableSpeakerDiarization: true,
                          diarizationConfig: {
                            enableSpeakerDiarization: true,
                            minSpeakerCount: 2,
                            maxSpeakerCount: 2
                          },
                          enableAutomaticLanguageIdentification: true,
                          alternativeLanguageCodes: getLanguageFromPhoneNumber(phoneNumber).alternativeLanguageCodes,
                          interimResults: true,
                          singleUtterance: false,
                          metadata: {
                            interactionType: 'PHONE_CALL',
                            industryNaicsCodeOfAudio: 518,
                            originalMediaType: 'PHONE_CALL',
                            recordingDeviceType: 'PHONE_LINE',
                            microphoneDistance: 'NEARFIELD',
                            originalMimeType: 'audio/x-raw',
                            audioTopic: 'customer_service'
                          }
                        }
                      };
                      
                      console.log('📝 Sending speech recognition config:', config);
                      newWs.send(JSON.stringify(config));

                      // Handle audio data from worklet with improved error handling
                      newAudioProcessor.port.onmessage = (event) => {
                        if (newWs.readyState === WebSocket.OPEN && isCallActive) {
                          try {
                            const audioData = event.data;
                            if (!(audioData instanceof ArrayBuffer)) {
                              console.error('❌ Invalid audio data format:', typeof audioData);
                              return;
                            }

                            // Convert to 16-bit PCM
                            const view = new DataView(audioData);
                            const pcmData = new Int16Array(audioData.byteLength / 2);
                            for (let i = 0; i < pcmData.length; i++) {
                              pcmData[i] = view.getInt16(i * 2, true);
                            }
                            
                            // Send audio data with error handling
                            try {
                              newWs.send(pcmData.buffer);
                            } catch (wsError) {
                              console.error('❌ WebSocket send error:', wsError);
                              if (isCallActive && newWs.readyState !== WebSocket.OPEN) {
                                console.log('🔄 WebSocket not open, attempting reconnection...');
                                reconnectWebSocket();
                              }
                            }
                          } catch (error) {
                            console.error('❌ Error processing audio data:', error);
                          }
                        }
                      };

                      // Start monitoring audio levels with improved thresholds
                      const analyzeAudio = () => {
                        if (!isCallActive) return;
                        
                        const dataArray = new Float32Array(analyzer.frequencyBinCount);
                        analyzer.getFloatTimeDomainData(dataArray);
                        
                        let rms = 0;
                        let peak = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                          const amplitude = Math.abs(dataArray[i]);
                          rms += amplitude * amplitude;
                          peak = Math.max(peak, amplitude);
                        }
                        
                        rms = Math.sqrt(rms / dataArray.length);
                        const isActive = rms > 0.02; // Adjusted threshold
                        
                        // Only log if there's significant audio or status change
                        if (rms > 0.01) {
                          console.log('🎤 Audio levels:', {
                            rms: rms.toFixed(3),
                            peak: peak.toFixed(3),
                            bufferSize: dataArray.length,
                            isActive
                          });
                        }
                        
                        if (isCallActive) {
                          requestAnimationFrame(analyzeAudio);
                        }
                      };
                      analyzeAudio();

                    } catch (error) {
                      console.error('❌ Error initializing audio worklet:', error);
                      console.error('Error details:', error);
                    }
                  };

                  const reconnectWebSocket = () => {
                    if (isCallActive && (!newWs || newWs.readyState === WebSocket.CLOSED)) {
                      console.log('🔄 Attempting to reconnect WebSocket...');
                      const reconnectWs = new WebSocket(wsUrl);
                      setWs(reconnectWs);
                    }
                  };

                  newWs.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    if (isCallActive) {
                      setTimeout(reconnectWebSocket, 2000);
                    }
                  };

                  newWs.onclose = (event) => {
                    console.log('WebSocket connection closed:', event.code, event.reason);
                    if (isCallActive && event.code !== 1000) {
                      console.log('🔄 WebSocket closed unexpectedly, attempting to reconnect...');
                      setTimeout(reconnectWebSocket, 2000);
                    }
                  };

                  // Update WebSocket message handler
                  newWs.onmessage = handleWebSocketMessage;

                  // Set up cleanup for call end
                  conn.on("disconnect", async () => {
                    console.log("❌ Call disconnected - Starting cleanup and save process");
                    
                    const currentCallSid = conn.parameters.CallSid;
                    onEnd();
                    try {
                      // First do the cleanup to ensure resources are released
                      await cleanup();
                      console.log("✅ Cleanup completed, proceeding to save call details");

                      // Save call details using global state
                      if (currentCallSid) {
                        await AIAssistantAPI.saveCallToDB();
                        console.log("✅ Successfully saved call details to DB");
                        if (onCallSaved) {
                          onCallSaved();
                        }
                      } else {
                        console.warn("⚠️ No CallSid available for saving call details");
                      }
                    } catch (error) {
                      console.error("❌ Error during cleanup or save:", error);
                    } finally {
                      setCallStatus("ended"); 
                    }
                  });

                  // Return cleanup function for component unmount
                  return () => {
                    cleanup();
                  };

                } catch (error) {
                  console.error('Error initializing audio processing:', error);
                }
              } else {
                console.error("No media stream available - Make sure media permissions are granted");
              }
            }, 1000);
          });
        }
      } catch (err) {
        console.error("Error initiating call:", err);
        setError('Failed to initiate call');
        onEnd();
      }
    };

    initiateCall();
  }, [phoneNumber, onEnd, agentId, provider]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callStatus === 'active') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    if (provider === 'qalqul' ? qalqulSDK : connection) {
      if (provider === 'qalqul') {
        manageMuteCall(calls[calls.length - 1]);
      } else {
        connection?.mute(!isMuted);
      }
      setIsMuted(!isMuted);
    }
  };

  const handleAudioToggle = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleEndCall = async () => {
    try {
      console.log("🔴 Manual call end initiated");
      
      // Mark call as ended in global component
      AIAssistantAPI.setCallEnded(true);
      
      // Stop video capture if exists
      if (localStream) {
        localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      // Close socket connection if exists
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Update call status
      setCallStatus('ended');

      // Handle provider-specific disconnection
      if (provider === 'qalqul') {
        if (calls.length > 0) {
          await manageHangupCall(calls[calls.length - 1]);
        }
      } else if (connection) {
        // The disconnect handler will handle cleanup and saving
        connection.disconnect();
      }
      
      // Close the interface
      onEnd();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      onEnd();
    }
  };

  // Initialize AI panel
  useEffect(() => {
    // Ensure AI panel is visible at start
    AIAssistantAPI.showPanel();
    AIAssistantAPI.setCallEnded(false);
    AIAssistantAPI.clearMessages();
  }, []);

  const processMarkdownResponse = (markdown: string): { content: string, category: 'suggestion' | 'alert' | 'info' | 'action', priority: 'high' | 'medium' | 'low' } => {
    // Extract the main content without markdown headers and formatting
    const content = markdown
      .replace(/^#+\s*.*?\n/gm, '')    // Remove headers
      .replace(/\*\*/g, '')            // Remove bold
      .replace(/\n+/g, ' ')            // Replace newlines with space
      .replace(/^\d+\.\s+/g, '')       // Remove numbered lists
      .replace(/^[-*]\s+/gm, '')       // Remove bullet points
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();

    // Skip pure sentiment analysis messages unless they contain actionable info
    if (content.toLowerCase().includes('customer sentiment') && 
        !content.toLowerCase().includes('suggest') && 
        !content.toLowerCase().includes('should') && 
        !content.toLowerCase().includes('please')) {
      return { content: '', category: 'info', priority: 'low' };
    }

    let category: 'suggestion' | 'alert' | 'info' | 'action' = 'info';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    const lowerContent = content.toLowerCase();

    // Improved categorization logic
    if (lowerContent.includes('warning') || lowerContent.includes('caution') || 
        lowerContent.includes('important') || lowerContent.includes('urgent')) {
      category = 'alert';
      priority = 'high';
    } else if (lowerContent.includes('please') || lowerContent.includes('need to') || 
               lowerContent.includes('should') || lowerContent.includes('must')) {
      category = 'action';
      priority = lowerContent.includes('immediately') ? 'high' : 'medium';
    } else if (lowerContent.includes('suggest') || lowerContent.includes('recommend') || 
               lowerContent.includes('might want to') || lowerContent.includes('consider')) {
      category = 'suggestion';
      priority = lowerContent.includes('strongly') ? 'medium' : 'low';
    }

    return { content, category, priority };
  };

  const handleTranscription = async (transcription: string) => {
    if (!transcription?.trim()) {
      console.log('❌ Empty transcription, skipping processing');
      return;
    }

    try {
      console.log('🎯 Sending transcription to AI assistant:', transcription);
      const apiUrl = `${import.meta.env.VITE_API_URL_CALL}/api/calls/ai-assist`;
      
      // Get current messages from global state for context
      const currentMessages = (window as any).AIAssistant.getMessages?.() || [];
      
      const payload = {
        transcription,
        callSid: callSid || 'unknown',
        isAgent: false,
        context: currentMessages.slice(-5).map((msg: AIAssistantMessage) => ({
          role: msg.role,
          content: msg.content,
          category: msg.category,
          priority: msg.priority,
          timestamp: msg.timestamp
        }))
      };

      const response = await axios.post(apiUrl, payload);
      console.log('📝 AI assistant response:', response.data);
      
      if (response.data?.suggestion) {
        const { content, category, priority } = processMarkdownResponse(response.data.suggestion);
        
        if (content.trim()) {
          const newMessage: AIAssistantMessage = {
            role: 'assistant',
            content,
            timestamp: new Date(),
            category,
            priority,
            isProcessed: false
          };

          console.log('🆕 Creating new AI message:', newMessage);
          
          // Add message directly to global state
          AIAssistantAPI.addMessage(newMessage);
          console.log('✅ Message added to global state');
        }
      }
    } catch (error) {
      console.error('🚨 Error processing transcription:', error);
    }
  };

  const hasEnoughSilence = () => {
    const now = Date.now();
    return now - lastSpeechTimestamp > SILENCE_TIMEOUT;
  };

  const processTranscriptionSegment = async (segment: string, isFinal: boolean) => {
    if (!segment?.trim()) return;

    if ((isFinal || hasEnoughSilence()) && !isProcessingTranscript) {
      console.log(`🎯 Processing transcript segment (${isFinal ? 'final' : 'silence'}):`);
      setIsProcessingTranscript(true);
      try {
        await handleTranscription(segment);
        setLastProcessedText(segment);
        setCurrentSpeechSegment('');
      } finally {
        setIsProcessingTranscript(false);
      }
    } else if (!isFinal) {
      // If not final and not enough silence, just update current segment
      setCurrentSpeechSegment(segment);
    }
  };

  const analyzeAudio = useCallback((dataArray: Float32Array) => {
    let rms = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = Math.abs(dataArray[i]);
      rms += amplitude * amplitude;
      peak = Math.max(peak, amplitude);
    }
    
    rms = Math.sqrt(rms / dataArray.length);
    const now = Date.now();
    const isActive = rms > SPEECH_THRESHOLD;
    
    if (isActive) {
      setLastSpeechTimestamp(now);
      if (!isSpeaking) {
        setIsSpeaking(true);
        console.log('🗣️ Speech started');
      }
    } else if (isSpeaking && hasEnoughSilence()) {
      setIsSpeaking(false);
      console.log('🤫 Speech ended - Processing transcript buffer');
      if (currentSpeechSegment && currentSpeechSegment.trim().length > 0) {
        processTranscriptionSegment(currentSpeechSegment, false);
      }
    }
    
    return { rms, peak, isActive };
  }, [isSpeaking, lastSpeechTimestamp, currentSpeechSegment]);

  let getCalls = async () => {
    console.log("getCalls en boucle");
    callManage = setInterval(async () => {
      if (!qalqulSDK) {
        console.error("SDK not initialized");
        clearInterval(callManage);
        return;
      }
      
      try {
        calls = await qalqulSDK.getCalls();
        console.log("calls exist ?", calls);
        console.log("start_timer_var:", start_timer_var);
        if (calls.length > 0) {
          if (calls[0].status == "CONNECTED" && start_timer_var == 0) {
            console.log("accepted call -> start timer");
            setCallStatus('active');
          }
          console.log("call status:", calls[0].status);
          if (calls[0].status === "TERMINATING") {
            console.log("Handle Terminating case:");
            clearInterval(callManage);
            callManage = undefined;
            clearInterval(intervalTimer);
            await setCallStatus('ended');
            console.log("terminated call -> ");
            qalqulSDK.logout();
          }
        } else {
          console.log("no calls");
        }
      } catch (error) {
        console.error("Error getting calls:", error);
      }
    }, 1000);
  };

  let initializeSdk = async () => {
    if (qalqulSDK) {
      console.log("qalqulSdk exists => logout qalqulSdk:", qalqulSDK);
      await qalqulSDK.logout();
    }

    qalqulSDK = new QalqulSDKWithTypes(io, settings1, callback);
    console.log("init qalqulSdk", qalqulSDK);
    try {
      await qalqulSDK.initialize();
      console.log("after init:", qalqulSDK);
      isSdkInitialized = true;
      await updateCallsState();
      return true;
    } catch (error) {
      console.log("Erreur dans l'initialisation du SDK : ", error);
      console.warn("Erreur dans l'initialisation du SDK. Veuillez réessayer plus tard");
      return false;
    }
  };

  let manageMuteCall = (call: any) => {
    if (provider === 'qalqul' && call) {
      call.isMuted() ? call.unMute() : call.mute();
      console.log("call after mute:", call);
    }
  };

  let manageOnHoldCall = (call: any) => {
    if (provider === 'qalqul' && call) {
      call.isOnHold() ? call.resume() : call.hold();
      console.log("call after onHold:", call);
    }
  };

  let manageHangupCall = async (call: any) => {
    console.log("call in hangup:", call);
    call.hangup();
    console.log("call terminated:", call);

    // Stop timers and loops associated with this call
    console.log("stop call timer");
    clearInterval(intervalTimer);

    console.log("stop loop to get calls states");
    clearInterval(callManage);
    callManage = undefined;

    // Post-call management will be handled by the callback function
    console.log("Hangup logic done. Waiting for callback to handle post-call actions.");
    await qalqulSDK?.logout();
    console.log("qalqulSDK logged out");
  };

  const storeQalqulCallInDbInStart = async (callUuid: string) => {
    console.log("storing call from qalqul in DB au lancement de l'appel:", callUuid);

    try {
      const storeCall = {
        call_id: callUuid,
        id_lead: "65d2b8f4e45a3c5a12e8f123",
        caller: agentId,
      };
      console.log("data call to store:", storeCall);
      const res = await callsApi.storeCallInDBAtStartCall(storeCall);
      console.log("result of storing call:", res);
      const storedCallId = res._id;
      console.log("id of callObject in DB:", storedCallId);
    } catch (error) {
      console.log("error in storing qalqul call in DB:", error);
    }
  };

  const setupSpeechRecognition = (audioContext: AudioContext) => {
    const langConfig = getLanguageFromPhoneNumber(phoneNumber);
    
    const config = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: audioContext.sampleRate,
        languageCode: langConfig.languageCode,
        enableAutomaticPunctuation: true,
        model: 'latest_long',
        useEnhanced: true,
        audioChannelCount: 1,
        enableWordConfidence: true,
        enableSpeakerDiarization: true,
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2
        },
        enableAutomaticLanguageIdentification: true,
        alternativeLanguageCodes: langConfig.alternativeLanguageCodes,
        interimResults: true,
        singleUtterance: false,
        enableVoiceActivityDetection: true,
        maxAlternatives: 3,
        profanityFilter: false,
        metadata: {
          interactionType: 'PHONE_CALL',
          industryNaicsCodeOfAudio: 518,
          originalMediaType: 'PHONE_CALL',
          recordingDeviceType: 'PHONE_LINE',
          microphoneDistance: 'NEARFIELD',
          originalMimeType: 'audio/x-raw',
          audioTopic: 'customer_service',
          speechContexts: [{
            phrases: [
              "yes", "no", "correct", "incorrect",
              "thank you", "please", "help", "support",
              "problem", "issue", "account", "service",
              "hello", "hi", "goodbye", "bye",
              "understand", "sorry", "excuse me",
              "can you", "would you", "I need",
              "I want", "could you"
            ],
            boost: 20
          }]
        }
      },
      interimResults: true
    };

    console.log('📝 Speech recognition configuration:', config);
    return config;
  };

  const setupAudioProcessing = async (audioContext: AudioContext, stream: MediaStream) => {
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    source.connect(analyzer);

    // Increase gain for better audio capture
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 2.0; // Increased from 1.5 to 2.0

    // Add a script processor node for raw audio data access
    const bufferSize = 4096;
    const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    source.connect(gainNode);
    gainNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // Create audio worklet
    await audioContext.audioWorklet.addModule('/audio-processor.js');
    const newAudioProcessor = new AudioWorkletNode(audioContext, 'audio-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      processorOptions: {
        sampleRate: audioContext.sampleRate
      }
    });

    return {
      source,
      analyzer,
      gainNode,
      processor: newAudioProcessor,
      scriptProcessor
    };
  };

  const setupWebSocket = (audioContext: AudioContext, audioComponents: any) => {
    const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
    console.log('Connecting to WebSocket URL:', wsUrl);
    const newWs = new WebSocket(wsUrl);
    
    newWs.onopen = async () => {
      console.log('🔌 WebSocket connection established for speech-to-text');
      
      try {
        const config = setupSpeechRecognition(audioContext);
        console.log('Sending recognition config:', config);
        newWs.send(JSON.stringify(config));

        // Set up audio processing pipeline
        audioComponents.scriptProcessor.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
          if (newWs.readyState === WebSocket.OPEN) {
            const inputBuffer = audioProcessingEvent.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Convert to 16-bit PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            try {
              // Send audio data in chunks
              const chunkSize = 2048;
              for (let i = 0; i < pcmData.length; i += chunkSize) {
                const chunk = pcmData.slice(i, i + chunkSize);
                newWs.send(chunk.buffer);
              }
            } catch (error) {
              console.error('Error sending audio data:', error);
            }
          }
        };

        // Set up audio worklet message handling
        audioComponents.processor.port.onmessage = (event: AudioWorkletMessage) => {
          if (newWs.readyState === WebSocket.OPEN) {
            try {
              const audioData = event.data;
              if (audioData instanceof ArrayBuffer) {
                newWs.send(audioData);
              }
            } catch (error) {
              console.error('Error processing audio worklet data:', error);
            }
          }
        };

        // Send a test audio packet
        const testAudio = new Int16Array(1024).fill(0);
        newWs.send(testAudio.buffer);
        
      } catch (error) {
        console.error('Error during WebSocket setup:', error);
      }
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newWs.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      // Try to reconnect if closed unexpectedly
      if (event.code !== 1000) {
        console.log('Attempting to reconnect...');
        setTimeout(() => setupWebSocket(audioContext, audioComponents), 2000);
      }
    };

    return newWs;
  };

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="text-xl font-semibold mb-2">{phoneNumber}</div>
        <div className="text-gray-500">{formatDuration(duration)}</div>
        {callStatus === 'initiating' && (
          <div className="text-blue-600">Initiating call...</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleMuteToggle}
          className={`p-4 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6 mx-auto" /> : <Mic className="w-6 h-6 mx-auto" />}
        </button>
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 text-white"
        >
          <Phone className="w-6 h-6 mx-auto transform rotate-135" />
        </button>
        <button
          onClick={handleAudioToggle}
          className={`p-4 rounded-full ${!isAudioEnabled ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
        >
          {isAudioEnabled ? (
            <Volume2 className="w-6 h-6 mx-auto" />
          ) : (
            <VolumeX className="w-6 h-6 mx-auto" />
          )}
        </button>
      </div>

      <div className="text-sm text-gray-500">
        {callStatus === 'active' ? 'Call in progress...' : 'Connecting...'}
      </div>
    </div>
  );
}