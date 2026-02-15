import { useState, useMemo, useEffect } from 'react';
import { HorizontalCalendar } from '../components/scheduler/HorizontalCalendar';
import { TimeSlotGrid } from '../components/scheduler/TimeSlotGrid';
import { TimeSlot, Gig, WeeklyStats, Rep, UserRole, Company } from '../types/scheduler';
import { Building, Clock, Briefcase, AlertCircle, Users, Brain, X } from 'lucide-react';
import { CompanyView } from '../components/scheduler/CompanyView';
import { WorkloadPredictionComponent as WorkloadPrediction } from '../components/scheduler/WorkloadPrediction';
import { AttendanceReport } from '../components/scheduler/AttendanceReport';
import { initializeAI } from '../services/schedulerAiService';
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getAgentId } from '../utils/authUtils';
import { schedulerApi } from '../services/api/scheduler';
import { slotApi } from '../services/api/slotApi';

// Define ExternalGig type locally for API response mapping
interface ExternalGig {
    _id: string | { $oid: string };
    title: string;
    description: string;
    companyName?: string;
    requiredSkills?: { name: string }[];
    [key: string]: any;
}

// Helper to generate a consistent color from a string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Map Slot from backend to frontend TimeSlot type
const mapBackendSlotToSlot = (slot: any, currentAgentId?: string): TimeSlot => {
    const agentData = slot.agentId && typeof slot.agentId === 'object' ? slot.agentId : null;
    const gigData = slot.gigId && typeof slot.gigId === 'object' ? slot.gigId : null;

    // Use slot.slotId if available (for reservations), otherwise use _id
    const id = slot.slotId || (slot._id as any)?.$oid || slot._id?.toString() || crypto.randomUUID();
    let repId = (agentData as any)?._id || (agentData as any)?.$oid || slot.agentId?.toString() || slot.repId?.toString() || '';
    const gigId = (gigData as any)?._id || (gigData as any)?.$oid || slot.gigId?.toString() || '';

    let status = slot.status;
    let isReservation = !!slot.isMember; // From backend getReservations mapping
    let repNotes = '';
    let reservationId = '';

    const reservations = slot.reservations || [];
    const reservedCount = slot.reservedCount || reservations.length || 0;
    const capacity = slot.capacity || 1;

    if (reservations.length > 0 && currentAgentId) {
        const myRes = reservations.find((r: any) =>
            (r.agentId?._id || r.agentId?.$oid || r.agentId)?.toString() === currentAgentId
        );
        if (myRes) {
            status = 'reserved';
            isReservation = true;
            repId = currentAgentId;
            repNotes = myRes.notes || '';
            reservationId = (myRes._id as any)?.$oid || myRes._id?.toString() || '';
        }
    }

    // Ensure date is present (fallback to extracting from startTime if it's an ISO string)
    let date = slot.date;
    if (!date && slot.startTime && slot.startTime.includes('T')) {
        date = slot.startTime.split('T')[0];
    }

    return {
        id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: date || '',
        gigId,
        repId,
        status: status as any,
        duration: slot.duration || 1,
        notes: repNotes, // ONLY the rep's personal reservation notes
        companyNotes: slot.notes, // The general slot notes from company
        capacity,
        reservedCount,
        reservations,
        attended: slot.attended,
        attendanceNotes: slot.attendanceNotes,
        agent: agentData, // Store populated agent data
        gig: gigData, // Store populated gig data
        isMember: slot.isMember || isReservation, // Compat for flag
        reservationId
    };
};

// Map ExternalGig to scheduler Gig type
const mapExternalGigToSchedulerGig = (gig: ExternalGig): Gig => {
    const id = (gig._id as any)?.$oid || gig._id?.toString() || crypto.randomUUID();
    return {
        id,
        name: gig.title,
        description: gig.description,
        company: gig.companyName || 'Unknown Company',
        color: stringToColor(id),
        skills: gig.requiredSkills?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
        priority: 'medium', // Default priority, could be derived
        availability: gig.availability
    };
};

const sampleReps: Rep[] = [
    {
        id: '1',
        name: 'Alex Johnson',
        email: 'alex@harx.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Customer Support', 'Technical Troubleshooting'],
        performanceScore: 87,
        preferredHours: { start: 9, end: 17 },
        attendanceScore: 92,
        attendanceHistory: []
    },
    {
        id: '2',
        name: 'Jamie Smith',
        email: 'jamie@harx.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Sales', 'Product Demos'],
        performanceScore: 92,
        preferredHours: { start: 8, end: 16 },
        attendanceScore: 85,
        attendanceHistory: []
    },
    {
        id: '3',
        name: 'Taylor Wilson',
        email: 'taylor@harx.com',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Training', 'Onboarding'],
        performanceScore: 78,
        preferredHours: { start: 10, end: 18 },
        attendanceScore: 78,
        attendanceHistory: []
    },
    {
        id: '4',
        name: 'Morgan Lee',
        email: 'morgan@harx.com',
        avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['Technical Support', 'Product Expertise'],
        performanceScore: 85,
        preferredHours: { start: 9, end: 17 },
        attendanceScore: 88,
        attendanceHistory: []
    },
];

const sampleCompanies: Company[] = [
    {
        id: '1',
        name: 'Tech Co',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 3
    },
    {
        id: '2',
        name: 'Marketing Inc',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 2
    },
    {
        id: '3',
        name: 'Acme Corp',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
        priority: 1
    },
];

interface EnrolledGig {
    _id: string;
    status: string;
    gigId: {
        _id: string;
        title: string;
        description?: string;
        availability?: {
            schedule?: {
                day: string;
                hours: { start: string; end: string; };
            }[];
            time_zone?: string | { name: string };
        };
        commission?: {
            commission_per_call?: number;
            currency?: { symbol?: string; code?: string };
        };
        destination_zone?: {
            name: { common: string };
        };
        companyId?: {
            _id: string;
            name: string;
            logo?: string;
        };
    };
    matchScore?: number;
}

export function SessionPlanning() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [userRole] = useState<UserRole>('rep');

    const [selectedRepId] = useState<string>(() => {
        const agendId = getAgentId();
        return agendId || sampleReps[0].id;
    });

    const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [reps, setReps] = useState<Rep[]>([]);
    const [draftSlots, setDraftSlots] = useState<Partial<TimeSlot>[]>([]);
    const [draftSlotNotes, setDraftSlotNotes] = useState<Record<string, string>>({});
    const [quickStart, setQuickStart] = useState<string>('');
    const [quickEnd, setQuickEnd] = useState<string>('');
    const [globalNotes, setGlobalNotes] = useState<string>('');
    const [loadingGigs, setLoadingGigs] = useState<boolean>(true);
    const [showAttendancePanel] = useState<boolean>(false);
    const [showAIPanel] = useState<boolean>(true);

    const refreshData = async () => {
        if (!selectedRepId) return;

        try {
            if (userRole === 'rep') {
                // Fetch from all sources for REPs
                const [timeSlots, availableSlots, reservations] = await Promise.all([
                    schedulerApi.getTimeSlots(selectedRepId),
                    selectedGigId ? slotApi.getSlots(selectedGigId) : slotApi.getSlots(),
                    selectedGigId ? slotApi.getReservations(selectedRepId, selectedGigId) : slotApi.getReservations(selectedRepId)
                ]);

                const mappedTimeSlots = Array.isArray(timeSlots) ? timeSlots.map(s => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedAvailableSlots = Array.isArray(availableSlots) ? availableSlots.map(s => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedReservations = Array.isArray(reservations) ? reservations.map((r: any) => ({
                    ...mapBackendSlotToSlot(r, selectedRepId),
                    isReservation: true // Flag to distinguish for cancellation
                })) : [];

                // Merge and deduplicate: Prioritize Reservations > Time Slots > Available Slots
                const finalSlots: TimeSlot[] = [];
                const seenIds = new Set<string>();

                // 1. Add Reservations first
                mappedReservations.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                // 2. Add Time Slots (original time blocks)
                mappedTimeSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                // 3. Add Available Slots
                mappedAvailableSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                let allSlots = finalSlots;

                // Filter by gig if a gig is selected
                if (selectedGigId) {
                    allSlots = allSlots.filter(slot => slot.gigId === selectedGigId);
                }

                setSlots(allSlots);
            } else {
                // Fetch Global Gig Data (for Company/Admin view)
                if (!selectedGigId) return;

                // 1. Fetch all agents enrolled in this gig
                const gigAgents = await schedulerApi.getGigAgents(selectedGigId, 'enrolled');
                const mappedReps = gigAgents.map(ga => ({
                    id: ga.agentId._id,
                    name: ga.agentId.personalInfo?.firstName + ' ' + ga.agentId.personalInfo?.lastName,
                    email: ga.agentId.personalInfo?.email || '',
                    avatar: ga.agentId.personalInfo?.avatar,
                    specialties: ga.agentId.professionalSummary?.industries || [],
                    performanceScore: 85,
                    attendanceScore: 90
                }));
                setReps(mappedReps);

                // 2. Fetch all slots for this gig from both APIs
                const [timeSlots, availableSlots] = await Promise.all([
                    schedulerApi.getTimeSlots(undefined, selectedGigId),
                    slotApi.getSlots(selectedGigId)
                ]);

                const mappedTimeSlots = Array.isArray(timeSlots) ? timeSlots.map((s: any) => mapBackendSlotToSlot(s, selectedRepId)) : [];
                const mappedAvailableSlots = Array.isArray(availableSlots) ? availableSlots.map((s: any) => mapBackendSlotToSlot(s, selectedRepId)) : [];

                // Merge and deduplicate
                const finalSlots: TimeSlot[] = [];
                const seenIds = new Set<string>();

                mappedTimeSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                mappedAvailableSlots.forEach(slot => {
                    if (!seenIds.has(slot.id)) {
                        finalSlots.push(slot);
                        seenIds.add(slot.id);
                    }
                });

                setSlots(finalSlots);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    useEffect(() => {
        const fetchGigs = async () => {
            const companyId = Cookies.get('companyId');
            if (!companyId) {
                setLoadingGigs(false);
                return;
            }

            try {
                setLoadingGigs(true);
                const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
                const response = await axios.get(`${apiUrl}/gigs/company/${companyId}`);

                if (response.data && response.data.data) {
                    const mappedGigs = response.data.data.map(mapExternalGigToSchedulerGig);
                    setGigs(mappedGigs);
                    // Removed auto-selection of first gig
                }
            } catch (error) {
                console.error('Error fetching gigs:', error);
                setNotification({ message: 'Failed to load Gigs', type: 'error' });
            } finally {
                setLoadingGigs(false);
            }
        };

        const initAI = async () => {
            await initializeAI();
        };
        initAI();
        fetchGigs();
    }, [userRole]);




    useEffect(() => {
        const fetchEnrolledGigs = async () => {
            if (!selectedRepId) return;

            try {
                const matchingApiUrl = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';
                const response = await axios.get(`${matchingApiUrl}/gig-agents/agent/${selectedRepId}`);

                if (response.data) {
                    const enrolledOnly = response.data.filter((ga: EnrolledGig) => ga.status?.toLowerCase() === 'enrolled');

                    const mappedGigs: Gig[] = enrolledOnly.map((gigAgent: EnrolledGig) => ({
                        id: gigAgent.gigId._id,
                        name: gigAgent.gigId.title,
                        description: gigAgent.gigId.description || '',
                        company: gigAgent.gigId.companyId?.name || 'Unknown Company',
                        companyId: gigAgent.gigId.companyId?._id || '', // Map company ID
                        color: stringToColor(gigAgent.gigId._id || gigAgent.gigId.title),
                        skills: [],
                        priority: 'medium',
                        availability: gigAgent.gigId.availability
                    }));

                    setGigs(mappedGigs);
                }
            } catch (error) {
                console.error('Error fetching enrolled gigs:', error);
            }
        };

        if (userRole === 'rep') {
            fetchEnrolledGigs();
        }
    }, [selectedRepId, userRole]);

    // Unified Slot Refresh Trigger
    useEffect(() => {
        refreshData();
    }, [selectedRepId, userRole, selectedGigId, selectedDate]);







    const weeklyStats = useMemo<WeeklyStats>(() => {
        const stats: WeeklyStats = {
            totalHours: 0,
            gigBreakdown: {} as Record<string, number>,
            availableSlots: 0,
            reservedSlots: 0,
            pendingHours: 0
        };

        const filteredSlots = userRole === 'rep'
            ? slots.filter(slot => slot.repId === selectedRepId)
            : slots;

        filteredSlots.forEach((slot) => {
            if (slot.status !== 'cancelled') {
                stats.totalHours += slot.duration || 1;

                if (slot.status === 'available') {
                    stats.availableSlots++;
                } else if (slot.status === 'reserved') {
                    stats.reservedSlots++;
                }

                if (slot.gigId) {
                    stats.gigBreakdown[slot.gigId] = (stats.gigBreakdown[slot.gigId] || 0) + (slot.duration || 1);
                }
            }
        });

        // Add pending hours from all draft slots
        stats.pendingHours = draftSlots.reduce((sum, s) => sum + (s.duration || 1), 0);

        return stats;
    }, [slots, userRole, selectedRepId, draftSlots]);

    const isPastDate = format(selectedDate, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');

    const handleTimeSelect = (time: string) => {
        if (isPastDate) return;
        const hour = parseInt(time.split(':')[0]);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const isAlreadyDrafted = draftSlots.some(s => s.date === dateStr && s.startTime === time);

        // Reset quick dropdowns when selecting manually
        setQuickStart('');
        setQuickEnd('');

        if (isAlreadyDrafted) {
            setDraftSlots(prev => prev.filter(s => !(s.date === dateStr && s.startTime === time)));
        } else {
            setDraftSlots(prev => [...prev, {
                id: crypto.randomUUID(),
                date: dateStr,
                startTime: time,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                duration: 1,
                repId: selectedRepId,
                status: 'reserved',
                gigId: selectedGigId || undefined
            }]);
        }
    };

    const updateDraftRange = (start: string, end: string) => {
        if (isPastDate || !start || !end) return;
        const startH = parseInt(start.split(':')[0]);
        const endH = parseInt(end.split(':')[0]);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        if (endH > startH) {
            const newRange: Partial<TimeSlot>[] = [];
            for (let h = startH; h < endH; h++) {
                const hStr = `${h.toString().padStart(2, '0')}:00`;
                const endHStr = `${(h + 1).toString().padStart(2, '0')}:00`;
                newRange.push({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    startTime: hStr,
                    endTime: endHStr,
                    duration: 1,
                    repId: selectedRepId,
                    status: 'reserved',
                    gigId: selectedGigId || undefined
                });
            }
            setDraftSlots(newRange);
            // Reset dropdowns to placeholders as requested
            setQuickStart('');
            setQuickEnd('');
        }
    };

    const handleSlotUpdate = async (updates: Partial<TimeSlot>) => {
        let slotWithRep: TimeSlot;

        if (updates.id) {
            const existing = slots.find(s => s.id === updates.id);
            if (existing) {
                slotWithRep = { ...existing, ...updates } as TimeSlot;
            } else {
                slotWithRep = { ...updates, repId: (updates as any).repId || selectedRepId } as TimeSlot;
            }
        } else if (selectedSlot) {
            slotWithRep = { ...selectedSlot, ...updates } as TimeSlot;
        } else {
            return;
        }

        try {
            const existing = updates.id ? slots.find(s => s.id === updates.id) : null;

            // NEW LOGIC: If it's a backend Slot (has capacity info) and we are reserving it
            if (existing && (existing as any).capacity !== undefined && updates.status === 'reserved') {
                await slotApi.reserveSlot(existing.id, selectedRepId, updates.notes || '');
                await refreshData();
                setNotification({ message: 'Slot reserved successfully', type: 'success' });
                return;
            }

            // NEW LOGIC: If it's a backend Slot and we are trying to update notes on an existing reservation
            if (existing && (existing as any).capacity !== undefined && updates.notes !== undefined && (existing as any).reservationId) {
                await slotApi.updateReservationNotes((existing as any).reservationId, updates.notes);
                await refreshData();
                setNotification({ message: 'Reservation notes updated', type: 'success' });
                return;
            }

            // NEW LOGIC: If it's a backend Slot and we are trying to set it back to available (cancel)
            if (existing && (existing as any).capacity !== undefined && updates.status === 'available') {
                const resId = (existing as any).reservationId || existing.id; // Fallback to id if reservationId not found (maybe manual mapping)
                await slotApi.cancelReservation(resId);
                await refreshData();
                setNotification({ message: 'Reservation cancelled', type: 'success' });
                return;
            }

            await schedulerApi.upsertTimeSlot(slotWithRep);
            await refreshData();

            setNotification({
                message: updates.id ? 'Time slot updated successfully' : 'New time slot created',
                type: 'success'
            });
        } catch (error) {
            console.error('Error saving slot:', error);
            setNotification({
                message: 'Failed to save time slot',
                type: 'error'
            });
        }

        setTimeout(() => setNotification(null), 3000);
    };

    const handleSlotCancel = async (slotId: string) => {
        try {
            const slot = slots.find(s => s.id === slotId);

            if (slot && (slot as any).isReservation) {
                // If it's a slotApi reservation
                await slotApi.cancelReservation(slotId);
            } else {
                // If it's a schedulerApi time slot
                await schedulerApi.cancelTimeSlot(slotId);
            }

            await refreshData();

            setNotification({
                message: 'Time slot cancelled',
                type: 'success'
            });
        } catch (error) {
            console.error('Error cancelling slot:', error);
            setNotification({
                message: 'Failed to cancel time slot',
                type: 'error'
            });
        }

        setTimeout(() => setNotification(null), 3000);

        if (selectedSlot?.id === slotId) {
            setSelectedSlot(null);
        }
    };

    const handleQuickReserve = async () => {
        if (!selectedGigId || draftSlots.length === 0) return;

        try {
            await Promise.all(draftSlots.map(slot =>
                schedulerApi.upsertTimeSlot({
                    ...slot,
                    gigId: selectedGigId,
                    notes: draftSlotNotes[`${slot.date}:${slot.startTime}`] ?? globalNotes ?? slot.notes ?? ''
                })
            ));

            await refreshData();

            setNotification({
                message: `${draftSlots.length} time block(s) reserved successfully`,
                type: 'success'
            });

            setDraftSlots([]);
            setDraftSlotNotes(prev => {
                const next = { ...prev };
                draftSlots.forEach(s => { if (s.date && s.startTime) delete next[`${s.date}:${s.startTime}`]; });
                return next;
            });
            setGlobalNotes('');
        } catch (error) {
            console.error('Error in multi-reserve:', error);
            setNotification({
                message: 'Failed to reserve time blocks',
                type: 'error'
            });
        }

        setTimeout(() => setNotification(null), 3000);
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
    };


    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{notification.message}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Page title + stats (compatible with other dashboard pages) */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-xl">
                                <Building className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Session Planning</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Plan and reserve your time slots</p>
                            </div>
                            {loadingGigs && <span className="text-xs text-blue-500 font-medium animate-pulse">Updating Gigs...</span>}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Weekly Hours</p>
                                    <p className="text-lg font-bold text-gray-900">{weeklyStats.totalHours}h</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <Briefcase className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Active Gigs</p>
                                    <p className="text-lg font-bold text-gray-900">{Object.keys(weeklyStats.gigBreakdown).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="w-full">
                    {userRole === 'company' ? (
                        <div className="space-y-8">
                            <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                                {gigs.length === 0 ? (
                                    <div className="text-gray-500 italic px-4 py-3 bg-white rounded-xl border border-dashed border-gray-200 w-full text-center text-sm">No active gigs found.</div>
                                ) : (
                                    gigs.map(gig => (
                                        <button
                                            key={gig.id}
                                            onClick={() => setSelectedGigId(gig.id)}
                                            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-200 text-sm font-medium ${selectedGigId === gig.id
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                                }`}
                                        >
                                            {gig.name}
                                        </button>
                                    ))
                                )}
                            </div>

                            {selectedGigId && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                            <p className="text-sm text-gray-500 mb-1 font-medium">REPs Scheduled</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {new Set(slots
                                                    .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                    .map(slot => slot.repId)
                                                ).size}
                                            </p>
                                        </div>
                                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                            <p className="text-sm text-gray-500 mb-1 font-medium">Total Hours Committed</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {slots
                                                    .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                    .reduce((sum, slot) => sum + slot.duration, 0)}h
                                            </p>
                                        </div>
                                    </div>

                                    <CompanyView
                                        company={gigs.find(g => g.id === selectedGigId)?.name || ''}
                                        gigs={gigs.filter(g => g.id === selectedGigId).map(g => ({ ...g, company: g.name }))}
                                        slots={slots}
                                        reps={reps}
                                        selectedDate={selectedDate}
                                    />
                                </div>
                            )}
                        </div>
                    ) : userRole === 'rep' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                <div className="lg:col-span-2">
                                    <HorizontalCalendar
                                        selectedDate={selectedDate}
                                        onDateSelect={setSelectedDate}
                                        slots={slots.filter((slot: TimeSlot) => slot.repId === selectedRepId)}
                                        selectedGigId={selectedGigId || ''}
                                    />

                                    <div className="mt-8">
                                        <TimeSlotGrid
                                            date={selectedDate}
                                            slots={slots.filter(s => s.repId === selectedRepId || (selectedGigId && s.gigId === selectedGigId))}
                                            gigs={gigs}
                                            selectedGigId={selectedGigId || ''}
                                            onGigFilterChange={(id) => setSelectedGigId(id || null)}
                                            onSlotUpdate={handleSlotUpdate}
                                            onSlotCancel={handleSlotCancel}
                                            onSlotSelect={handleSlotSelect}
                                            onTimeSelect={handleTimeSelect}
                                            draftSlots={draftSlots}
                                            draftSlotNotes={draftSlotNotes}
                                            onDraftNotesChange={(time, val) => setDraftSlotNotes(prev => ({ ...prev, [`${format(selectedDate, 'yyyy-MM-dd')}:${time}`]: val }))}
                                            allowAddSlots={false}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 mb-4">Weekly Overview</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Available Slots</span>
                                                <span className="text-gray-900 font-black">
                                                    {slots.filter((s: TimeSlot) =>
                                                        s.repId === selectedRepId &&
                                                        s.status === 'available' &&
                                                        (!selectedGigId || s.gigId === selectedGigId)
                                                    ).length}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Reserved Slots</span>
                                                <span className="text-gray-900 font-black">
                                                    {slots.filter((s: TimeSlot) =>
                                                        s.repId === selectedRepId &&
                                                        s.status === 'reserved' &&
                                                        (!selectedGigId || s.gigId === selectedGigId)
                                                    ).length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-5 border-t border-gray-100">
                                        <h3 className="text-base font-semibold text-gray-900 mb-4">Project Hours</h3>
                                        <div className="space-y-4">
                                            {gigs.filter(g => !selectedGigId || g.id === selectedGigId).slice(0, 3).map((gig: Gig) => {
                                                const gigHours = slots
                                                    .filter((s: TimeSlot) => s.repId === selectedRepId && s.gigId === gig.id && s.status === 'reserved')
                                                    .reduce((sum: number, s: TimeSlot) => sum + (s.duration || 1), 0);

                                                if (gigHours === 0 && selectedGigId) return null;

                                                return (
                                                    <div key={gig.id} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center">
                                                            <div className="w-2.5 h-2.5 rounded-full mr-3" style={{ backgroundColor: stringToColor(gig.name) }}></div>
                                                            <span className="text-gray-500 font-medium truncate max-w-[140px]">{gig.name}</span>
                                                        </div>
                                                        <span className="text-gray-900 font-black">{gigHours}h</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-5 border-t border-gray-100">
                                        <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Reserve</h3>
                                        <div className="space-y-4">
                                            {isPastDate ? (
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
                                                    You can only reserve slots for today or future dates. This day is in the past; existing reserved slots are still shown below.
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Project</p>
                                                        <select
                                                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 py-3 px-4 focus:ring-2 focus:ring-blue-100"
                                                            value={selectedGigId || ''}
                                                            onChange={(e) => setSelectedGigId(e.target.value === '' ? null : e.target.value)}
                                                        >
                                                            <option value="">Select a Project</option>
                                                            {gigs.map((gig: Gig) => (
                                                                <option key={gig.id} value={gig.id}>{gig.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {(() => {
                                                        if (!selectedGigId) return (
                                                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 italic text-[10px] text-blue-600 font-bold">
                                                                Please select a gig to see available times.
                                                            </div>
                                                        );
                                                        const selectedGig = gigs.find(g => g.id === selectedGigId);
                                                        const dayName = format(selectedDate, 'EEEE');
                                                        const daySchedule = selectedGig?.availability?.schedule?.find(
                                                            s => s.day.toLowerCase() === dayName.toLowerCase()
                                                        );

                                                        if (!daySchedule) return (
                                                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 italic text-[10px] text-orange-600 font-bold">
                                                                No availability found for this day.
                                                            </div>
                                                        );

                                                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                                        const takenHours = new Set<number>();
                                                        [...slots.filter(s => s.repId === selectedRepId && s.date === dateStr && s.status === 'reserved'), ...draftSlots.filter(s => s.date === dateStr)].forEach(slot => {
                                                            const startH = parseInt(slot.startTime?.split(':')[0] ?? '0');
                                                            const endH = parseInt(slot.endTime?.split(':')[0] ?? '0');
                                                            for (let h = startH; h < endH; h++) takenHours.add(h);
                                                        });

                                                        const startH = parseInt(daySchedule.hours.start.split(':')[0]);
                                                        const endH = parseInt(daySchedule.hours.end.split(':')[0]);
                                                        const availableStartOptions = Array.from({ length: endH - startH + 1 }, (_, i) => {
                                                            const h = startH + i;
                                                            return `${h.toString().padStart(2, '0')}:00`;
                                                        }).filter(hStr => !takenHours.has(parseInt(hStr.split(':')[0])));

                                                        return (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Start Time</p>
                                                                        <select
                                                                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 py-3 px-4 focus:ring-2 focus:ring-blue-100"
                                                                            value={quickStart}
                                                                            onChange={(e) => {
                                                                                const time = e.target.value;
                                                                                setQuickStart(time);
                                                                                if (time && quickEnd) updateDraftRange(time, quickEnd);
                                                                            }}
                                                                        >
                                                                            <option value="">Start</option>
                                                                            {availableStartOptions.map(h => (
                                                                                <option key={h} value={h}>{h}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">End Time</p>
                                                                        <select
                                                                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 py-3 px-4 focus:ring-2 focus:ring-blue-100"
                                                                            value={quickEnd}
                                                                            onChange={(e) => {
                                                                                const time = e.target.value;
                                                                                setQuickEnd(time);
                                                                                if (quickStart && time) updateDraftRange(quickStart, time);
                                                                            }}
                                                                        >
                                                                            <option value="">End</option>
                                                                            {Array.from({ length: endH - startH + 1 }, (_, i) => {
                                                                                const h = startH + i;
                                                                                const hStr = `${h.toString().padStart(2, '0')}:00`;
                                                                                const selectedStartH = quickStart ? parseInt(quickStart.split(':')[0]) : -1;
                                                                                const isBeforeOrSameStart = selectedStartH !== -1 && h <= selectedStartH;
                                                                                const rangeOverlapsTaken = selectedStartH !== -1 && Array.from({ length: h - selectedStartH }, (_, i) => selectedStartH + i).some(t => takenHours.has(t));
                                                                                const disabled = isBeforeOrSameStart || rangeOverlapsTaken;
                                                                                return (
                                                                                    <option
                                                                                        key={hStr}
                                                                                        value={hStr}
                                                                                        disabled={disabled}
                                                                                        className={disabled ? 'text-gray-300' : ''}
                                                                                    >
                                                                                        {hStr}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Reservation Notes</p>
                                                                    <textarea
                                                                        className="w-full bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 py-3 px-4 focus:ring-2 focus:ring-blue-100 min-h-[80px] resize-none"
                                                                        placeholder="Add a note to your reservation (optional)..."
                                                                        value={globalNotes}
                                                                        onChange={(e) => setGlobalNotes(e.target.value)}
                                                                    />
                                                                </div>

                                                                {/* Slots below Start Time / End Time: Pending Draft + Already Reserved */}
                                                                <div className="space-y-3 py-2 border-t border-gray-100">
                                                                    {draftSlots.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-1">Pending Draft</p>
                                                                            <div className="grid grid-cols-1 gap-1">
                                                                                {draftSlots
                                                                                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                                                                                    .map(s => (
                                                                                        <div key={`draft-${s.date}:${s.startTime}`} className="flex items-center justify-between bg-white border border-blue-100 rounded-md py-1 px-2 text-[10px] text-blue-500 font-bold transition-all hover:border-red-200 group">
                                                                                            <span>{s.startTime} - {s.endTime}</span>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setDraftSlots(prev => prev.filter(ds => ds.startTime !== s.startTime));
                                                                                                }}
                                                                                                className="text-blue-300 group-hover:text-red-500 transition-colors"
                                                                                            >
                                                                                                <X className="w-2.5 h-2.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {(() => {
                                                                        const reservedForDay = slots
                                                                            .filter(s => s.repId === selectedRepId && s.date === format(selectedDate, 'yyyy-MM-dd') && s.status === 'reserved' && (!selectedGigId || s.gigId === selectedGigId))
                                                                            .sort((a, b) => a.startTime.localeCompare(b.startTime));
                                                                        if (reservedForDay.length === 0) return null;
                                                                        return (
                                                                            <div className="space-y-2">
                                                                                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest px-1">Reserved</p>
                                                                                <div className="grid grid-cols-1 gap-1">
                                                                                    {reservedForDay.map(s => (
                                                                                        <div key={s.id} className="flex items-center justify-between bg-green-50/80 border border-green-100 rounded-md py-1 px-2 text-[10px] text-green-700 font-bold group">
                                                                                            <span>{s.startTime} - {s.endTime}</span>
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className="text-[8px] text-green-500 uppercase group-hover:hidden">Reserved</span>
                                                                                                <button
                                                                                                    onClick={() => handleSlotCancel(s.id)}
                                                                                                    className="hidden group-hover:flex items-center text-[8px] text-red-500 uppercase hover:text-red-700 font-black"
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    <button
                                                        onClick={handleQuickReserve}
                                                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={!selectedGigId || draftSlots.length === 0}
                                                    >
                                                        Reserve Time Block
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>



                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                                <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center">
                                    <div className="w-2 h-7 bg-blue-600 rounded-full mr-4"></div>
                                    Admin Command Center
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                                        <h3 className="text-sm font-bold opacity-80 uppercase mb-2">Total REPs</h3>
                                        <p className="text-4xl font-black">{reps.length}</p>
                                    </div>
                                    <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
                                        <h3 className="text-sm font-bold opacity-80 uppercase mb-2">Total Partners</h3>
                                        <p className="text-4xl font-black">{sampleCompanies.length}</p>
                                    </div>
                                    <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                                        <h3 className="text-sm font-bold opacity-80 uppercase mb-2">Total Active Gigs</h3>
                                        <p className="text-4xl font-black">{gigs.length}</p>
                                    </div>
                                </div>
                            </div>

                            {showAttendancePanel && (
                                <AttendanceReport
                                    reps={reps}
                                    slots={slots}
                                />
                            )}

                            {showAIPanel && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <WorkloadPrediction slots={slots} />
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                                        <div className="flex items-center mb-8">
                                            <div className="p-3 bg-purple-100 rounded-2xl mr-4">
                                                <Brain className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <h2 className="text-xl font-extrabold text-gray-900">AI Global Insights</h2>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                                                <h3 className="font-black text-purple-900 mb-2 uppercase text-xs">Scheduling Efficiency</h3>
                                                <p className="text-sm text-purple-800 leading-relaxed font-medium">
                                                    Global operation efficiency is at <span className="text-xl font-black">78%</span>.
                                                    Predicted optimization could increase output by 14% next week.
                                                </p>
                                            </div>
                                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                                <h3 className="font-black text-blue-900 mb-2 uppercase text-xs">Resource Allocation</h3>
                                                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                                    Resource utilization is peak during 10:00 - 15:00 UTC.
                                                    Recommended shift re-distribution for evening gigs.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-wider">REP Performance List</h2>
                                    <div className="space-y-4">
                                        {reps.map(rep => {
                                            const repSlots = slots.filter(slot => slot.repId === rep.id && slot.status === 'reserved');
                                            const totalHours = repSlots.reduce((sum, slot) => sum + slot.duration, 0);

                                            return (
                                                <div key={rep.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center">
                                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mr-4 overflow-hidden border border-gray-100">
                                                            {rep.avatar ? (
                                                                <img src={rep.avatar} alt={rep.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900">{rep.name}</h4>
                                                            <p className="text-xs text-gray-500 font-bold">{rep.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black text-blue-600">{totalHours}h</p>
                                                        <div className="flex space-x-2 mt-1">
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg">P: {rep.performanceScore}</span>
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-lg">A: {rep.attendanceScore}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-wider">Partner Presence</h2>
                                    <div className="space-y-4">
                                        {sampleCompanies.map(company => {
                                            const companySlots = slots.filter(slot => {
                                                const gig = gigs.find(g => g.id === slot.gigId);
                                                return gig?.company === company.name && slot.status === 'reserved';
                                            });

                                            const totalHours = companySlots.reduce((sum, slot) => sum + slot.duration, 0);
                                            const uniqueReps = new Set(companySlots.map(slot => slot.repId)).size;

                                            return (
                                                <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center">
                                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mr-4 overflow-hidden border border-gray-100">
                                                            {company.logo ? (
                                                                <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-1" />
                                                            ) : (
                                                                <Building className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-gray-900">{company.name}</h4>
                                                            <p className="text-xs text-gray-500 font-bold">{uniqueReps} REPs Active</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black text-indigo-600">{totalHours}h</p>
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg mt-1 inline-block">Priority {company.priority}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
