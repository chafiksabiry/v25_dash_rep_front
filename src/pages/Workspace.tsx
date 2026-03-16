import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Phone, Mail, MessageSquare, Globe, Clock, User, Mic, Video,
  Send, Paperclip, Image, Smile, MoreHorizontal, List, Filter,
  PhoneIncoming, AlertCircle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';
import { AIService } from '../services/ai';
import { CallInterface } from '../components/CallInterface';
import { useAuth } from '../contexts/AuthContext';
import { GlobalAIAssistant } from '../components/GlobalAIAssistant';
import { Skeleton } from '../components/ui/Skeleton';

interface Interaction {
  id: number;
  customer: string;
  type: string;
  status: string;
  priority: string;
  waitTime: string;
  issue: string;
  channel: string;
}

interface Lead {
  _id?: string;
  id: string;
  Deal_Name: string;
  Telephony: string;
  Email_1: string;
  Stage: string;
  Created_Time: string;
  Owner: {
    name: string;
    id: string;
    email: string;
  };
}

interface EnrolledGig {
  _id: string;
  title: string;
}

interface APIResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Lead[];
}

export function Workspace() {
  const location = useLocation();
  const gigId = location.state?.gigId;
  const [activeTab, setActiveTab] = useState('voice');
  const [message, setMessage] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [enrolledGigs, setEnrolledGigs] = useState<EnrolledGig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>(gigId || '');
  const aiService = new AIService();
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchEnrolledGigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'voice') {
      fetchLeads(currentPage);
    }
  }, [activeTab, selectedGigId, currentPage]);

  const fetchEnrolledGigs = async () => {
    const agentId = localStorage.getItem('agentId');
    const token = localStorage.getItem('token');
    if (!agentId || !token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const profileData = await response.json();
        if (profileData.gigs && Array.isArray(profileData.gigs)) {
          // Filter enrolled gigs and fetch their details or use what's available
          // For now, let's assume we might need to fetch titles if not in profile
          // But usually, profile might have some gig info or we can fetch from Gigs API
          const enrolled = profileData.gigs
            .filter((g: any) => g.status === 'enrolled')
            .map((g: any) => {
              const gigInfo = g.gigId;
              const id = typeof gigInfo === 'object' ? (gigInfo._id || gigInfo.$oid) : gigInfo;
              const title = typeof gigInfo === 'object' && gigInfo.title ? gigInfo.title : (g.gigTitle || `Gig ${id}`);
              return { _id: id, title };
            });

          setEnrolledGigs(enrolled);

          // If no gigId from location, pick the first enrolled one
          if (!selectedGigId && enrolled.length > 0) {
            setSelectedGigId(enrolled[0]._id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching enrolled gigs:', error);
    }
  };

  const fetchLeads = async (page: number = 1) => {
    const activeGigId = selectedGigId || gigId;
    console.log("🔍 Workspace: fetching leads", { activeGigId, page });
    const baseUrl = (import.meta.env.VITE_DASHBOARD_COMPANY_API_URL || 'https://v25dashboardbackend-production.up.railway.app/api').replace(/\/$/, '');
    const userId = localStorage.getItem('agentId') || '682b590b4d60b1ff380973c2';
    const limit = 50;

    let url = `${baseUrl}/leads/user/${userId}?page=${page}&limit=${limit}`;

    if (activeGigId) {
      url = `${baseUrl}/leads/gig/${activeGigId}?page=${page}&limit=${limit}`;
    }

    try {
      setIsLoadingLeads(true);
      console.log(`📡 Attempting fetch to: ${url}`);

      // Simplified fetch without complex headers to test CORS
      const response = await fetch(url);
      console.log("📡 Fetch response status:", response.status, response.statusText);

      const responseData: APIResponse = await response.json();
      console.log("✅ Leads data received:", responseData);

      if (responseData.success && Array.isArray(responseData.data)) {
        setLeads(responseData.data);
        if (responseData.totalPages) {
          setTotalPages(responseData.totalPages);
        }
      } else {
        setLeads([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching leads (detailed):', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        url
      });
      setLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleAISuggestion = (suggestion: string) => {
    setMessage(suggestion);
  };

  useEffect(() => {
    if (selectedInteraction?.issue) {
      aiService.suggestQuickResponses(selectedInteraction.issue)
        .then(suggestions => setAiSuggestions(suggestions));

      aiService.analyzeSentiment(selectedInteraction.issue)
        .then(result => setSentiment(result));
    }
  }, [selectedInteraction]);

  const workspaceTools = [
    { id: 'queue', label: 'Queue', icon: List },
    { id: 'voice', label: 'Voice Call', icon: Phone },
    { id: 'video', label: 'Video Call', icon: Video },
    { id: 'email', label: 'Email Support', icon: Mail },
    { id: 'chat', label: 'Live Chat', icon: MessageSquare },
    { id: 'social', label: 'Social Media', icon: Globe },
  ];

  const queueItems = [
    {
      id: 1,
      customer: 'Sarah Wilson',
      type: 'call',
      status: 'waiting',
      priority: 'High',
      waitTime: '2 minutes',
      issue: 'Product Configuration',
      channel: 'Phone Support',
    },
    {
      id: 2,
      customer: 'John Doe',
      type: 'email',
      status: 'new',
      priority: 'Medium',
      waitTime: '15 minutes',
      issue: 'Billing Question',
      channel: 'Email Support',
    },
    {
      id: 3,
      customer: 'Emily Brown',
      type: 'chat',
      status: 'waiting',
      priority: 'Low',
      waitTime: '5 minutes',
      issue: 'Account Access',
      channel: 'Live Chat',
    },
  ];

  const renderQueue = () => (
    <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Interaction Queue</h2>
          <span className="bg-harx-50 text-harx-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-harx-100">
            {queueItems.length} Pending
          </span>
        </div>
        <div className="flex space-x-2">
          <button className="p-2.5 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all">
            <Filter className="w-5 h-5" />
          </button>
          <select className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all">
            <option>All Types</option>
            <option>Calls</option>
            <option>Emails</option>
            <option>Chats</option>
          </select>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-100 rounded-2xl p-5 hover:bg-harx-50/30 hover:border-harx-100 transition-all cursor-pointer group hover:shadow-lg hover:shadow-harx-500/5"
              onClick={() => {
                setSelectedInteraction(item);
                setActiveTab(item.type);
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl transition-colors ${item.type === 'call' ? 'bg-emerald-50 text-emerald-600' :
                    item.type === 'email' ? 'bg-harx-50 text-harx-600' :
                      item.type === 'chat' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                    {item.type === 'call' ? <PhoneIncoming className="w-5 h-5" /> :
                      item.type === 'email' ? <Mail className="w-5 h-5" /> :
                        item.type === 'chat' ? <MessageSquare className="w-5 h-5" /> :
                          <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 group-hover:text-harx-600 transition-colors uppercase text-sm tracking-tight">{item.customer}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.channel}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${item.priority === 'High' ? 'bg-harx-50 text-harx-600 border border-harx-100' :
                  item.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                  {item.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Wait: {item.waitTime}</span>
                </div>
                <div className="flex space-x-3">
                  <button className="px-5 py-2 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                    Accept
                  </button>
                  <button className="px-5 py-2 bg-white text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 border border-gray-100 transition-all">
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-3xl">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-gray-500">Avg. Wait: <span className="text-gray-900">8m</span></span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" />
              <span className="text-gray-500">Completed: <span className="text-gray-900">45</span></span>
            </div>
          </div>
          <div className="flex items-center">
            <XCircle className="w-4 h-4 text-harx-500 mr-2" />
            <span className="text-gray-500">Missed: <span className="text-gray-900">3</span></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWorkspace = () => {
    switch (activeTab) {
      case 'queue':
        return renderQueue();
      case 'voice':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl p-8 flex flex-col shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
              <div className="flex flex-col">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Leads</h2>
                {enrolledGigs.length > 0 && (
                  <div className="mt-3">
                    <select
                      value={selectedGigId}
                      onChange={(e) => {
                        setSelectedGigId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all shadow-sm"
                    >
                      <option value="">All My Leads</option>
                      {enrolledGigs.map(g => (
                        <option key={g._id} value={g._id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button className="p-3 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-harx-600 hover:bg-harx-50 transition-all shadow-sm">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-harx-500 hover:bg-harx-50 transition-all shadow-sm">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Leads</h3>
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    {leads.length} Leads
                  </span>
                </div>
                {isLoadingLeads ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl p-5 flex justify-between items-center bg-white/50 animate-pulse">
                        <div className="space-y-3 flex-1">
                          <Skeleton className="h-5 w-1/3" variant="rounded" />
                          <div className="flex gap-4">
                            <Skeleton className="h-3 w-24" variant="rounded" />
                            <Skeleton className="h-3 w-32" variant="rounded" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Skeleton className="h-6 w-16" variant="rounded" />
                          <Skeleton className="h-10 w-24" variant="rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-medium">No leads found {gigId ? "for this gig" : "for your account"}.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {leads.map((lead) => (
                        <div
                          key={`${lead._id || lead.id}-${lead.Email_1}-${lead.Created_Time}`}
                          className="border border-gray-100 rounded-2xl p-5 hover:bg-harx-50/30 hover:border-harx-100 transition-all group hover:shadow-lg hover:shadow-harx-500/5"
                        >
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight group-hover:text-harx-600 transition-colors">{lead.Deal_Name}</h4>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Phone className="w-3 h-3" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">{lead.Telephony || (lead as any).Phone || 'No phone'}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Mail className="w-3 h-3" />
                                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">{lead.Email_1 || 'No email'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {lead.Stage && lead.Stage !== 'New' && (
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${lead.Stage === 'Respecte le planning' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  lead.Stage === 'En retard' ? 'bg-harx-50 text-harx-600 border border-harx-100' :
                                    'bg-gray-50 text-gray-400 border border-gray-100'
                                  }`}>
                                  {lead.Stage}
                                </span>
                              )}
                              <button
                                className="px-6 py-2 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                                onClick={() => handleCallClick(lead)}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-8 flex justify-center items-center gap-6">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`flex items-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                            : 'bg-white text-gray-700 hover:bg-harx-50 hover:text-harx-600 border border-gray-100 shadow-sm'
                            }`}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Page <span className="text-gray-900">{currentPage}</span> of <span className="text-gray-900">{totalPages}</span>
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`flex items-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                            : 'bg-white text-gray-700 hover:bg-harx-50 hover:text-harx-600 border border-gray-100 shadow-sm'
                            }`}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="h-[600px] bg-gray-900 rounded-3xl p-8 text-white flex flex-col shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/10 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32"></div>

            <div className="relative z-10 flex justify-between items-center mb-12">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/20">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedInteraction?.customer || 'No Customer Selected'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">In call: <span className="text-emerald-400">00:12:34</span></p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <button className="p-4 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all border border-white/5">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-4 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all border border-white/5">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-4 bg-red-500/20 backdrop-blur-md rounded-2xl hover:bg-red-500/40 text-red-500 transition-all border border-red-500/20">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative z-10">
              <div className="text-center group">
                <div className="w-40 h-40 bg-white/5 rounded-full mx-auto mb-6 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  <User className="w-20 h-20 text-gray-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Video disabled</p>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">Subject</label>
              <input
                type="text"
                placeholder="Enter email subject..."
                className="w-full px-5 py-3 border border-gray-50 rounded-2xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-harx-500 focus:bg-white transition-all text-sm font-medium"
              />
            </div>
            <div className="flex-1 p-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">Message Body</label>
              <textarea
                className="w-full h-[calc(100%-28px)] p-6 border border-gray-50 rounded-3xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-harx-500 focus:bg-white transition-all text-sm font-medium resize-none leading-relaxed"
                placeholder="Compose your premium response..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center rounded-b-3xl">
              <div className="flex space-x-3">
                <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                  <Image className="w-5 h-5" />
                </button>
              </div>
              <button className="px-8 py-3 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                Send Email
              </button>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-5 max-w-[70%] border border-gray-100 shadow-sm relative">
                  <p className="text-gray-900 text-sm font-medium leading-relaxed">Hello! How can I help you today?</p>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2 block">10:30 AM</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-gradient-harx text-white rounded-2xl rounded-tr-none p-5 max-w-[70%] shadow-lg shadow-harx-500/10 relative">
                  <p className="text-sm font-medium leading-relaxed">I'm having trouble with my recent order</p>
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">10:31 AM</span>
                    <CheckCircle className="w-3 h-3 text-white/60" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-3xl">
              <div className="flex space-x-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    placeholder="Type your premium message..."
                    className="w-full px-6 py-4 border border-gray-50 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all text-sm font-medium shadow-sm pr-12 resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button className="absolute right-4 bottom-4 p-1 text-gray-400 hover:text-harx-600 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button className="p-4 bg-gradient-harx text-white rounded-2xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5 flex-shrink-0 mb-0.5">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/10 rounded-t-3xl text-[10px] font-black uppercase tracking-widest">
              <div className="flex space-x-4">
                <select className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all shadow-sm">
                  <option>Twitter</option>
                  <option>Facebook</option>
                  <option>Instagram</option>
                </select>
                <select className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all shadow-sm">
                  <option>Public Posts</option>
                  <option>Direct Messages</option>
                  <option>Comments</option>
                </select>
              </div>
              <button className="p-3 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-harx-600 hover:bg-harx-50 transition-all shadow-sm">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="border border-gray-100 rounded-3xl p-6 bg-white hover:bg-harx-50/20 transition-all group hover:shadow-lg hover:shadow-harx-500/5">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/10">
                       <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 group-hover:text-harx-600 transition-colors uppercase text-sm tracking-tight">@customer123</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">2 minutes ago</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium">Having issues with my recent purchase. Can someone help?</p>
                  <div className="mt-6 flex space-x-6">
                    <button className="text-[10px] font-black uppercase tracking-widest text-harx-600 hover:text-harx-700 underline decoration-2 underline-offset-4">Reply</button>
                    <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">DM</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-3xl">
              <textarea
                className="w-full p-5 border border-gray-50 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all text-sm font-medium shadow-sm resize-none leading-relaxed"
                placeholder="Compose your premium response..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="mt-4 flex justify-between items-center px-1">
                <div className="flex space-x-3">
                  <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button className="px-8 py-3 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                  Post Reply
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCallEnd = () => {
    setShowCallInterface(false);
    setSelectedLead(null);
  };

  const handleCallClick = (lead: Lead) => {
    // Redirect to copilot with the leadId (prefer _id if available)
    const leadId = lead._id || lead.id;
    window.location.href = `/copilot?leadId=${leadId}`;
  };

  return (
    <div className="space-y-6">
      <GlobalAIAssistant />
      {showCallInterface && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 pointer-events-auto">
            <CallInterface
              phoneNumber={selectedLead.Telephony}
              agentId={user?.agentId || ''}
              onEnd={handleCallEnd}
              provider="twilio"
              callId={selectedLead.id}
            />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Workspace</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-500/5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 text-xs font-black uppercase tracking-widest">Active: 45m</span>
          </div>
          <button className="px-6 py-2.5 bg-white text-gray-500 hover:text-red-600 border border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-red-50 hover:border-red-100 shadow-sm">
            End Session
          </button>
        </div>
      </div>

      {/* Tool selector hidden as requested */}
      {/* 
      <div className="grid grid-cols-5 gap-4 mb-6">
        {workspaceTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTab(tool.id)}
            className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-colors ${activeTab === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <tool.icon className="w-5 h-5" />
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-1">{renderWorkspace()}</div>
      </div>
     </div>
    </div>
  );
}