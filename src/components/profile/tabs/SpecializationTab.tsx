import React from 'react';
import { Pencil, X } from 'lucide-react';

interface SpecializationTabProps {
  profile: any;
  onEditItemClick: () => void;
  onDeleteItemClick: (section: 'industries' | 'activities' | 'notableCompanies', index: number) => void;
}

export const SpecializationTab: React.FC<SpecializationTabProps> = ({ profile, onEditItemClick, onDeleteItemClick }) => {
  const renderEditableBadge = (
    label: string,
    className: string,
    key: string,
    section: 'industries' | 'activities' | 'notableCompanies',
    idx: number
  ) => (
    <div key={key} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all hover:scale-105 ${className}`}>
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onDeleteItemClick(section, idx)}
        className="p-0.5 rounded-md hover:bg-white/50 transition-colors"
        title="Delete item"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Industries Section */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Primary Industries</h2>
          <button
            type="button"
            onClick={onEditItemClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.industries?.length > 0 ? (
            profile.professionalSummary.industries.map((ind: any, idx: number) =>
              renderEditableBadge(
                typeof ind === 'string' ? ind : ind.name || ind._id,
                'bg-harx-50/80 text-harx-600 border-harx-100 shadow-harx-500/5',
                `industry-${idx}`,
                'industries',
                idx
              )
            )
          ) : (
            <p className="text-slate-500 italic">No industries specified</p>
          )}
        </div>
      </div>

      {/* Activities Section */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-alt-900 tracking-tight">Professional Activities</h2>
          <button
            type="button"
            onClick={onEditItemClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.activities?.length > 0 ? (
            profile.professionalSummary.activities.map((act: any, idx: number) =>
              renderEditableBadge(
                typeof act === 'string' ? act : act.name || act._id,
                'bg-harx-alt-50/80 text-harx-alt-600 border-harx-alt-100 shadow-harx-alt-500/5',
                `activity-${idx}`,
                'activities',
                idx
              )
            )
          ) : (
            <p className="text-slate-500 italic">No activities specified</p>
          )}
        </div>
      </div>

      {/* Notable Companies */}
      {profile.professionalSummary?.notableCompanies?.length > 0 && (
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-harx-900 tracking-tight">Notable Companies Worked For</h2>
            <button
              type="button"
              onClick={onEditItemClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
              renderEditableBadge(
                company,
                'bg-slate-50 text-slate-700 border-slate-100',
                `company-${idx}`,
                'notableCompanies',
                idx
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
