import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from '../components/scheduler/Calendar';
import { TimeSlotGrid } from '../components/scheduler/TimeSlotGrid';
import { TimeSlot, Project, WeeklyStats, Rep, UserRole, Company, AttendanceRecord } from '../types/scheduler';
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
import { fetchProfileFromAPI } from '../utils/profileUtils';

// Define Gig type locally if not available, or import if shared
interface Gig {
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

// Map Gig to scheduler Project type
const mapGigToProject = (gig: Gig): Project => {
    return {
        id: gig._id || crypto.randomUUID(),
        name: gig.title,
        description: gig.description,
        company: gig.companyName || 'Unknown Company',
        color: stringToColor(gig._id || gig.title),
        skills: gig.requiredSkills?.map(s => s.name) || [],
        priority: 'medium' // Default priority, could be derived
    };
};

// Placeholder stats for demo purposes in REP view
const CURRENT_REP_ID = '1';

const sampleReps: Rep[] = [
    {
        id: '1',
        name: 'Current User', // Will be updated with profile data
        email: 'user@harx.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        specialties: ['General'],
        performanceScore: 88,
        preferredHours: { start: 9, end: 17 },
        attendanceScore: 95,
        attendanceHistory: []
    },
    // Add dummy reps for comparison views if needed
    {
        id: '2',
        name: 'Team Member 1',
        email: 'team1@harx.com',
        avatar: '',
        specialties: ['Sales'],
        performanceScore: 90,
        preferredHours: { start: 8, end: 16 },
        attendanceScore: 88,
        attendanceHistory: []
    }
];

export function SessionPlanning() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Default to REP view for DashRepFront
    const [userRole, setUserRole] = useState<UserRole>('rep');
    const [selectedRepId, setSelectedRepId] = useState<string>(CURRENT_REP_ID);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [aiInitialized, setAiInitialized] = useState<boolean>(false);
    const [showAIPanel, setShowAIPanel] = useState<boolean>(false);
    const [showAttendancePanel, setShowAttendancePanel] = useState<boolean>(false);
    const [reps, setReps] = useState<Rep[]>(sampleReps);

    // Real Gigs Data
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingGigs, setLoadingGigs] = useState<boolean>(true);

    // Fetch gigs tailored for the REP (Active gigs)
    useEffect(() => {
        const fetchGigs = async () => {
            // In DashRepFront, we usually fetch gigs assigned to the REP
            // For now, we'll try to fetch all gigs to show availability, or rely on a specific endpoint

            try {
                setLoadingGigs(true);
                const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';

                let fetchedProjects: Project[] = [];

                // Strategy 1: Try to get gigs for specific rep if endpoint exists (mocking logic here)
                // const response = await axios.get(`${apiUrl}/gigs/rep/${repId}`);

                // Strategy 2: Get all gigs as fallback (or "My Gigs" logic)
                // Since we don't have a guaranteed "My Gigs" endpoint in context, we might reuse 'company' endpoint with a placeholder or just fetch all
                // For SAFETY: Let's assume we can fetch gigs relevant to the user or a default set.
                // Trying to fetch from a known company ID for demo if no specific Rep endpoint
                const companyId = Cookies.get('companyId');

                let response;
                if (companyId) {
                    response = await axios.get(`${apiUrl}/gigs/company/${companyId}`);
                } else {
                    // Fallback: Fetch all gigs or a sample if no context
                    response = await axios.get(`${apiUrl}/gigs`); // assuming list endpoint exists
                }

                if (response.data && response.data.data) {
                    // Handle array or paginated response
                    const rawData = Array.isArray(response.data.data) ? response.data.data : response.data.data.gigs || [];
                    fetchedProjects = rawData.map(mapGigToProject);
                } else if (Array.isArray(response.data)) {
                    fetchedProjects = response.data.map(mapGigToProject);
                }

                setProjects(fetchedProjects);
                if (fetchedProjects.length > 0) {
                    setSelectedProjectId(fetchedProjects[0].id);
                }

            } catch (error) {
                console.error('Error fetching gigs:', error);
                setNotification({ message: 'Failed to load Gigs', type: 'error' });
            } finally {
                setLoadingGigs(false);
            }
        };

        // Initialize AI services
        const initAI = async () => {
            const initialized = await initializeAI();
            setAiInitialized(initialized);
        };

        // Update current rep info from profile
        const updateRepProfile = async () => {
            try {
                const profile = await fetchProfileFromAPI();
                if (profile) {
                    setReps(prev => prev.map(r => r.id === CURRENT_REP_ID ? {
                        ...r,
                        name: `${profile.firstName} ${profile.lastName}`.trim() || 'Me',
                        avatar: profile.profilePicture || r.avatar
                    } : r));
                }
            } catch (e) {
                console.warn("Could not load profile for scheduler", e);
            }
        }

        initAI();
        updateRepProfile();
        fetchGigs();
    }, []);

    const selectedRep = useMemo(() => {
        return reps.find(rep => rep.id === selectedRepId) || reps[0];
    }, [selectedRepId, reps]);

    const weeklyStats = useMemo<WeeklyStats>(() => {
        const stats: WeeklyStats = {
            totalHours: 0,
            projectBreakdown: {},
            availableSlots: 0,
            reservedSlots: 0,
        };

        // Filter slots by selected REP if in REP view
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

                if (slot.projectId) {
                    stats.projectBreakdown[slot.projectId] = (stats.projectBreakdown[slot.projectId] || 0) + (slot.duration || 1);
                }
            }
        });

        return stats;
    }, [slots, userRole, selectedRepId]);

    const handleSlotUpdate = (updatedSlot: TimeSlot) => {
        // Ensure the slot has a repId
        const slotWithRep = {
            ...updatedSlot,
            repId: updatedSlot.repId || selectedRepId
        };

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

    const handleProjectSelect = (projectId: string) => {
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
                projectId,
                status: 'reserved'
            });
        } else {
            handleSlotUpdate({
                id: crypto.randomUUID(),
                startTime: timeString,
                endTime: `${(optimalHour + 1).toString().padStart(2, '0')}:00`,
                date: format(selectedDate, 'yyyy-MM-dd'),
                status: 'reserved',
                duration: 1,
                projectId,
                repId: selectedRepId,
            });
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
                status: 'available',
                duration: 1,
                repId: selectedRepId,
            };

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

        setNotification({
            message: `Attendance ${attended ? 'confirmed' : 'marked as missed'}`,
            type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            {notification && (
                <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p>{notification.message}</p>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Clock className="w-8 h-8 text-blue-600 mr-3" />
                        <h1 className="text-3xl font-bold text-gray-900">Session Planning</h1>
                        {loadingGigs && <span className="ml-4 text-sm text-gray-500 animate-pulse">Loading Gigs...</span>}
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Weekly Hours</p>
                            <p className="text-lg font-semibold">{weeklyStats.totalHours}h</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Active Gigs</p>
                            <p className="text-lg font-semibold">{Object.keys(weeklyStats.projectBreakdown).length}</p>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-colors ${showAIPanel
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <Brain className="w-4 h-4 mr-2" />
                        AI Assistant {showAIPanel ? 'On' : 'Off'}
                    </button>
                    <button
                        onClick={() => setShowAttendancePanel(!showAttendancePanel)}
                        className={`px-4 py-2 rounded-md flex items-center shadow-sm transition-colors ${showAttendancePanel
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Attendance {showAttendancePanel ? 'On' : 'Off'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                slots={slots.filter(slot => slot.repId === selectedRepId)}
                                view="month"
                            />
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">My Schedule Stats</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Available Slots</span>
                                    <span className="font-medium text-lg">{weeklyStats.availableSlots}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Reserved Slots</span>
                                    <span className="font-bold text-lg text-blue-600">{weeklyStats.reservedSlots}</span>
                                </div>

                                <hr className="my-2 border-gray-100" />

                                <h3 className="font-medium text-gray-700">Gig Breakdown</h3>
                                <div className="space-y-3">
                                    {Object.entries(weeklyStats.projectBreakdown).length === 0 ? (
                                        <p className="text-gray-400 text-sm italic">No hours scheduled yet</p>
                                    ) : (
                                        Object.entries(weeklyStats.projectBreakdown).map(([projectId, hours]) => {
                                            const project = projects.find(p => p.id === projectId);
                                            return (
                                                <div key={projectId} className="flex justify-between items-center">
                                                    <div className="flex items-center">
                                                        <div
                                                            className="w-3 h-3 rounded-full mr-2"
                                                            style={{ backgroundColor: project?.color || '#ccc' }}
                                                        ></div>
                                                        <span className="text-gray-600 text-sm truncate max-w-[150px]">{project?.name || 'Unknown Gig'}</span>
                                                    </div>
                                                    <span className="font-medium">{hours}h</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <hr className="my-2 border-gray-100" />
                                <h3 className="font-medium text-gray-700">Quick Reserve</h3>
                                <SlotActionPanel
                                    maxHours={10}
                                    slot={selectedSlot || slots[0] || {} as any}
                                    availableProjects={projects}
                                    onUpdate={handleSlotUpdate}
                                    onClear={() => handleSlotCancel(selectedSlot?.id || '')}
                                />
                            </div>
                        </div>
                    </div>

                    {showAttendancePanel && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <AttendanceScorecard
                                rep={selectedRep}
                                slots={slots}
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div>
                                <AIRecommendations
                                    rep={selectedRep}
                                    projects={projects}
                                    slots={slots}
                                    onSelectProject={handleProjectSelect}
                                />
                            </div>
                            <div>
                                <OptimalTimeHeatmap
                                    rep={selectedRep}
                                    slots={slots}
                                    onSelectHour={handleOptimalHourSelect}
                                />
                            </div>
                            <div>
                                <PerformanceMetrics
                                    rep={selectedRep}
                                    slots={slots}
                                />
                            </div>
                        </div>
                    )}

                    <TimeSlotGrid
                        selectedSlotId={selectedSlot?.id || null}
                        slots={slots.filter(slot => slot.repId === selectedRepId)}
                        projects={projects}
                        onSlotClick={(id) => handleSlotSelect(slots.find(s => s.id === id)!)}
                    />
                </div>
            </div>
        </div>
    );
}
