import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Phone, Mail, MessageSquare, Globe, Clock, User, Mic, Video,
  Send, Paperclip, Image, Smile, MoreHorizontal, List, Filter,
  PhoneIncoming, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';
import { AIService } from '../services/ai';
import { CallInterface } from '../components/CallInterface';
import { useAuth } from '../contexts/AuthContext';
import { GlobalAIAssistant } from '../components/GlobalAIAssistant';

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
  const [activeTab, setActiveTab] = useState(gigId ? 'voice' : 'queue');
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
    <div className="h-[600px] bg-white rounded-lg border border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="font-semibold text-gray-900">Interaction Queue</h2>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
            {queueItems.length} Pending
          </span>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Filter className="w-5 h-5" />
          </button>
          <select className="border border-gray-200 rounded-lg px-3 py-1 text-sm">
            <option>All Types</option>
            <option>Calls</option>
            <option>Emails</option>
            <option>Chats</option>
          </select>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedInteraction(item);
                setActiveTab(item.type);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${item.type === 'call' ? 'bg-green-50' :
                    item.type === 'email' ? 'bg-blue-50' :
                      item.type === 'chat' ? 'bg-purple-50' : 'bg-orange-50'
                    }`}>
                    {item.type === 'call' ? <PhoneIncoming className="w-5 h-5 text-green-600" /> :
                      item.type === 'email' ? <Mail className="w-5 h-5 text-blue-600" /> :
                        item.type === 'chat' ? <MessageSquare className="w-5 h-5 text-purple-600" /> :
                          <Globe className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{item.customer}</h3>
                    <p className="text-sm text-gray-500">{item.channel}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.priority === 'High' ? 'bg-red-100 text-red-700' :
                  item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                  {item.priority}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Wait: {item.waitTime}</span>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Accept
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-600 mr-1" />
              <span>Avg. Wait: 8m</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              <span>Completed: 45</span>
            </div>
          </div>
          <div className="flex items-center">
            <XCircle className="w-4 h-4 text-red-600 mr-1" />
            <span>Missed: 3</span>
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
          <div className="h-[600px] bg-white rounded-lg p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900">Voice Calls</h2>
                {enrolledGigs.length > 0 && (
                  <div className="mt-2">
                    <select
                      value={selectedGigId}
                      onChange={(e) => {
                        setSelectedGigId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All My Leads</option>
                      {enrolledGigs.map(g => (
                        <option key={g._id} value={g._id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {leads.length} Leads
                  </span>
                </div>
                {isLoadingLeads ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No leads found {gigId ? "for this gig" : "for your account"}.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {leads.map((lead) => (
                        <div
                          key={`${lead.id}-${lead.Email_1}-${lead.Created_Time}`}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-gray-900">{lead.Deal_Name}</h4>
                              <p className="text-sm text-gray-600">{lead.Telephony || (lead as any).Phone || 'No phone'}</p>
                              <p className="text-sm text-gray-500">{lead.Email_1 || 'No email'}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {lead.Stage && lead.Stage !== 'New' && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.Stage === 'Respecte le planning' ? 'bg-green-100 text-green-700' :
                                  lead.Stage === 'En retard' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                  {lead.Stage}
                                </span>
                              )}
                              <button
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                                onClick={() => handleCallClick(lead)}
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center items-center space-x-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-4 py-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Next
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
          <div className="h-[600px] bg-gray-900 rounded-lg p-6 text-white flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedInteraction?.customer || 'No Customer Selected'}</h3>
                  <p className="text-sm text-gray-400">In call: 00:12:34</p>
                </div>
              </div>
              <div className="flex space-x-4">
                <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-3 bg-red-600 rounded-full hover:bg-red-700">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-gray-400">Video disabled</p>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="h-[600px] bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex-1 p-4">
              <textarea
                className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none"
                placeholder="Compose your email..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Image className="w-5 h-5" />
                </button>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Send Email
              </button>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="h-[600px] bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                  <p className="text-gray-900">Hello! How can I help you today?</p>
                  <span className="text-xs text-gray-500">10:30 AM</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[70%]">
                  <p>I'm having trouble with my recent order</p>
                  <span className="text-xs text-blue-200">10:31 AM</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="h-[600px] bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex space-x-4">
                <select className="border border-gray-200 rounded-lg px-3 py-1">
                  <option>Twitter</option>
                  <option>Facebook</option>
                  <option>Instagram</option>
                </select>
                <select className="border border-gray-200 rounded-lg px-3 py-1">
                  <option>Public Posts</option>
                  <option>Direct Messages</option>
                  <option>Comments</option>
                </select>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div>
                      <p className="font-medium">@customer123</p>
                      <p className="text-sm text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <p className="text-gray-900">Having issues with my recent purchase. Can someone help?</p>
                  <div className="mt-3 flex space-x-4">
                    <button className="text-sm text-blue-600 hover:text-blue-700">Reply</button>
                    <button className="text-sm text-gray-500 hover:text-gray-700">DM</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <textarea
                className="w-full p-3 border border-gray-200 rounded-lg resize-none"
                placeholder="Compose your response..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="mt-2 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
    // Redirect to copilot with the leadId
    window.location.href = `/copilot?leadId=${lead.id}`;
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-lg">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-green-600 text-sm">Active: 45m</span>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
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
      */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">{renderWorkspace()}</div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Info</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <p className="font-medium text-gray-900">{selectedInteraction?.customer || 'No customer selected'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Issue</label>
                <p className="font-medium text-gray-900">{selectedInteraction?.issue || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Wait Time</label>
                <p className="font-medium text-gray-900">{selectedInteraction?.waitTime || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Priority</label>
                <span className={`inline-block px-2 py-1 rounded-full text-sm ${selectedInteraction?.priority === 'High' ? 'bg-red-100 text-red-700' :
                  selectedInteraction?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    selectedInteraction?.priority === 'Low' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                  }`}>
                  {selectedInteraction?.priority || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <AIAssistant
            suggestions={aiSuggestions}
            onSuggestionClick={handleAISuggestion}
            sentiment={sentiment}
          />

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Transfer to Specialist
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                View Customer History
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Access Knowledge Base
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Create Support Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}