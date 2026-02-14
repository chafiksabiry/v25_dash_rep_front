import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { TimeSlot } from '../../types/scheduler';
import { Calendar as CalendarIcon } from 'lucide-react';

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
}

export function HorizontalCalendar({ selectedDate, onDateSelect, slots }: HorizontalCalendarProps) {
    const startDate = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center mb-6 px-2 text-gray-700">
                <CalendarIcon className="w-5 h-5 mr-3" />
                <h2 className="text-lg font-bold">Schedule</h2>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const daySlots = slots.filter(s => s.date === format(day, 'yyyy-MM-dd'));
                    const totalSlots = daySlots.length;

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDateSelect(day)}
                            className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${isSelected
                                ? 'bg-blue-600 text-white shadow-lg scale-105 z-10'
                                : 'hover:bg-gray-50 text-gray-500'
                                }`}
                        >
                            <span className="text-xs font-bold uppercase mb-1">
                                {format(day, 'EEE')}
                            </span>
                            <span className="text-xl font-black mb-1">
                                {format(day, 'd')}
                            </span>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                {totalSlots} slots
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
