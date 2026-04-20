import React from 'react';
import { Briefcase, Calendar } from 'lucide-react';

interface ExperienceTabProps {
  profile: any;
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({ profile }) => {
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
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Summary</h2>
        <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div className="p-3 bg-harx-100 rounded-xl text-harx-600">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">
              {profile.professionalSummary?.yearsOfExperience || 0}+ Years
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              Professional Experience
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Experience */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6">Work History</h2>
        {profile.experience?.length > 0 ? (
          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-4 before:-z-10 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-harx-200 before:to-transparent">
            {profile.experience.map((exp: any, index: number) => {
              const startDate = formatDateToDD_MM_YYYY(exp.startDate);
              const endDate = exp.endDate === 'present' ? 'Present' : exp.endDate ? formatDateToDD_MM_YYYY(exp.endDate) : 'Present';
              
              return (
                <div key={index} className="relative pl-12 group">
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-4 border-harx-400 group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-harx-500"></div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{exp.title || exp.role}</h3>
                      <p className="text-harx-600 font-bold">{exp.company}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mt-1 md:mt-0">
                      <Calendar className="w-4 h-4" />
                      <span>{startDate} — {endDate}</span>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100 italic">
                      "{exp.description}"
                    </p>
                  )}

                  {exp.responsibilities?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Key Responsibilities</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {exp.responsibilities.map((r: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-50">
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
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No experience history listed yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
