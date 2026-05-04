import React from 'react';
import { useState, useEffect } from 'react';
import { 
  Phone,
  Calendar,
  Brain,
  PhoneOutgoing,
  Info,
  Shield,
  Zap,
  PlayCircle,
  RefreshCw,
  X,
  MessageSquare,
  Star,
  Globe,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/client';

export interface CallRecord {
  _id: string;
  call_id?: string;
  agent: string;
  lead?: Lead;
  sid?: string;
  parentCallSid?: string | null;
  direction: 'inbound' | 'outbound-dial';
  provider?: 'twilio';
  startTime: Date;
  endTime?: Date | null;
  status: string;
  duration: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  ai_call_score?: {
    'Agent fluency': {
      score: number;
      feedback: string;
    };
    'Sentiment analysis': {
      score: number;
      feedback: string;
    };
    'Fraud detection': {
      score: number;
      feedback: string;
    };
    overall: {
      score: number;
      feedback: string;
    };
  };
  childCalls?: string[];
  from?: string;
  to?: string;
  transcript?: {
    speaker: string;
    text: string;
    timestamp?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}


interface Lead {
  _id: string;
  name?: string;
  First_Name?: string;
  Last_Name?: string;
  company?: string;
  Deal_Name?: string;
  email?: string;
  Email_1?: string;
  phone?: string;
  Phone?: string;
  gigId?: {
    _id: string;
    title: string;
  };
  status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value?: number;
  probability?: number;
  source?: string;
  assignedTo?: string;
  lastContact?: Date;
  nextAction?: 'call' | 'email' | 'meeting' | 'follow-up';
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecordsProps {
  gigId?: string;
  leadId?: string;
}

export function CallRecords({ gigId, leadId }: CallRecordsProps) {
  const navigate = useNavigate();
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);

  const fetchCallRecords = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      if (!agentId) throw new Error('Agent ID not found');

      const response = await api.calls.getByAgentId(agentId);
      
      if (response && response.success && Array.isArray(response.data)) {
        setCallRecords(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch call records');
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call records');
      setLoading(false);
    }
  };

  const handleAnalyzeCall = async (callId: string) => {
    try {
      setAnalyzingCallId(callId);
      const response = await api.calls.analyze(callId);
      if (response.success) {
        if (selectedCall && (selectedCall._id === callId || (selectedCall as any).$oid === callId)) {
          setSelectedCall({ 
            ...selectedCall, 
            ai_call_score: response.data,
            transcript: response.transcript || selectedCall.transcript 
          });
        }
        fetchCallRecords();
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  useEffect(() => {
    fetchCallRecords();
  }, [gigId, leadId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-harx-600"></div>
      </div>
    );
  }

  const openCallDetails = (call: CallRecord, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">Call Records</h2>
        <button
          onClick={fetchCallRecords}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          {callRecords.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">No calls found</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                Start making calls from your workspace to see your history and AI performance insights here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {callRecords.map((record: CallRecord) => {
                const callId = typeof record._id === 'object' ? (record._id as any).$oid : record._id;
                return (
                  <div 
                    key={callId} 
                    className="p-6 hover:bg-slate-50/50 transition-all duration-300 group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          record.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <Phone className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight">
                            {record.lead?.First_Name ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim() : 
                             record.lead?.name || record.to || record.from || 'Unknown Customer'}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {new Date(record.startTime || record.createdAt).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              record.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {record.direction}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {record.ai_call_score?.overall?.score !== undefined && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span className="text-xs font-black">{record.ai_call_score.overall.score}%</span>
                          </div>
                        )}
                        
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          record.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {record.status}
                        </span>

                        <div className="flex items-center gap-2 ml-2">
                          <button 
                            onClick={() => openCallDetails(record, 'transcript')}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all"
                            title="Transcript"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => openCallDetails(record, 'insights')}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                            title="AI Insights"
                          >
                            <Activity className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Modal Detail View */}
      {selectedCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSelectedCall(null)}></div>
          
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20">
                  <Phone className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                    {selectedCall.lead?.First_Name ? `${selectedCall.lead.First_Name} ${selectedCall.lead.Last_Name || ''}`.trim() : 'Call Details'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {new Date(selectedCall.startTime || selectedCall.createdAt).toLocaleString()} • {selectedCall.duration ? `${Math.floor(selectedCall.duration/60)}m ${selectedCall.duration%60}s` : '0s'}
                  </p>
                </div>
              </div>

              <div className="flex-1 max-w-md mx-4">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <audio controls src={finalUrl} className="h-10 w-full" />;
                })()}
              </div>

              <button 
                onClick={() => setSelectedCall(null)}
                className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-100 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-4">
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Transcript
              </button>
              <button 
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <Activity className="w-4 h-4" />
                AI Insights
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar">
              {activeTab === 'transcript' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((t, i) => (
                      <div key={i} className={`flex gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex flex-col max-w-[75%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                            <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                          </div>
                          <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${
                            t.speaker?.toLowerCase().includes('agent') 
                              ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm' 
                              : 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                          }`}>
                            {t.text}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available</p>
                      {!selectedCall.ai_call_score && selectedCall.recording_url_cloudinary && (
                         <button 
                            onClick={() => handleAnalyzeCall(selectedCall._id)}
                            className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg"
                         >
                            <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                            Analyze & Transcribe
                         </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { label: 'Agent Fluency', data: selectedCall.ai_call_score?.["Agent fluency"], color: 'blue', icon: Globe },
                      { label: 'Sentiment Analysis', data: selectedCall.ai_call_score?.["Sentiment analysis"], color: 'indigo', icon: Activity },
                      { label: 'Fraud Detection', data: selectedCall.ai_call_score?.["Fraud detection"], color: 'rose', icon: Shield }
                    ].map((metric, mIdx) => (
                      <div key={mIdx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600 flex items-center justify-center`}>
                            <metric.icon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-black text-${metric.color}-600`}>{metric.data?.score || 0}%</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score</p>
                          </div>
                        </div>
                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">{metric.label}</h5>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                          &quot;{metric.data?.feedback || 'Analysis completed.'}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-white rounded-[32px] border border-emerald-100 shadow-xl p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Star className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Executive Summary</h4>
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Overall AI Evaluation</p>
                        </div>
                      </div>
                      <div className="bg-emerald-50/50 rounded-2xl p-8 border border-emerald-100/50">
                        <p className="text-lg font-bold text-emerald-900 leading-relaxed italic">
                          &quot;{selectedCall.ai_call_score?.overall?.feedback || 'Analysis results pending.'}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedCall(null)}
                className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
