import { useState, useMemo, useEffect } from 'react';
import { HorizontalCalendar } from '../components/scheduler/HorizontalCalendar';
import { TimeSlotGrid } from '../components/scheduler/TimeSlotGrid';
import { TimeSlot, Gig, WeeklyStats, Rep, UserRole, Company } from '../types/scheduler';
import { Building, Clock, Briefcase, AlertCircle, Users, LayoutDashboard, Brain, X } from 'lucide-react';
import { RepSelector } from '../components/scheduler/RepSelector';
import { CompanyView } from '../components/scheduler/CompanyView';
import { WorkloadPredictionComponent as WorkloadPrediction } from '../components/scheduler/WorkloadPrediction';
import { AttendanceReport } from '../components/scheduler/AttendanceReport';
import { initializeAI } from '../services/schedulerAiService';
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getAgentId } from '../utils/authUtils';
import { schedulerApi } from '../services/api/scheduler';

// Define ExternalGig type locally for API response mapping
interface ExternalGig {
    _id: string;
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

// Map ExternalGig to scheduler Gig type
const mapExternalGigToSchedulerGig = (gig: ExternalGig): Gig => {
    return {
        id: gig._id || crypto.randomUUID(),
        name: gig.title,
        description: gig.description,
        company: gig.companyName || 'Unknown Company',
        color: stringToColor(gig._id || gig.title),
        skills: gig.requiredSkills?.map(s => s.name) || [],
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
    const [userRole, setUserRole] = useState<UserRole>('rep');

    const [selectedRepId, setSelectedRepId] = useState<string>(() => {
        const agendId = getAgentId();
        return agendId || sampleReps[0].id;
    });

    const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [reps, setReps] = useState<Rep[]>([]);
    const [draftSlots, setDraftSlots] = useState<Partial<TimeSlot>[]>([]);
    const [quickStart, setQuickStart] = useState<string>('');
    const [quickEnd, setQuickEnd] = useState<string>('');
    const [loadingGigs, setLoadingGigs] = useState<boolean>(true);
    const [loadingReps, setLoadingReps] = useState<boolean>(false);

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
                        color: stringToColor(gigAgent.gigId._id || gigAgent.gigId.title),
                        skills: [],
                        priority: 'medium',
                        availability: gigAgent.gigId.availability
                    }));

                    setGigs(mappedGigs);
                    // Removed auto-selection of first gig
                }
            } catch (error) {
                console.error('Error fetching enrolled gigs:', error);
            } finally {
                // Done
            }
        };

        if (userRole === 'rep') {
            fetchEnrolledGigs();
        }
    }, [selectedRepId, userRole]);

    // Fetch specific REP's slots (for REP view)
    useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedRepId || userRole !== 'rep') return;
            try {
                const fetchedSlots = await schedulerApi.getTimeSlots(selectedRepId);
                setSlots(fetchedSlots);
            } catch (error) {
                console.error('Error fetching slots:', error);
            }
        };
        fetchSlots();
    }, [selectedRepId, userRole]);

    // Fetch Global Gig Data (for Company/Admin view)
    useEffect(() => {
        const fetchGlobalGigData = async () => {
            if (!selectedGigId || userRole === 'rep') return;

            try {
                setLoadingReps(true);
                // 1. Fetch all agents enrolled in this gig
                const gigAgents = await schedulerApi.getGigAgents(selectedGigId, 'enrolled');
                const mappedReps = gigAgents.map(ga => ({
                    id: ga.agentId._id,
                    name: ga.agentId.personalInfo?.firstName + ' ' + ga.agentId.personalInfo?.lastName,
                    email: ga.agentId.personalInfo?.email || '',
                    avatar: ga.agentId.personalInfo?.avatar,
                    specialties: ga.agentId.professionalSummary?.industries || [],
                    performanceScore: 85, // Placeholder
                    attendanceScore: 90 // Placeholder
                }));
                setReps(mappedReps);

                // 2. Fetch all slots for this gig (Global View)
                const globalSlots = await schedulerApi.getTimeSlots(undefined, selectedGigId);
                setSlots(globalSlots);
            } catch (error) {
                console.error('Error fetching global gig data:', error);
            } finally {
                setLoadingReps(false);
            }
        };

        fetchGlobalGigData();
    }, [selectedGigId, userRole, selectedDate]);

    // Sync Dropdowns with Draft Range
    useEffect(() => {
        if (draftSlots.length > 0) {
            const sorted = [...draftSlots].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
            const minStart = sorted[0].startTime || '';
            const maxEnd = sorted[sorted.length - 1].endTime || '';
            setQuickStart(minStart);
            setQuickEnd(maxEnd);
        } else {
            setQuickStart('');
            setQuickEnd('');
        }
    }, [draftSlots]);

    const selectedRep = useMemo(() => {
        return reps.find(rep => rep.id === selectedRepId) || reps[0] || sampleReps[0];
    }, [selectedRepId, reps]);

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

    const handleTimeSelect = (time: string) => {
        const hour = parseInt(time.split(':')[0]);

        // Strategy: First click sets Start, second sets End (if later)
        if (!quickStart || (quickStart && quickEnd)) {
            setQuickStart(time);
            setQuickEnd(`${(hour + 1).toString().padStart(2, '0')}:00`);

            // For multi-slot support, we also toggle the individual block
            const isAlreadyDrafted = draftSlots.some(s => s.date === format(selectedDate, 'yyyy-MM-dd') && s.startTime === time);
            if (isAlreadyDrafted) {
                setDraftSlots(prev => prev.filter(s => !(s.date === format(selectedDate, 'yyyy-MM-dd') && s.startTime === time)));
            } else {
                setDraftSlots(prev => [...prev, {
                    id: crypto.randomUUID(),
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    startTime: time,
                    endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                    duration: 1,
                    repId: selectedRepId,
                    status: 'reserved',
                    gigId: selectedGigId || undefined
                }]);
            }
        } else {
            const startH = parseInt(quickStart.split(':')[0]);
            if (hour >= startH) {
                const newEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
                setQuickEnd(newEnd);

                // Add all slots in the range to draftSlots
                const newRange: Partial<TimeSlot>[] = [];
                for (let h = startH; h <= hour; h++) {
                    const hStr = `${h.toString().padStart(2, '0')}:00`;
                    const endHStr = `${(h + 1).toString().padStart(2, '0')}:00`;
                    if (!draftSlots.some(s => s.date === format(selectedDate, 'yyyy-MM-dd') && s.startTime === hStr)) {
                        newRange.push({
                            id: crypto.randomUUID(),
                            date: format(selectedDate, 'yyyy-MM-dd'),
                            startTime: hStr,
                            endTime: endHStr,
                            duration: 1,
                            repId: selectedRepId,
                            status: 'reserved',
                            gigId: selectedGigId || undefined
                        });
                    }
                }
                setDraftSlots(prev => [...prev, ...newRange]);
            } else {
                // Clicked earlier, reset start
                setQuickStart(time);
                setQuickEnd(`${(hour + 1).toString().padStart(2, '0')}:00`);
            }
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
            await schedulerApi.upsertTimeSlot(slotWithRep);
            const updatedSlots = await schedulerApi.getTimeSlots(selectedRepId);
            setSlots(updatedSlots);

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
            await schedulerApi.cancelTimeSlot(slotId);
            const updatedSlots = await schedulerApi.getTimeSlots(selectedRepId);
            setSlots(updatedSlots);

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
                    notes: 'Created via Multi-Slot Selection'
                })
            ));

            const updatedSlots = await schedulerApi.getTimeSlots(selectedRepId);
            setSlots(updatedSlots);

            setNotification({
                message: `${draftSlots.length} time block(s) reserved successfully`,
                type: 'success'
            });

            // Reset draft selection
            setDraftSlots([]);
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
        <div className="min-h-screen bg-gray-100 font-sans">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p>{notification.message}</p>
                </div>
            )}

            <header className="bg-white shadow relative z-10">
                <div className="w-full px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="bg-blue-600 p-2 rounded-xl mr-3 shadow-lg shadow-blue-200">
                                <Building className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">HARX Scheduling</h1>
                                {loadingGigs && <span className="text-xs text-blue-500 font-medium animate-pulse">Updating Gigs...</span>}
                            </div>
                        </div>
                        <div className="flex items-center space-x-12">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Weekly Hours</p>
                                    <p className="text-xl font-bold text-gray-900">{weeklyStats.totalHours}h</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Gigs</p>
                                    <p className="text-xl font-bold text-gray-900">{Object.keys(weeklyStats.gigBreakdown).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex space-x-4 bg-gray-50 p-1 rounded-xl w-fit border border-gray-200">
                        {[
                            { id: 'rep', name: 'REP View', icon: Users },
                            { id: 'company', name: 'Company View', icon: Building },
                            { id: 'admin', name: 'Admin View', icon: LayoutDashboard }
                        ].map(role => (
                            <button
                                key={role.id}
                                onClick={() => setUserRole(role.id as UserRole)}
                                className={`px-4 py-2 rounded-lg flex items-center transition-all duration-200 ${userRole === role.id
                                    ? 'bg-white text-blue-600 shadow-sm font-bold border border-gray-100'
                                    : 'bg-transparent text-gray-500 hover:text-gray-900 font-medium'
                                    }`}
                            >
                                <role.icon className={`w-4 h-4 mr-2 ${userRole === role.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                {role.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="w-full px-8 py-8">
                {userRole === 'company' ? (
                    <div className="space-y-8">
                        <div className="flex space-x-3 overflow-x-auto pb-4 no-scrollbar">
                            {gigs.length === 0 ? (
                                <div className="text-gray-400 italic px-4 py-2 bg-gray-50 rounded-lg border border-dashed border-gray-300 w-full text-center">No active gigs found.</div>
                            ) : (
                                gigs.map(gig => (
                                    <button
                                        key={gig.id}
                                        onClick={() => setSelectedGigId(gig.id)}
                                        className={`px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 shadow-sm ${selectedGigId === gig.id
                                            ? 'bg-blue-600 text-white font-bold ring-4 ring-blue-100'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 font-medium'
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
                                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm text-gray-500 mb-1 font-bold uppercase tracking-wider">REPs Scheduled</p>
                                        <p className="text-3xl font-black text-gray-900">
                                            {new Set(slots
                                                .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                .map(slot => slot.repId)
                                            ).size}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm text-gray-500 mb-1 font-bold uppercase tracking-wider">Total Hours Committed</p>
                                        <p className="text-3xl font-black text-gray-900">
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
                    <div className="space-y-12">
                        <RepSelector
                            reps={reps}
                            selectedRepId={selectedRepId}
                            onSelectRep={setSelectedRepId}
                        />

                        {/* Top Section: Schedule + Weekly Overview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-2">
                                <HorizontalCalendar
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                    slots={slots.filter((slot: TimeSlot) => slot.repId === selectedRepId)}
                                    selectedGigId={selectedGigId}
                                />
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-6 tracking-tight">Weekly Overview</h3>
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

                                        {/* Reserved Slots Detail List (Ranges) */}
                                        <div className="space-y-1 pt-2">
                                            {slots
                                                .filter(s => s.repId === selectedRepId && s.date === format(selectedDate, 'yyyy-MM-dd') && s.status === 'reserved')
                                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                .map(s => (
                                                    <div key={s.id} className="flex justify-between items-center text-[10px] bg-gray-50/50 p-2 rounded-lg border border-gray-100 group">
                                                        <span className="text-gray-500 font-bold">{s.startTime} - {s.endTime}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-green-600 font-black uppercase text-[8px] tracking-widest">Reserved</span>
                                                            <button
                                                                onClick={() => handleSlotCancel(s.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 mb-6 tracking-tight">Project Hours</h3>
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

                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 mb-6 tracking-tight">Quick Reserve</h3>
                                    <div className="space-y-4">
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
                                                                    // Update draft or sync
                                                                }}
                                                            >
                                                                <option value="">Start</option>
                                                                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">End Time</p>
                                                            <select
                                                                className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 py-3 px-4 focus:ring-2 focus:ring-blue-100"
                                                                value={quickEnd}
                                                                onChange={(e) => setQuickEnd(e.target.value)}
                                                            >
                                                                <option value="">End</option>
                                                                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Pending Selection List with cancellation */}
                                                    {draftSlots.length > 0 && (
                                                        <div className="space-y-2 py-2 border-t border-blue-50">
                                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-1">Pending Draft</p>
                                                            <div className="grid grid-cols-1 gap-1">
                                                                {draftSlots
                                                                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                                                                    .map(s => (
                                                                        <div key={`${s.date}:${s.startTime}`} className="flex items-center justify-between bg-white border border-blue-100 rounded-md py-1 px-2 text-[10px] text-blue-500 font-bold transition-all hover:border-red-200 group">
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
                                                </div>
                                            );
                                        })()}
                                        <button
                                            onClick={handleQuickReserve}
                                            className="w-full py-4 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!selectedGigId || draftSlots.length === 0}
                                        >
                                            Reserve Time Block
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Slot Grid */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-gray-700">
                                    <Clock className="w-5 h-5 mr-3" />
                                    <h3 className="text-lg font-bold">
                                        Time Slots for {format(selectedDate, 'MMMM d, yyyy')}
                                    </h3>
                                </div>
                            </div>
                            <TimeSlotGrid
                                date={selectedDate}
                                slots={slots.filter((slot: TimeSlot) => slot.repId === selectedRepId)}
                                gigs={gigs}
                                onSlotUpdate={handleSlotUpdate}
                                onSlotCancel={handleSlotCancel}
                                onSlotSelect={handleSlotSelect}
                                selectedGigId={selectedGigId || ''}
                                onGigFilterChange={(id) => setSelectedGigId(id)}
                                draftSlots={draftSlots}
                                onTimeSelect={handleTimeSelect}
                            />
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
        </div >
    );
}
