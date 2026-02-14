import { useState } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig } from '../../types/scheduler';
import { X, MessageSquare, Clock, Check, Calendar } from 'lucide-react';

interface TimeSlotGridProps {
    date: Date;
    slots: TimeSlot[];
    gigs: Gig[];
    onSlotUpdate: (slot: TimeSlot) => void;
    onSlotCancel: (slotId: string) => void;
    onSlotSelect?: (slot: TimeSlot) => void;
}

export function TimeSlotGrid({
    date,
    slots,
    gigs,
    onSlotUpdate,
    onSlotCancel,
    onSlotSelect,
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
                        const available = isHourAvailable(time);

                        return (
                            <div
                                key={time}
                                id={`time-slot-${parseInt(time)}`}
                                className={`flex items-start p-5 transition-all duration-200 border-b border-gray-50 last:border-0 ${slot?.status === 'reserved' ? 'bg-blue-50/40' : slot?.status === 'available' ? 'bg-emerald-50/20' : 'hover:bg-gray-50/30'
                                    }`}
                                onClick={() => slot && onSlotSelect && onSlotSelect(slot)}
                            >
                                <div className="w-20 pt-1">
                                    <span className={`text-sm font-black ${slot ? 'text-blue-900' : 'text-gray-400'}`}>
                                        {time}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    {slot ? (
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative flex-1 max-w-sm">
                                                        <select
                                                            value={slot.gigId || ''}
                                                            onChange={(e) =>
                                                                onSlotUpdate({ ...slot, gigId: e.target.value || undefined })
                                                            }
                                                            className="w-full bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-400 py-2 pl-4 pr-10 appearance-none shadow-sm"
                                                            disabled={slot.status === 'cancelled'}
                                                        >
                                                            <option value="">Select a gig...</option>
                                                            {gigs.map((g) => (
                                                                <option key={g.id} value={g.id}>
                                                                    {g.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-lg" />
                                                    </div>

                                                    <div className="flex items-center bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm">
                                                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                                        <select
                                                            value={slot.duration}
                                                            onChange={(e) =>
                                                                onSlotUpdate({ ...slot, duration: parseInt(e.target.value) })
                                                            }
                                                            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-0 appearance-none pr-6"
                                                            disabled={slot.status === 'cancelled'}
                                                        >
                                                            {[1, 2, 3, 4].map((hours) => (
                                                                <option key={hours} value={hours}>
                                                                    {hours} hour{hours > 1 ? 's' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSlotUpdate({
                                                                ...slot,
                                                                status: slot.status === 'reserved' ? 'available' : 'reserved'
                                                            });
                                                        }}
                                                        className={`px-4 py-2 text-xs font-black rounded-xl flex items-center border shadow-sm transition-all ${slot.status === 'reserved'
                                                            ? 'bg-blue-100/50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                                            : 'bg-emerald-100/50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                            }`}
                                                    >
                                                        {slot.status === 'reserved' ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                                                Reserved
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                                Available
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="flex items-center text-gray-400 pl-1 group">
                                                    <MessageSquare className="w-4 h-4 mr-3 opacity-60" />
                                                    <input
                                                        type="text"
                                                        value={slot.notes || ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) =>
                                                            onSlotUpdate({ ...slot, notes: e.target.value })
                                                        }
                                                        placeholder="Add notes..."
                                                        className="bg-transparent border-none text-sm font-bold text-gray-600 placeholder-gray-400 focus:ring-0 w-full p-0"
                                                        disabled={slot.status === 'cancelled'}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSlotCancel(slot.id);
                                                }}
                                                className="ml-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                                            className={`flex items-center transition-all ${available
                                                ? 'text-blue-600 hover:text-blue-800'
                                                : 'text-gray-200 cursor-not-allowed hidden'
                                                }`}
                                            disabled={!available}
                                        >
                                            <span className="text-sm font-black flex items-center">
                                                <span className="text-lg mr-2">+</span>
                                                Add slot
                                            </span>
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
