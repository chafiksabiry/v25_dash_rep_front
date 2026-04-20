import React from 'react';
import { Briefcase, Calendar, Pencil } from 'lucide-react';

interface ExperienceTabProps {
  profile: any;
  onEditItemClick: () => void;
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({ profile, onEditItemClick }) => {
  const formatDateToDD_MM_YYYY = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } catch (e) { return dateString; }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Experience Summary */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-5">Summary</h2>
        <div className="flex items-center gap-4 bg-slate-200/40 p-6 rounded-2xl border border-slate-200/30">
          <div className="p-3 bg-harx-100/80 rounded-xl text-harx-600">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {profile.professionalSummary?.yearsOfExperience || 0}+ Years
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Professional Experience
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Experience */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Work History</h2>
        {profile.experience?.length > 0 ? (
          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-4 before:-z-10 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-harx-200 before:to-transparent">
            {profile.experience.map((exp: any, index: number) => {
              const startDate = formatDateToDD_MM_YYYY(exp.startDate);
              const endDate = exp.endDate === 'present' ? 'Present' : exp.endDate ? formatDateToDD_MM_YYYY(exp.endDate) : 'Present';
              
              return (
                <div key={index} className="relative pl-12 group">
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-50 border-4 border-harx-300 group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-harx-500"></div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{exp.title || exp.role}</h3>
                      <p className="text-harx-600 font-bold">{exp.company}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 md:mt-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{startDate} — {endDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onEditItemClick}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit experience"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-slate-600 mt-4 leading-relaxed bg-slate-200/30 p-4 rounded-2xl border border-slate-200/30 italic">
                      "{exp.description}"
                    </p>
                  )}

                  {exp.responsibilities?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Key Responsibilities</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {exp.responsibilities.map((r: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-harx-300 flex-shrink-0"></span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-200/40 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No experience history listed yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
