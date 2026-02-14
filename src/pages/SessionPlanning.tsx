import { useState, useMemo, useEffect } from 'react';
import { Calendar } from '../components/scheduler/Calendar';
import { TimeSlotGrid } from '../components/scheduler/TimeSlotGrid';
import { TimeSlot, Gig, WeeklyStats, Rep, UserRole, Company, AttendanceRecord } from '../types/scheduler';
import { Building, Clock, Briefcase, AlertCircle, Users, LayoutDashboard, Brain } from 'lucide-react';
import { SlotActionPanel } from '../components/scheduler/SlotActionPanel';
import { RepSelector } from '../components/scheduler/RepSelector';
import { CompanyView } from '../components/scheduler/CompanyView';
import { AIRecommendations } from '../components/scheduler/AIRecommendations';
import { OptimalTimeHeatmap } from '../components/scheduler/OptimalTimeHeatmap';
import { PerformanceMetrics } from '../components/scheduler/PerformanceMetrics';
import { WorkloadPredictionComponent as WorkloadPrediction } from '../components/scheduler/WorkloadPrediction';
import { AttendanceTracker } from '../components/scheduler/AttendanceTracker';
import { AttendanceScorecard } from '../components/scheduler/AttendanceScorecard';
import { AttendanceReport } from '../components/scheduler/AttendanceReport';
import { initializeAI } from '../services/schedulerAiService';
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getAgentId } from '../utils/authUtils';

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

    const [showAIPanel] = useState<boolean>(false);
    const [showAttendancePanel] = useState<boolean>(false);
    const [reps, setReps] = useState<Rep[]>(sampleReps);

    const [gigs, setGigs] = useState<Gig[]>([]);
    const [loadingGigs, setLoadingGigs] = useState<boolean>(true);

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
                    if (mappedGigs.length > 0) {
                        setSelectedGigId(mappedGigs[0].id);
                    }
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

                    if (mappedGigs.length > 0 && !selectedGigId) {
                        setSelectedGigId(mappedGigs[0].id);
                    }
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

    const selectedRep = useMemo(() => {
        return reps.find(rep => rep.id === selectedRepId) || reps[0];
    }, [selectedRepId, reps]);

    const weeklyStats = useMemo<WeeklyStats>(() => {
        const stats: WeeklyStats = {
            totalHours: 0,
            gigBreakdown: {},
            availableSlots: 0,
            reservedSlots: 0,
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

        return stats;
    }, [slots, userRole, selectedRepId]);

    const handleSlotUpdate = (updates: Partial<TimeSlot>) => {
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

        const existingSlotIndex = slots.findIndex((slot) => slot.id === slotWithRep.id);
        if (existingSlotIndex >= 0) {
            setSlots((prev) => [
                ...prev.slice(0, existingSlotIndex),
                slotWithRep,
                ...prev.slice(existingSlotIndex + 1),
            ]);
            setNotification({
                message: 'Time slot updated successfully',
                type: 'success'
            });
        } else {
            setSlots((prev) => [...prev, slotWithRep]);
            setNotification({
                message: 'New time slot created',
                type: 'success'
            });
        }

        setTimeout(() => setNotification(null), 3000);
    };

    const handleSlotCancel = (slotId: string) => {
        setSlots((prev) =>
            prev.map((slot) =>
                slot.id === slotId ? { ...slot, status: 'cancelled' } : slot
            )
        );
        setNotification({
            message: 'Time slot cancelled',
            type: 'success'
        });

        setTimeout(() => setNotification(null), 3000);

        if (selectedSlot?.id === slotId) {
            setSelectedSlot(null);
        }
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setSelectedSlot(slot);
    };

    const handleGigSelect = (gigId: string) => {
        const optimalHour = selectedRep.preferredHours?.start || 9;
        const timeString = `${optimalHour.toString().padStart(2, '0')}:00`;
        const existingSlot = slots.find(
            (s) =>
                s.date === format(selectedDate, 'yyyy-MM-dd') &&
                s.startTime === timeString &&
                s.repId === selectedRepId
        );

        if (existingSlot) {
            handleSlotUpdate({
                ...existingSlot,
                gigId,
                status: 'reserved' as const
            });
        } else {
            handleSlotUpdate({
                id: crypto.randomUUID(),
                startTime: timeString,
                endTime: `${(optimalHour + 1).toString().padStart(2, '0')}:00`,
                date: format(selectedDate, 'yyyy-MM-dd'),
                status: 'reserved' as const,
                duration: 1,
                gigId,
                repId: selectedRepId,
            } as TimeSlot);
        }
    };

    const handleOptimalHourSelect = (hour: number) => {
        const element = document.getElementById(`time-slot-${hour}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }

        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        const existingSlot = slots.find(
            (s) =>
                s.date === format(selectedDate, 'yyyy-MM-dd') &&
                s.startTime === timeString &&
                s.repId === selectedRepId
        );

        if (existingSlot) {
            setSelectedSlot(existingSlot);
        } else {
            const newSlot = {
                id: crypto.randomUUID(),
                startTime: timeString,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                date: format(selectedDate, 'yyyy-MM-dd'),
                status: 'available' as const,
                duration: 1,
                repId: selectedRepId,
            } as TimeSlot;

            handleSlotUpdate(newSlot);
            setSelectedSlot(newSlot);
        }
    };

    const handleAttendanceUpdate = (slotId: string, attended: boolean, notes?: string) => {
        setSlots(prev => prev.map(slot =>
            slot.id === slotId
                ? { ...slot, attended, attendanceNotes: notes }
                : slot
        ));

        const slot = slots.find(s => s.id === slotId);
        if (slot) {
            const repIndex = reps.findIndex(r => r.id === slot.repId);
            if (repIndex >= 0) {
                const rep = reps[repIndex];
                const attendanceRecord: AttendanceRecord = {
                    date: slot.date,
                    slotId,
                    attended,
                    reason: notes
                };

                const updatedRep = {
                    ...rep,
                    attendanceHistory: [...(rep.attendanceHistory || []), attendanceRecord]
                };

                const attendedCount = updatedRep.attendanceHistory.filter(record => record.attended).length;
                const totalCount = updatedRep.attendanceHistory.length;
                const attendanceScore = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

                updatedRep.attendanceScore = attendanceScore;

                setReps(prev => [
                    ...prev.slice(0, repIndex),
                    updatedRep,
                    ...prev.slice(repIndex + 1)
                ]);
            }
        }

        setNotification({
            message: `Attendance marked as ${attended ? 'present' : 'missed'}`,
            type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
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
                <div className="max-w-7xl mx-auto px-4 py-6">
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

            <main className="max-w-7xl mx-auto px-4 py-8">
                {userRole === 'company' ? (
                    <div className="grid grid-cols-1 gap-8">
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <Calendar
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                    slots={slots}
                                />
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                    <div className="w-2 h-6 bg-blue-600 rounded-full mr-3"></div>
                                    Gig Overview
                                </h2>
                                <div className="space-y-6">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">REPs Scheduled</p>
                                        <p className="text-2xl font-black text-gray-900">
                                            {new Set(slots
                                                .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                .map(slot => slot.repId)
                                            ).size}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">Total Hours Commited</p>
                                        <p className="text-2xl font-black text-gray-900">
                                            {slots
                                                .filter(slot => slot.gigId === selectedGigId && slot.status === 'reserved')
                                                .reduce((sum, slot) => sum + slot.duration, 0)}h
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedGigId && (
                            <CompanyView
                                company={gigs.find(g => g.id === selectedGigId)?.name || ''}
                                gigs={gigs.filter(g => g.id === selectedGigId).map(g => ({ ...g, company: g.name }))}
                                slots={slots}
                                reps={reps}
                                selectedDate={selectedDate}
                            />
                        )}
                    </div>
                ) : userRole === 'rep' ? (
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 gap-8">
                            <RepSelector
                                reps={reps}
                                selectedRepId={selectedRepId}
                                onSelectRep={setSelectedRepId}
                            />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <Calendar
                                        selectedDate={selectedDate}
                                        onDateSelect={setSelectedDate}
                                        slots={slots.filter(slot => slot.repId === selectedRepId)}
                                    />

                                    <div className="mt-10">
                                        <TimeSlotGrid
                                            date={selectedDate}
                                            slots={slots.filter(slot => slot.repId === selectedRepId)}
                                            gigs={gigs}
                                            onSlotUpdate={handleSlotUpdate}
                                            onSlotCancel={handleSlotCancel}
                                            onSlotSelect={handleSlotSelect}
                                            selectedSlot={selectedSlot}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                            <div className="w-2 h-6 bg-indigo-600 rounded-full mr-3"></div>
                                            Weekly Overview
                                        </h2>
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="p-4 bg-green-50 rounded-xl text-center">
                                                <p className="text-xs text-green-600 font-bold uppercase mb-1">Available</p>
                                                <p className="text-2xl font-black text-green-900">{weeklyStats.availableSlots}</p>
                                            </div>
                                            <div className="p-4 bg-blue-50 rounded-xl text-center">
                                                <p className="text-xs text-blue-600 font-bold uppercase mb-1">Reserved</p>
                                                <p className="text-2xl font-black text-blue-900">{weeklyStats.reservedSlots}</p>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Gig Hours Breakdown</h3>
                                        <div className="space-y-3">
                                            {Object.entries(weeklyStats.gigBreakdown).map(([gigId, hours]) => {
                                                const gig = gigs.find(g => g.id === gigId);
                                                return (
                                                    <div key={gigId} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl group transition-all hover:bg-gray-100">
                                                        <div className="flex items-center">
                                                            <div
                                                                className="w-4 h-4 rounded-full mr-3 shadow-sm"
                                                                style={{ backgroundColor: gig?.color || '#ccc' }}
                                                            ></div>
                                                            <span className="text-sm font-bold text-gray-700">{gig?.name || 'Unknown Gig'}</span>
                                                        </div>
                                                        <span className="text-lg font-black text-gray-900">{hours}h</span>
                                                    </div>
                                                );
                                            })}
                                            {Object.keys(weeklyStats.gigBreakdown).length === 0 && (
                                                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">No gig hours recorded this week.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                            <div className="w-2 h-6 bg-blue-600 rounded-full mr-3"></div>
                                            Quick Options
                                        </h2>
                                        <SlotActionPanel
                                            maxHours={10}
                                            slot={selectedSlot || (slots.find(s => s.repId === selectedRepId) || {} as any)}
                                            availableGigs={gigs}
                                            onUpdate={handleSlotUpdate}
                                            onClear={() => handleSlotCancel(selectedSlot?.id || '')}
                                        />
                                    </div>

                                </div>
                            </div>
                        </div>

                        {showAttendancePanel && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <AttendanceScorecard
                                    rep={selectedRep}
                                    slots={slots.filter(s => s.repId === selectedRepId)}
                                />
                                <AttendanceTracker
                                    slots={slots.filter(slot => slot.repId === selectedRepId)}
                                    reps={reps}
                                    selectedDate={selectedDate}
                                    onAttendanceUpdate={handleAttendanceUpdate}
                                />
                            </div>
                        )}

                        {showAIPanel && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <AIRecommendations
                                    rep={selectedRep}
                                    gigs={gigs}
                                    slots={slots.filter(s => s.repId === selectedRepId)}
                                    onSelectGig={handleGigSelect}
                                />
                                <OptimalTimeHeatmap
                                    rep={selectedRep}
                                    slots={slots.filter(s => s.repId === selectedRepId)}
                                    onSelectHour={handleOptimalHourSelect}
                                />
                                <PerformanceMetrics
                                    rep={selectedRep}
                                    slots={slots.filter(s => s.repId === selectedRepId)}
                                />
                            </div>
                        )}
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
                )
                }
            </main >
        </div >
    );
}
