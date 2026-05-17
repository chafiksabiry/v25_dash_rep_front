import React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Calendar,
  Brain,
  PhoneOutgoing,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  PlayCircle,
  RefreshCw,
  X,
  Check,
  MessageSquare,
  Star,
  Globe,
  Download,
  TrendingUp,
  Activity as ActivityIcon,
  BookOpen,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/client';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';

export interface CallRecord {
  repCallCommission: undefined;
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
  price?: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  transactionOccurred?: boolean | null;
  transaction?: {
    repTransactionCommission: undefined;
    _id?: string;
    validByAI?: boolean;
    validByCompany?: boolean;
    updatedAt?: string;
    valid?: boolean | null;
  } | null;
  validByAI?: boolean | null;
  valid?: boolean | null;
  argumentation_score?: number;
  ai_call_score?: {
    'Agent fluency': { score: number; feedback: string };
    'Sentiment analysis': { score: number; feedback: string };
    'Fraud detection': { score: number; feedback: string };
    'Script coherence': { score: number; feedback: string };
    'Argumentation': { score: number; feedback: string };
    overall: { score: number; feedback: string };
    transaction_detected?: boolean;
    refusal_detected?: boolean;
  };
  agentValidation?: string;
  companyValidation?: string;
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
    commission?: {
      commission_per_call?: number;
      transactionCommission?: number;
    };
    rewardPerCall?: number;
    rewardPerSale?: number;
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
  callValidationFilter?: 'all' | 'approved' | 'pending';
  transactionValidationFilter?: 'all' | 'approved' | 'refused' | 'pending';
}

export function CallRecords({ gigId, leadId, callValidationFilter = 'all', transactionValidationFilter = 'all' }: CallRecordsProps) {
  const { t } = useTranslation();
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
            transcript: response.transcript || selectedCall.transcript,
            validByAI: response.validByAI,
            valid: response.validByAI,
            argumentation_score: response.data?.Argumentation?.score
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


  const openCallDetails = (call: CallRecord, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  };

  const filteredRecords = callRecords.filter(record => {
    if (leadId && record.lead?._id !== leadId) return false;
    if (gigId) {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object'
        ? (recordGig?._id || (recordGig as any)?.$oid)
        : recordGig;
      if (idStr !== gigId) return false;
    }

    // Call Validation Filter
    if (callValidationFilter === 'approved' && record.companyValidation !== 'approved') return false;
    if (callValidationFilter === 'pending' && record.companyValidation === 'approved') return false;

    // Transaction Validation Filter
    if (transactionValidationFilter === 'approved' && record.transaction?.validByCompany !== true) return false;
    if (transactionValidationFilter === 'refused' && record.transaction?.validByCompany !== false) return false;
    if (transactionValidationFilter === 'pending' && record.transaction?.validByCompany !== null) return false;

    return true;
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('calls.recordsTitle')}</h2>
        <button
          onClick={fetchCallRecords}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('calls.refresh')}</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse pb-6 border-b border-slate-50 last:border-none last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded-md w-36"></div>
                    <div className="flex gap-2">
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-md w-28 mt-1"></div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center p-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{t('calls.noCalls')}</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              {t('calls.noCallsDetail')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredRecords.map((record: CallRecord) => {
              const callId = typeof record._id === 'object' ? (record._id as any).$oid : record._id;
              return (
                <div
                  key={callId}
                  className="p-6 hover:bg-slate-50/50 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${record.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm tracking-tight">
                          {record.lead?.First_Name ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim() :
                            record.lead?.name || record.to || record.from || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                            {record.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${record.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {record.direction}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                            Durée: {Math.floor((record.duration || 0) / 60)}m {(record.duration || 0) % 60}s
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400/90 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span>{new Date(record.startTime || record.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span>ID: {typeof record._id === 'object' ? (record._id as any).$oid : record._id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      {record.ai_call_score?.overall?.score !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-xs font-black">{record.ai_call_score.overall.score}%</span>
                        </div>
                      )}

                      {record.status?.toLowerCase() === 'completed' ? (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          {/* Validation de l'Appel AI */}
                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Appel (Validation AI)</span>
                            {record.validByAI === true || record.valid === true ? (
                              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-36 whitespace-nowrap">
                                <Check className="w-3.5 h-3.5" />
                                Validé par AI (+{(record.repCallCommission !== undefined ? record.repCallCommission : (record.lead?.gigId?.commission?.commission_per_call || record.lead?.gigId?.rewardPerCall || 4) * 0.7).toFixed(2)}€)
                              </span>
                            ) : record.validByAI === false ? (
                              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                <X className="w-3.5 h-3.5" />
                                Refusé AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-200/40 shadow-sm w-32 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                Analyse en cours
                              </span>
                            )}
                          </div>

                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>

                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Transaction AI</span>
                            {record.transaction?.validByCompany === true ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-sm w-36 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Signé (+{(record.transaction?.repTransactionCommission !== undefined ? record.transaction.repTransactionCommission : (record.lead?.gigId?.commission?.transactionCommission || record.lead?.gigId?.rewardPerSale || 30) * 0.7).toFixed(2)}€)
                                </span>
                              </div>
                            ) : (record.validByAI === null || record.validByAI === undefined) ? (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            ) : record.transaction?.validByAI === true ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-200/40 shadow-sm w-44 whitespace-nowrap text-center cursor-help" title="Analyse IA positive, en attente de validation finale par l'entreprise">
                                  <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                  Wait for Company Validation
                                </span>
                                {record.argumentation_score !== undefined && (
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Score: {record.argumentation_score}%</span>
                                )}
                              </div>
                            ) : record.transaction?.validByAI === false ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé AI
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => openCallDetails(record, 'insights')}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                          title="View Details"
                        >
                          <Brain className="w-5 h-5" />
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
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedCall(null)}></div>

          <div className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-harx text-white flex items-center justify-center shadow-xl shadow-harx-500/20">
                  <Phone className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
                    {selectedCall.lead?.First_Name ? `${selectedCall.lead.First_Name} ${selectedCall.lead.Last_Name || ''}`.trim() : 'Call Details'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {new Date(selectedCall.startTime || selectedCall.createdAt).toLocaleString()} • {selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}m ${selectedCall.duration % 60}s` : '0s'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 opacity-60">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                      Call ID: {typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id}
                    </span>
                    {selectedCall.transaction?._id && (
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                        Tx ID: {selectedCall.transaction._id}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Appel (Validation AI)</span>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedCall.validByAI === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        selectedCall.validByAI === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                        {selectedCall.validByAI === true ? `Validé par AI (+${(selectedCall.lead?.gigId?.commission?.commission_per_call || selectedCall.lead?.gigId?.rewardPerCall || 4).toFixed(2)}€)` :
                          selectedCall.validByAI === false ? 'Refusé AI' :
                            'Analyse en cours'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vente (Statut AI)</span>
                      {(selectedCall.validByAI === null || selectedCall.validByAI === undefined) ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm w-32">
                          <Clock className="w-3.5 h-3.5" />
                          En attente
                        </span>
                      ) : selectedCall.transaction?.validByAI === true ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-44 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          Wait for Company Validation
                        </span>
                      ) : selectedCall.transaction?.validByAI === false ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32">
                          <X className="w-3.5 h-3.5" />
                          Refusé AI
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm w-32">
                          <Clock className="w-3.5 h-3.5" />
                          Aucune vente
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Validation Finale</span>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedCall.transaction?.validByCompany === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        selectedCall.transaction?.validByCompany === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                        {selectedCall.transaction?.validByCompany === true ? `Validé (+${(selectedCall.transaction?.repTransactionCommission !== undefined ? selectedCall.transaction.repTransactionCommission : (selectedCall.lead?.gigId?.commission?.transactionCommission || selectedCall.lead?.gigId?.rewardPerSale || 30) * 0.7).toFixed(2)}€)` :
                          selectedCall.transaction?.validByCompany === false ? 'Refusé' :
                            'En attente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-lg">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <PremiumAudioPlayer url={finalUrl} />;
                })()}
              </div>

              <div className="flex items-center gap-3">

                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl border border-slate-100 transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-4">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <MessageSquare className="w-4 h-4" />
                {t('calls.transcript')}
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <ActivityIcon className="w-4 h-4" />
                {t('calls.aiInsights')}
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
                          <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${t.speaker?.toLowerCase().includes('agent')
                            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                            : 'bg-gradient-harx text-white rounded-tr-none shadow-lg shadow-harx-500/20'
                            }`}>
                            {t.text}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available</p>
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={analyzingCallId === selectedCall._id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-10 pb-4">
                  {(!selectedCall.ai_call_score || !selectedCall.ai_call_score.overall?.score) ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No analysis available for this call</p>
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={analyzingCallId === selectedCall._id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Executive Summary Section - Now at the Top */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white rounded-[40px] border border-emerald-100/50 shadow-2xl shadow-emerald-500/5 p-10 overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>

                          <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                  <Star className="w-8 h-8" />
                                </div>
                                <div>
                                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{t('calls.executiveSummary')}</h4>
                                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1 opacity-80">Audit Global de Performance</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 bg-slate-50/80 px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Score Global</p>
                                  <div className="text-4xl font-black text-slate-900 leading-none">
                                    {selectedCall.ai_call_score?.overall?.score || 0}<span className="text-xl text-slate-400">%</span>
                                  </div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                  <TrendingUp className={`w-6 h-6 ${(selectedCall.ai_call_score?.overall?.score || 0) >= 70 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[32px] p-8 border border-slate-100 shadow-inner">
                              <p className="text-xl font-bold text-slate-800 leading-relaxed italic relative">
                                <span className="absolute -left-4 -top-4 text-emerald-200 text-6xl font-serif opacity-50">&quot;</span>
                                {selectedCall.ai_call_score?.overall?.feedback || 'Analyse en cours...'}
                                <span className="text-emerald-200 text-6xl font-serif opacity-50 ml-1 leading-none align-bottom">&quot;</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Metrics Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4">
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('calls.detailedAnalysis')}</h5>
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { label: 'Agent Fluency', key: "Agent fluency", icon: Globe, color: 'emerald' },
                            { label: 'Sentiment Analysis', key: "Sentiment analysis", icon: ActivityIcon, color: 'blue' },
                            { label: 'Fraud Detection', key: "Fraud detection", icon: ShieldAlert, color: 'rose' },
                            { label: 'Script Coherence', key: "Script coherence", icon: ShieldCheck, color: 'indigo' },
                            { label: 'Argumentation Quality', key: "Argumentation", icon: TrendingUp, color: 'amber' },
                            { label: 'Script Adherence', key: "Script adherence", icon: BookOpen, color: 'violet' }
                          ].map((metric, mIdx) => {
                            const metricData = selectedCall.ai_call_score?.[metric.key];
                            if (!metricData && metric.key === "Script adherence") return null;
                            const score = metricData?.score || 0;
                            const scoreColorClass = score >= 80 ? 'text-emerald-600 bg-emerald-50' :
                              score >= 50 ? 'text-amber-600 bg-amber-50' :
                                'text-rose-600 bg-rose-50';

                            return (
                              <div key={mIdx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500 flex flex-col h-full group">
                                <div className="flex justify-between items-start mb-8">
                                  <div className={`w-14 h-14 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                                    <metric.icon className="w-7 h-7" />
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <div className={`px-4 py-2 rounded-2xl text-xl font-black shadow-sm border border-transparent ${scoreColorClass}`}>
                                      {score}%
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Score de qualité</p>
                                  </div>
                                </div>

                                <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <span className={`w-1.5 h-4 bg-${metric.color}-500 rounded-full`}></span>
                                  {metric.label}
                                </h5>

                                <div className="flex-1">
                                  <div className="text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-2xl p-5 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all">
                                    {metricData?.feedback?.split('"').map((part, i) =>
                                      i % 2 === 1 ? (
                                        <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b-2 border-amber-200 italic">&quot;{part}&quot;</span>
                                      ) : part
                                    ) || 'Analyse détaillée indisponible.'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
              >
                {t('calls.closeDetails')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
