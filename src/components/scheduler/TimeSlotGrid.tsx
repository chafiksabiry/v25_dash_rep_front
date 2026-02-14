import React, { useState } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Project } from '../../types/scheduler';
import { Clock, X, MessageSquare, Timer, Check, Calendar, AlertTriangle } from 'lucide-react';

interface TimeSlotGridProps {
    date: Date;
    slots: TimeSlot[];
    projects: Project[];
    onSlotUpdate: (slot: TimeSlot) => void;
    onSlotCancel: (slotId: string) => void;
    onSlotSelect?: (slot: TimeSlot) => void;
    selectedSlot: TimeSlot | null;
}

export function TimeSlotGrid({
    date,
    slots,
    projects,
    onSlotUpdate,
    onSlotCancel,
    onSlotSelect,
    selectedSlot
}: TimeSlotGridProps) {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const daySlots = slots.filter((slot) => slot.date === format(date, 'yyyy-MM-dd'));
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);
    const selectedRepId = slots.length > 0 ? slots[0].repId : '';

    const filteredSlots = selectedProject === 'all'
        ? daySlots
        : daySlots.filter(slot => slot.projectId === selectedProject);

    const displaySlots = showCancelled
        ? filteredSlots
        : filteredSlots.filter(slot => slot.status !== 'cancelled');

    return (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        Time Slots for {format(date, 'MMMM d, yyyy')}
                    </h2>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="all">All Projects</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="showCancelled"
                            checked={showCancelled}
                            onChange={(e) => setShowCancelled(e.target.checked)}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showCancelled" className="text-sm text-gray-600">
                            Show cancelled
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {timeSlots.map((time) => {
                    const slot = displaySlots.find((s) => s.startTime === time);
                    const project = slot?.projectId ? projects.find(p => p.id === slot.projectId) : null;
                    const isSelected = selectedSlot?.id === slot?.id;

                    return (
                        <div
                            key={time}
                            id={`time-slot-${parseInt(time)}`}
                            className={`flex items-center p-3 border rounded-lg transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                                }`}
                            onClick={() => slot && onSlotSelect && onSlotSelect(slot)}
                        >
                            <div className="w-20 font-medium text-gray-700">{time}</div>
                            {slot ? (
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center space-x-4">
                                            <select
                                                value={slot.projectId || ''}
                                                onChange={(e) =>
                                                    onSlotUpdate({ ...slot, projectId: e.target.value || undefined })
                                                }
                                                className={`rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${slot.status === 'cancelled' ? 'opacity-50' : ''
                                                    }`}
                                                style={{
                                                    borderLeftColor: project?.color,
                                                    borderLeftWidth: '4px'
                                                }}
                                                disabled={slot.status === 'cancelled'}
                                            >
                                                <option value="">Select Project</option>
                                                {projects.map((project) => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex items-center space-x-2">
                                                <Timer className="w-4 h-4 text-gray-500" />
                                                <select
                                                    value={slot.duration}
                                                    onChange={(e) =>
                                                        onSlotUpdate({ ...slot, duration: parseInt(e.target.value) })
                                                    }
                                                    className={`rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${slot.status === 'cancelled' ? 'opacity-50' : ''
                                                        }`}
                                                    disabled={slot.status === 'cancelled'}
                                                >
                                                    {[1, 2, 3, 4].map((hours) => (
                                                        <option key={hours} value={hours}>
                                                            {hours} hour{hours > 1 ? 's' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSlotUpdate({
                                                            ...slot,
                                                            status: slot.status === 'available' ? 'reserved' : 'available'
                                                        });
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${slot.status === 'available'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : slot.status === 'reserved'
                                                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    disabled={slot.status === 'cancelled'}
                                                >
                                                    {slot.status === 'available' && (
                                                        <>
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            Available
                                                        </>
                                                    )}
                                                    {slot.status === 'reserved' && (
                                                        <>
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Reserved
                                                        </>
                                                    )}
                                                    {slot.status === 'cancelled' && (
                                                        <>
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Cancelled
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <MessageSquare className="w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                value={slot.notes || ''}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) =>
                                                    onSlotUpdate({ ...slot, notes: e.target.value })
                                                }
                                                placeholder="Add notes..."
                                                className={`flex-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${slot.status === 'cancelled' ? 'opacity-50' : ''
                                                    }`}
                                                disabled={slot.status === 'cancelled'}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSlotCancel(slot.id);
                                        }}
                                        className={`ml-4 ${slot.status === 'cancelled'
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-red-600 hover:text-red-800'
                                            }`}
                                        disabled={slot.status === 'cancelled'}
                                        title={slot.status === 'cancelled' ? 'Already cancelled' : 'Cancel slot'}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSlotUpdate({
                                            id: crypto.randomUUID(),
                                            startTime: time,
                                            endTime: `${(parseInt(time) + 1).toString().padStart(2, '0')}:00`,
                                            date: format(date, 'yyyy-MM-dd'),
                                            status: 'available',
                                            duration: 1,
                                            repId: selectedRepId,
                                        });
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                >
                                    <span className="mr-1">+</span> Add slot
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
