import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { TimeSlot } from '../../types/scheduler';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
    selectedGigId: string | null;
}

export function HorizontalCalendar({ selectedDate, onDateSelect, slots, selectedGigId }: HorizontalCalendarProps) {
    const [baseDate, setBaseDate] = useState(new Date());
    const today = new Date();
    const startDate = startOfWeek(baseDate);
    const weekDays = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

    const nextPeriod = () => setBaseDate(addWeeks(baseDate, 2));
    const prevPeriod = () => setBaseDate(subWeeks(baseDate, 2));

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 transition-all duration-500 hover:shadow-blue-500/10">
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Schedule Breakdown</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">14 Day Interactive Outlook</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex space-x-4 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                        <div className="flex items-center text-[10px] font-bold text-gray-500 px-3">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2 shadow-sm"></div>
                            Booked
                        </div>
                        <div className="flex items-center text-[10px] font-bold text-gray-500 px-3 border-l border-gray-200">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-sm"></div>
                            Open
                        </div>
                    </div>

                    <div className="flex bg-gray-100 rounded-2xl p-1.5 space-x-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={prevPeriod}
                            className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-xl rounded-xl transition-all duration-300 text-gray-500"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextPeriod}
                            className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-xl rounded-xl transition-all duration-300 text-gray-500"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);
                    const daySlots = slots.filter(s =>
                        s.date === format(day, 'yyyy-MM-dd') &&
                        (!selectedGigId || s.gigId === selectedGigId)
                    );
                    const reservedSlots = daySlots.filter(s => s.status === 'reserved').length;
                    const availableSlots = daySlots.filter(s => s.status === 'available').length;

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDateSelect(day)}
                            className={`group relative flex flex-col items-center py-6 px-3 rounded-2xl transition-all duration-300 ${isSelected
                                ? 'bg-blue-600 text-white shadow-2xl shadow-blue-400 scale-105 ring-4 ring-blue-50 z-10'
                                : 'bg-white hover:bg-gray-50 text-gray-600 hover:scale-[1.03] border border-gray-100 border-transparent hover:border-gray-200'
                                }`}
                        >
                            {isToday && !isSelected && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                            )}

                            <span className={`text-[10px] font-black uppercase mb-2 tracking-tighter ${isSelected ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                {format(day, 'EEE')}
                            </span>
                            <span className={`text-2xl font-black mb-3 tabular-nums ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex flex-col space-y-1 w-full mt-auto">
                                {reservedSlots > 0 && (
                                    <div className={`h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-white/40' : 'bg-purple-200 group-hover:bg-purple-400'} w-full`}>
                                        <div
                                            className={`h-full rounded-full ${isSelected ? 'bg-white' : 'bg-purple-600'}`}
                                            style={{ width: `${Math.min(100, (reservedSlots / (daySlots.length || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {availableSlots > 0 && (
                                    <div className={`h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-white/20' : 'bg-green-100 group-hover:bg-green-300'} w-full`}>
                                        <div
                                            className={`h-full rounded-full ${isSelected ? 'bg-white/60' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(100, (availableSlots / (daySlots.length || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {daySlots.length === 0 && (
                                    <div className={`h-1 rounded-full ${isSelected ? 'bg-white/10' : 'bg-gray-100'} w-full`}></div>
                                )}
                            </div>

                            <span className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${isSelected ? 'text-blue-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'}`}>
                                {daySlots.length} slots
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
