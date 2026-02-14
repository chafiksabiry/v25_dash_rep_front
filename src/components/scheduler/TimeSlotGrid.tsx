import { useState } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig } from '../../types/scheduler';
import { X, MessageSquare, Timer, Check, Calendar, AlertTriangle } from 'lucide-react';

interface TimeSlotGridProps {
    date: Date;
    slots: TimeSlot[];
    gigs: Gig[];
    onSlotUpdate: (slot: TimeSlot) => void;
    onSlotCancel: (slotId: string) => void;
    onSlotSelect?: (slot: TimeSlot) => void;
    selectedSlot: TimeSlot | null;
}

export function TimeSlotGrid({
    date,
    slots,
    gigs,
    onSlotUpdate,
    onSlotCancel,
    onSlotSelect,
    selectedSlot
}: TimeSlotGridProps) {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const daySlots = slots.filter((slot) => slot.date === format(date, 'yyyy-MM-dd'));
    const [selectedGigId, setSelectedGigId] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);
    const selectedRepId = slots.length > 0 ? slots[0].repId : '';

    const filteredSlots = selectedGigId === 'all'
        ? daySlots
        : daySlots.filter(slot => slot.gigId === selectedGigId);

    const displaySlots = showCancelled
        ? filteredSlots
        : filteredSlots.filter(slot => slot.status !== 'cancelled');

    const isHourAvailable = (hour: string) => {
        if (selectedGigId === 'all') return true;

        const gig = gigs.find(p => p.id === selectedGigId);
        if (!gig || !gig.availability?.schedule) return true;

        const dayName = format(date, 'EEEE');
        const daySchedule = gig.availability.schedule.find(
            s => s.day.toLowerCase() === dayName.toLowerCase()
        );

        if (!daySchedule) return false;

        const slotHour = parseInt(hour.split(':')[0]);
        const startHour = parseInt(daySchedule.hours.start.split(':')[0]);
        const endHour = parseInt(daySchedule.hours.end.split(':')[0]);

        return slotHour >= startHour && slotHour < endHour;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">
                        {format(date, 'EEEE, MMM d')}
                    </h2>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-3">Filter by Gig</span>
                        <select
                            value={selectedGigId}
                            onChange={(e) => setSelectedGigId(e.target.value)}
                            className="bg-gray-50 border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-blue-500 focus:border-blue-500 py-2 pl-4 pr-10"
                        >
                            <option value="all">All Active Gigs</option>
                            {gigs.map((gig) => (
                                <option key={gig.id} value={gig.id}>
                                    {gig.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="showCancelled"
                            checked={showCancelled}
                            onChange={(e) => setShowCancelled(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showCancelled" className="text-sm font-bold text-gray-500">
                            Show Cancelled
                        </label>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-gray-50">
                {timeSlots
                    .filter(time => isHourAvailable(time) || displaySlots.some(s => s.startTime === time))
                    .map((time) => {
                        const slot = displaySlots.find((s) => s.startTime === time);
                        const gig = slot?.gigId ? gigs.find(p => p.id === slot.gigId) : null;
                        const isSelected = selectedSlot?.id === slot?.id;
                        const available = isHourAvailable(time);

                        return (
                            <div
                                key={time}
                                id={`time-slot-${parseInt(time)}`}
                                className={`flex items-center p-4 transition-all duration-200 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                                    }`}
                                onClick={() => slot && onSlotSelect && onSlotSelect(slot)}
                            >
                                <div className="w-20">
                                    <span className={`text-sm font-black ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {time}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    {slot ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 flex items-center space-x-4">
                                                <div className="relative group">
                                                    <div
                                                        className="absolute -left-4 top-0 bottom-0 w-1 rounded-full transition-all group-hover:w-2"
                                                        style={{ backgroundColor: gig?.color || '#3b82f6' }}
                                                    />
                                                    <select
                                                        value={slot.gigId || ''}
                                                        onChange={(e) =>
                                                            onSlotUpdate({ ...slot, gigId: e.target.value || undefined })
                                                        }
                                                        className="bg-transparent border-none text-sm font-black text-gray-900 focus:ring-0 cursor-pointer py-1"
                                                        disabled={slot.status === 'cancelled'}
                                                    >
                                                        <option value="">No Gig Assigned</option>
                                                        {gigs.map((g) => (
                                                            <option key={g.id} value={g.id}>
                                                                {g.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                                                    <Timer className="w-3.5 h-3.5 text-gray-400 mr-2" />
                                                    <select
                                                        value={slot.duration}
                                                        onChange={(e) =>
                                                            onSlotUpdate({ ...slot, duration: parseInt(e.target.value) })
                                                        }
                                                        className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 p-0"
                                                        disabled={slot.status === 'cancelled'}
                                                    >
                                                        {[1, 2, 3, 4].map((hours) => (
                                                            <option key={hours} value={hours}>
                                                                {hours} hr{hours > 1 ? 's' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSlotUpdate({
                                                            ...slot,
                                                            status: slot.status === 'available' ? 'reserved' : 'available'
                                                        });
                                                    }}
                                                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all hover:scale-105 ${slot.status === 'available'
                                                        ? 'bg-green-100 text-green-700'
                                                        : slot.status === 'reserved'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                    disabled={slot.status === 'cancelled'}
                                                >
                                                    {slot.status === 'available' ? <Calendar className="w-3 h-3 mr-1.5" /> : <Check className="w-3 h-3 mr-1.5" />}
                                                    {slot.status}
                                                </button>

                                                <div className="flex-1 max-w-xs group flex items-center bg-gray-50 px-3 py-1 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 mr-2" />
                                                    <input
                                                        type="text"
                                                        value={slot.notes || ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) =>
                                                            onSlotUpdate({ ...slot, notes: e.target.value })
                                                        }
                                                        placeholder="Internal notes..."
                                                        className="bg-transparent border-none text-xs font-medium text-gray-600 placeholder-gray-400 focus:ring-0 w-full p-0"
                                                        disabled={slot.status === 'cancelled'}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSlotCancel(slot.id);
                                                }}
                                                className="ml-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                disabled={slot.status === 'cancelled'}
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                if (!available) return;
                                                e.stopPropagation();
                                                onSlotUpdate({
                                                    id: crypto.randomUUID(),
                                                    startTime: time,
                                                    endTime: `${(parseInt(time) + 1).toString().padStart(2, '0')}:00`,
                                                    date: format(date, 'yyyy-MM-dd'),
                                                    status: 'available',
                                                    duration: 1,
                                                    repId: selectedRepId,
                                                    gigId: selectedGigId !== 'all' ? selectedGigId : undefined
                                                });
                                            }}
                                            className={`group flex items-center px-4 py-2 rounded-xl transition-all ${available
                                                ? 'text-blue-600 hover:bg-blue-50 font-bold'
                                                : 'text-gray-300 cursor-not-allowed italic font-medium'
                                                }`}
                                            disabled={!available}
                                        >
                                            {available ? (
                                                <>
                                                    <span className="text-xl mr-3 group-hover:scale-125 transition-transform">+</span>
                                                    <span className="text-sm">Quick Add Slot</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-300" />
                                                    <span className="text-xs uppercase tracking-tighter">Outside Availability Window</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
