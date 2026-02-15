import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Users, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { slotApi, Slot, Reservation } from '../../services/api/slotApi';
import { getAgentId } from '../../utils/authUtils';

interface AvailableSlotsGridProps {
    gigId: string | null | undefined;
    selectedDate: Date;
    onReservationMade?: () => void;
}

export function AvailableSlotsGrid({ gigId, selectedDate, onReservationMade }: AvailableSlotsGridProps) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [reservingSlotId, setReservingSlotId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    
    let repId = '';
    try {
        repId = getAgentId() || '';
    } catch (error) {
        console.error('Error getting agent ID:', error);
    }

    useEffect(() => {
        if (!gigId || gigId === '') return;
        loadSlots();
        loadReservations();
    }, [gigId, selectedDate]);

    const loadSlots = async () => {
        if (!gigId || gigId === '' || !selectedDate) return;
        try {
            setLoading(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const fetchedSlots = await slotApi.getSlots(gigId, dateStr);
            setSlots(Array.isArray(fetchedSlots) ? fetchedSlots : []);
        } catch (error: any) {
            console.error('Error loading slots:', error);
            setMessage({ 
                text: error.response?.data?.message || error.message || 'Failed to load available slots', 
                type: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const loadReservations = async () => {
        if (!repId || repId === '' || !gigId || gigId === '') return;
        try {
            const fetchedReservations = await slotApi.getReservations(repId, gigId);
            setReservations(Array.isArray(fetchedReservations) ? fetchedReservations : []);
        } catch (error: any) {
            console.error('Error loading reservations:', error);
            // Don't show error for reservations, just log it
        }
    };

    const handleReserve = async (slot: Slot) => {
        if (!repId) {
            setMessage({ text: 'Please log in to reserve slots', type: 'error' });
            return;
        }

        if (!slot._id) {
            setMessage({ text: 'Invalid slot', type: 'error' });
            return;
        }

        // Check if already reserved
        const existingReservation = reservations.find(r => r.slotId === slot._id);
        if (existingReservation) {
            setMessage({ text: 'You already have a reservation for this slot', type: 'error' });
            return;
        }

        setReservingSlotId(slot._id);
        setMessage(null);

        try {
            await slotApi.reserveSlot(slot._id, repId);
            setMessage({ text: 'Slot reserved successfully!', type: 'success' });
            await loadSlots();
            await loadReservations();
            if (onReservationMade) {
                setTimeout(() => {
                    try {
                        onReservationMade();
                    } catch (err) {
                        console.error('Error in onReservationMade callback:', err);
                    }
                    setMessage(null);
                }, 2000);
            }
        } catch (error: any) {
            console.error('Error reserving slot:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to reserve slot';
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setReservingSlotId(null);
        }
    };

    const handleCancel = async (reservation: Reservation) => {
        if (!reservation._id) return;
        try {
            await slotApi.cancelReservation(reservation._id);
            setMessage({ text: 'Reservation cancelled', type: 'success' });
            await loadSlots();
            await loadReservations();
            if (onReservationMade) {
                setTimeout(() => {
                    try {
                        onReservationMade();
                    } catch (err) {
                        console.error('Error in onReservationMade callback:', err);
                    }
                    setMessage(null);
                }, 2000);
            }
        } catch (error: any) {
            console.error('Error cancelling reservation:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to cancel reservation';
            setMessage({ text: errorMsg, type: 'error' });
        }
    };

    if (!gigId || gigId === '' || !selectedDate) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
                Select a gig to see available slots
            </div>
        );
    }

    let dateStr = '';
    let daySlots: Slot[] = [];
    let isPastDate = false;
    
    try {
        dateStr = format(selectedDate, 'yyyy-MM-dd');
        daySlots = Array.isArray(slots) ? slots.filter(s => s && s.date === dateStr) : [];
        isPastDate = dateStr < format(new Date(), 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date:', error);
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-red-500 text-sm">
                Error: Invalid date format
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Available Slots - {dateStr ? format(selectedDate, 'MMMM d, yyyy') : 'Loading...'}
                        </h3>
                    </div>
                    {isPastDate && (
                        <span className="text-xs text-amber-600 font-medium">Past date - viewing only</span>
                    )}
                </div>
            </div>

            {message && (
                <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="divide-y divide-gray-50">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading slots...</div>
                ) : daySlots.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No slots available for this date. The company may need to generate slots first.
                    </div>
                ) : (
                    daySlots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => {
                            const reservation = reservations.find(r => r.slotId === slot._id);
                            const isReserved = !!reservation;
                            const isAvailable = slot.status === 'available' && slot.reservedCount < slot.capacity;
                            const remaining = slot.capacity - slot.reservedCount;

                            return (
                                <div
                                    key={slot._id}
                                    className={`p-5 transition-all ${
                                        isReserved 
                                            ? 'bg-blue-50/50' 
                                            : isAvailable 
                                                ? 'bg-emerald-50/30' 
                                                : 'bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <span className="text-sm font-bold text-gray-900">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-600">{slot.duration}h</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span className={`font-semibold ${
                                                        remaining > 0 ? 'text-emerald-600' : 'text-red-600'
                                                    }`}>
                                                        {remaining} / {slot.capacity} available
                                                    </span>
                                                </div>
                                            </div>
                                            {isReserved && (
                                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="font-medium">You have reserved this slot</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isReserved ? (
                                                <button
                                                    onClick={() => reservation && handleCancel(reservation)}
                                                    className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            ) : isAvailable && !isPastDate ? (
                                                <button
                                                    onClick={() => handleReserve(slot)}
                                                    disabled={reservingSlotId === slot._id}
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {reservingSlotId === slot._id ? 'Reserving...' : 'Reserve'}
                                                </button>
                                            ) : (
                                                <span className="px-4 py-2 text-xs font-semibold text-gray-400 bg-gray-100 rounded-xl">
                                                    {slot.status === 'full' ? 'Full' : 'Unavailable'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
