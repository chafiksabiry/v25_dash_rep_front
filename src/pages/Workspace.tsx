import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Phone, Mail, User,
  Paperclip, Image, MoreHorizontal, PhoneOutgoing, XCircle,
  ChevronLeft, ChevronRight, ChevronDown, Filter, Layout
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { CallRecords } from '../components/CallRecords';
import CopilotApp from '../copilot/App';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { slotApi } from '../services/api/slotApi';

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

type CopilotGuardState = {
  loading: boolean;
  isEnrolledInGig: boolean;
  isTrainingComplete: boolean;
  hasActiveReservationNow: boolean;
  reservationWindowLabel: string | null;
  reason: string | null;
};

function weekdayEnglish(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function parseTimeToMinutes(time: string): number | null {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function isTodayReservation(rawDate: unknown, now: Date): boolean {
  const v = String(rawDate || '').trim();
  if (!v) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const todayIso = now.toISOString().slice(0, 10);
    return v === todayIso;
  }
  return v.toLowerCase() === weekdayEnglish(now).toLowerCase();
}

export function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const urlLeadId = searchParams.get('leadId');
  const urlTab = searchParams.get('tab');
  const gigId = location.state?.gigId;
  const [activeTab, setActiveTab] = useState(urlTab && ['voice', 'calls', 'copilot'].includes(urlTab) ? urlTab : 'voice');
  const [message, setMessage] = useState('');
  // Sync activeTab with URL
  useEffect(() => {
    if (urlTab && ['voice', 'calls', 'copilot'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [enrolledGigs, setEnrolledGigs] = useState<EnrolledGig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>(gigId || '');
  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  const [copilotGuard, setCopilotGuard] = useState<CopilotGuardState>({
    loading: false,
    isEnrolledInGig: false,
    isTrainingComplete: false,
    hasActiveReservationNow: false,
    reservationWindowLabel: null,
    reason: 'Select an enrolled gig.'
  });

  useEffect(() => {
    fetchEnrolledGigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'voice') {
      fetchLeads(currentPage);
    }
  }, [activeTab, selectedGigId, currentPage]);

  const canUseCopilot = useMemo(
    () =>
      copilotGuard.isEnrolledInGig &&
      copilotGuard.isTrainingComplete &&
      copilotGuard.hasActiveReservationNow,
    [copilotGuard]
  );

  useEffect(() => {
    const evaluateCopilotGuard = async () => {
      if (!selectedGigId) {
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: false,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Select an enrolled gig.'
        });
        return;
      }

      const token = getAuthToken();
      const repId = getAgentId() || localStorage.getItem('agentId') || '';
      if (!repId) {
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: false,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Rep not authenticated.'
        });
        return;
      }

      const isEnrolledInGig = enrolledGigs.some((g) => g._id === selectedGigId);
      if (!isEnrolledInGig) {
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: false,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'You must be enrolled in this gig.'
        });
        return;
      }

      setCopilotGuard((prev) => ({ ...prev, loading: true, reason: null }));

      try {
        const now = new Date();
        const trainingBase = String(import.meta.env.VITE_TRAINING_API_URL || '').replace(/\/$/, '');
        let isTrainingComplete = false;
        if (trainingBase) {
          const summaryRes = await fetch(
            `${trainingBase}/training_journeys/rep/${encodeURIComponent(repId)}/slide-progress-summary?gigId=${encodeURIComponent(selectedGigId)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined
            }
          );
          if (summaryRes.ok) {
            const summary = await summaryRes.json();
            const overall = Number(summary?.overallPercent ?? 0);
            const trainingCount = Number(summary?.trainingCount ?? 0);
            isTrainingComplete = trainingCount === 0 ? true : overall >= 100;
          }
        }

        const reservations = await slotApi.getReservations(repId, selectedGigId);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const activeReservation = (Array.isArray(reservations) ? reservations : []).find((r: any) => {
          if (String(r?.status || '').toLowerCase() !== 'reserved') return false;
          const reservationDay = r?.reservationDate || r?.date;
          if (!isTodayReservation(reservationDay, now)) return false;
          const start = parseTimeToMinutes(r?.startTime);
          const end = parseTimeToMinutes(r?.endTime);
          if (start == null || end == null || end <= start) return false;
          return nowMinutes >= start && nowMinutes < end;
        });

        const hasActiveReservationNow = !!activeReservation;
        const reservationWindowLabel = hasActiveReservationNow
          ? `${activeReservation.startTime} - ${activeReservation.endTime}`
          : null;

        const reason = !isTrainingComplete
          ? 'Complete all trainings for this gig before calling.'
          : !hasActiveReservationNow
            ? 'Calls are allowed only during your reserved slot for this gig.'
            : null;

        setCopilotGuard({
          loading: false,
          isEnrolledInGig,
          isTrainingComplete,
          hasActiveReservationNow,
          reservationWindowLabel,
          reason
        });
      } catch (error) {
        console.error('Error evaluating copilot guard:', error);
        setCopilotGuard({
          loading: false,
          isEnrolledInGig,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Unable to validate call conditions. Please try again.'
        });
      }
    };

    evaluateCopilotGuard();
  }, [selectedGigId, enrolledGigs]);

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

  const workspaceTools = [
    { id: 'voice', label: 'Leads', icon: User },
    { id: 'calls', label: 'Call History', icon: PhoneOutgoing },
    { id: 'copilot', label: 'Copilot', icon: Phone },
  ];

  const renderWorkspace = () => {
    switch (activeTab) {
      case 'voice':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl p-8 flex flex-col shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
              <div className="flex flex-col">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Leads</h2>
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
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                                  canUseCopilot
                                    ? 'bg-gradient-harx text-white hover:shadow-lg hover:shadow-harx-500/20 hover:-translate-y-0.5'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                disabled={!canUseCopilot || copilotGuard.loading}
                                onClick={() => handleCallClick(lead)}
                                title={!canUseCopilot && copilotGuard.reason ? copilotGuard.reason : ''}
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/10 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32"></div>

            <div className="relative z-10 flex justify-between items-center mb-12">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/20">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedLead?.Deal_Name || 'No Customer Selected'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">In call: <span className="text-emerald-400">00:12:34</span></p>
                  </div>
                </div>
              </div>
                <button className="p-4 bg-red-500/20 backdrop-blur-md rounded-2xl hover:bg-red-500/40 text-red-500 transition-all border border-red-500/20">
                  <XCircle className="w-5 h-5" />
                </button>
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
                placeholder="Compose your response..."
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

      case 'calls':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl p-8 overflow-y-auto shadow-sm border border-gray-100">
            <CallRecords gigId={selectedGigId} leadId={urlLeadId || undefined} />
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
                placeholder="Compose your response..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="mt-4 flex justify-between items-center px-1">
                <div className="flex space-x-3">
                  <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                    <Image className="w-5 h-5" />
                  </button>
                </div>
                <button className="px-8 py-3 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                  Post Reply
                </button>
              </div>
            </div>
          </div>
        );
      case 'copilot':
        return (
          <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 overflow-hidden" style={{ minHeight: '600px' }}>
            {copilotGuard.loading ? (
              <div className="flex flex-col items-center justify-center h-full pt-32 text-gray-400">
                <p className="text-sm font-bold uppercase tracking-widest">Checking call permissions...</p>
              </div>
            ) : !canUseCopilot ? (
              <div className="flex flex-col items-center justify-center h-full pt-24 text-center px-8">
                <Phone className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-700">Copilot Locked</p>
                <p className="text-xs mt-2 text-gray-500 max-w-xl">
                  {copilotGuard.reason || 'You cannot place calls right now.'}
                </p>
                {copilotGuard.reservationWindowLabel && (
                  <p className="text-xs mt-2 text-emerald-600 font-bold">
                    Active reserved window: {copilotGuard.reservationWindowLabel}
                  </p>
                )}
              </div>
            ) : (selectedLead || urlLeadId) ? <CopilotApp /> : (
               <div className="flex flex-col items-center justify-center h-full pt-32 text-gray-400">
                 <Phone className="w-16 h-16 mb-4 opacity-50" />
                 <p className="text-sm font-bold uppercase tracking-widest">No lead selected</p>
                 <p className="text-xs mt-2">Please select a lead from the Leads tab to start a call.</p>
               </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleCallClick = (lead: Lead) => {
    if (!canUseCopilot) return;
    const leadIdString = lead._id || lead.id;
    window.history.pushState({}, '', `${window.location.pathname}?leadId=${leadIdString}`);
    setSelectedLead(lead);
    setActiveTab('copilot');
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">Workspace</h1>
        
        {enrolledGigs.length > 0 && (
          <div className="flex flex-col items-start space-y-2 relative">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Active Gig
            </span>
            
            <div className="relative min-w-[280px]">
              <button
                onClick={() => setIsGigDropdownOpen(!isGigDropdownOpen)}
                className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-3.5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-700 hover:border-harx-200 hover:shadow-xl hover:shadow-harx-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-harx flex items-center justify-center shadow-lg shadow-harx-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Layout className="w-4 h-4 text-white" />
                  </div>
                  <span>
                    {selectedGigId 
                      ? enrolledGigs.find(g => g._id === selectedGigId)?.title 
                      : 'All My Gigs'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${isGigDropdownOpen ? 'rotate-180 text-harx-500' : ''}`} />
              </button>

              {isGigDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsGigDropdownOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl shadow-harx-500/10 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => {
                        setSelectedGigId('');
                        setCurrentPage(1);
                        setIsGigDropdownOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-gray-50 ${!selectedGigId ? 'text-harx-600 bg-harx-50/50' : 'text-gray-500'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${!selectedGigId ? 'bg-harx-500' : 'bg-gray-200'}`}></div>
                      All My Gigs
                    </button>
                    <div className="h-px bg-gray-100 mx-4 my-1 opacity-50"></div>
                    {enrolledGigs.map((g) => (
                      <button
                        key={g._id}
                        onClick={() => {
                          setSelectedGigId(g._id);
                          setCurrentPage(1);
                          setIsGigDropdownOpen(false);
                        }}
                        className={`w-full px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 hover:bg-harx-50/50 ${selectedGigId === g._id ? 'text-harx-600 bg-harx-50/50' : 'text-gray-500 hover:text-harx-500'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedGigId === g._id ? 'bg-harx-500 animate-pulse' : 'bg-transparent border border-gray-200'}`}></div>
                        {g.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {workspaceTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTab(tool.id);
              // Use relative navigation to only update the query param
              navigate(`?tab=${tool.id}`, { replace: true });
            }}
            className={`flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl transition-all duration-300 border ${activeTab === tool.id
              ? 'bg-gradient-harx text-white border-transparent shadow-xl shadow-harx-500/25 -translate-y-1'
              : 'bg-white/50 backdrop-blur-sm text-gray-400 border-gray-100 hover:border-harx-200 hover:bg-white hover:text-harx-600 hover:shadow-lg hover:shadow-harx-500/5'
              }`}
          >
            <tool.icon className={`w-5 h-5 transition-transform duration-500 ${activeTab === tool.id ? 'text-white scale-110' : 'text-current group-hover:scale-110'}`} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full">
        {renderWorkspace()}
      </div>
    </div>
  );
}