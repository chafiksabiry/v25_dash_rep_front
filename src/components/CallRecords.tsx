import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Clock, Download, PhoneOutgoing, Info, Brain, X, User, ExternalLink, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/client';

interface CallRecord {
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
  gigId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecordsProps {
  gigId?: string;
  leadId?: string;
}

export function CallRecords({ gigId, leadId }: CallRecordsProps) {
  console.log('📞 Call Records component initializing');
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📞 Call Records component mounted - fetching call records');
    const fetchCallRecords = async () => {
      try {
        const agentId = localStorage.getItem('agentId');
        if (!agentId) {
          console.error('❌ Agent ID not found in localStorage');
          throw new Error('Agent ID not found');
        }

        console.log(`🔍 Fetching call records for agent ID: ${agentId}`);
        const response = await api.calls.getByAgentId(agentId);
        console.log("📞 Call records response type:", typeof response);
        
        if (response && response.success && Array.isArray(response.data)) {
          console.log(`✅ Successfully retrieved ${response.data.length} call records`);
          
          let filteredCalls = response.data;
          
          if (gigId) {
            filteredCalls = filteredCalls.filter((call: any) => {
              // Priority 1: Direct gigId on call
              if (call.gigId === gigId || call.gig === gigId) return true;
              
              // Priority 2: GigId on lead object
              const leadGigId = call.lead?.gigId || call.lead?.gig;
              const leadGigIdStr = typeof leadGigId === 'object' ? (leadGigId._id || leadGigId.$oid) : (leadGigId || '');
              
              return leadGigIdStr === gigId;
            });
          }
          
          if (leadId) {
            console.log(`🎯 Filtering by Lead ID: ${leadId}`);
            filteredCalls = filteredCalls.filter((call: any) => 
              call.lead?._id === leadId || call.leadId === leadId || call.lead === leadId
            );
          }

          setCallRecords(filteredCalls);
          if (filteredCalls.length === 0) {
            console.log('⚠️ No call records found after filtering');
          }
        } else {
          console.error('❌ API returned error:', response.message);
          throw new Error(response.message || 'Failed to fetch call records');
        }
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching call records:', err);
        setError(err.message || 'Failed to fetch call records');
        setLoading(false);
      }
    };

    fetchCallRecords();
  }, [gigId, leadId]);


  if (loading) {
    console.log('⏳ Call Records component is in loading state');
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading call records...</div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Call Records component has error:', error);
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  console.log(`🖥️ Rendering Call Records component with ${callRecords.length} records`);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Call Records & Quality Assurance</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className="px-4 py-2 font-black uppercase text-[10px] tracking-widest text-harx-600 border-b-2 border-harx-600"
        >
          Recent Calls
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
          {callRecords.length === 0 ? (
            <div className="flex flex-col justify-center items-center p-12">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <Phone className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-700">No calls found</p>
              <p className="text-sm text-gray-500 mt-2 mb-6 text-center max-w-md">
                There are no call records available for this agent. Start making calls to see your call history.
              </p>
              <button 
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => console.log('Start new call clicked')}
              >
                <PhoneOutgoing className="w-4 h-4" />
                <span>Start New Call</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {callRecords.map((record: CallRecord) => (
                <div 
                  key={record._id} 
                  onClick={() => setSelectedCall(record)}
                  className="p-6 hover:bg-gray-50 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex justify-between">
                    {/* Left side - Call info */}
                    <div className="flex items-start space-x-4">
                      <div className={`relative p-3 rounded-xl ${
                        record.direction === 'inbound' 
                          ? 'bg-gradient-to-br from-blue-50 to-blue-100' 
                          : 'bg-gradient-to-br from-green-50 to-green-100'
                      }`}>
                        <Phone className={`w-6 h-6 ${
                          record.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {record.lead?.First_Name ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim() : 
                             record.lead?.name || record.to || record.from || 'Unknown Customer'}
                          </h3>
                          {(record.lead?.company || record.lead?.Deal_Name || (record.lead && !record.lead.name && !record.lead.First_Name)) && (
                            <span className="text-sm text-gray-500">
                              • {record.lead?.company || record.lead?.Deal_Name || 'Lead'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 space-y-2.5">
                          {(record.lead?.Phone || record.lead?.phone || record.to || record.from) && (
                            <p className="flex items-center">
                              <Phone className="w-4 h-4 mr-1.5" />
                              {record.lead?.Phone || record.lead?.phone || record.to || record.from}
                            </p>
                          )}
                          <p className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5" />
                            {new Date(record.startTime).toLocaleString()}
                            {record.duration && (
                              <span className="ml-2">
                                • {Math.floor(record.duration / 60)}:{String(record.duration % 60).padStart(2, '0')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Status and actions */}
                    <div className="flex items-start space-x-3">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        record.status === 'completed' ? 'bg-green-100 text-green-700' :
                        record.status === 'missed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                      
                      {record.ai_call_score?.overall?.score !== undefined && record.ai_call_score?.overall?.score !== null && (
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full">
                          <Brain className="w-4 h-4" />
                          <span className="font-medium">{record.ai_call_score.overall.score}%</span>
                        </div>
                      )}

                      <button 
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        onClick={() => {
                          console.log('Navigating to call report for call:', record._id);
                          navigate(`/call-report`, { state: { call: record } });
                        }}
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Additional info row */}
                  <div className="mt-4 flex items-center space-x-3 text-sm text-gray-500">
                    {record.provider && (
                      <span className="px-2 py-1 bg-gray-50 rounded-md">
                        via {record.provider}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      {/* Call Detail Modal */}
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedCall(null)}
          ></div>
          <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col">
            <div className="relative h-32 bg-gradient-harx p-8 flex items-end justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10 flex items-center gap-4 text-white">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">
                    {selectedCall.lead?.First_Name ? `${selectedCall.lead.First_Name} ${selectedCall.lead.Last_Name || ''}` : selectedCall.lead?.name || 'Customer'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setSelectedCall(null)} className="relative z-10 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-white transition-all duration-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {selectedCall.ai_call_score && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl text-center">
                    <Brain className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Sentiment</div>
                    <div className="text-3xl font-black text-emerald-700">{selectedCall.ai_call_score['Sentiment analysis']?.score || 0}/10</div>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-3xl text-center">
                    <PlayCircle className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                    <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">Fluency</div>
                    <div className="text-3xl font-black text-indigo-700">{selectedCall.ai_call_score['Agent fluency']?.score || 0}/10</div>
                  </div>
                </div>
              )}
              {(selectedCall.recording_url || selectedCall.recording_url_cloudinary) && (
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <audio controls src={selectedCall.recording_url_cloudinary || selectedCall.recording_url} className="w-full" />
                </div>
              )}

              {/* Technical Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Info className="w-4 h-4 text-harx-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Technical Details</span>
                </div>
                
                <div className="bg-gray-50/50 rounded-3xl border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Call ID</span>
                    <span className="text-xs font-mono text-gray-600 break-all">
                      {(selectedCall._id as any).$oid || selectedCall._id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">SID</span>
                    <span className="text-xs font-mono text-gray-600 break-all">{selectedCall.sid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Direction</span>
                    <span className="text-xs font-bold text-gray-700 uppercase">{selectedCall.direction}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Duration</span>
                    <span className="text-xs font-bold text-gray-700">{selectedCall.duration}s</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">From</span>
                    <span className="text-xs font-bold text-gray-700">{selectedCall.from || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">To</span>
                    <span className="text-xs font-bold text-gray-700">{selectedCall.to || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Provider</span>
                    <span className="text-xs font-bold text-gray-700 uppercase">{selectedCall.provider || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Status</span>
                    <span className="text-xs font-bold text-emerald-600 uppercase italic">{selectedCall.status}</span>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Created At</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date((selectedCall.createdAt as any).$date || selectedCall.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Updated At</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date((selectedCall.updatedAt as any).$date || selectedCall.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}