import React from 'react';

interface SpecializationTabProps {
  profile: any;
}

export const SpecializationTab: React.FC<SpecializationTabProps> = ({ profile }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Industries Section */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-5">Primary Industries</h2>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.industries?.length > 0 ? (
            profile.professionalSummary.industries.map((ind: any, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-harx-50/80 text-harx-600 rounded-xl text-sm font-bold border border-harx-100 shadow-sm shadow-harx-500/5 transition-all hover:scale-105">
                {typeof ind === 'string' ? ind : ind.name || ind._id}
              </span>
            ))
          ) : (
            <p className="text-slate-500 italic">No industries specified</p>
          )}
        </div>
      </div>

      {/* Activities Section */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-5">Professional Activities</h2>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.activities?.length > 0 ? (
            profile.professionalSummary.activities.map((act: any, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-harx-alt-50/80 text-harx-alt-600 rounded-xl text-sm font-bold border border-harx-alt-100 shadow-sm shadow-harx-alt-500/5 transition-all hover:scale-105">
                {typeof act === 'string' ? act : act.name || act._id}
              </span>
            ))
          ) : (
            <p className="text-slate-500 italic">No activities specified</p>
          )}
        </div>
      </div>

      {/* Notable Companies */}
      {profile.professionalSummary?.notableCompanies?.length > 0 && (
        <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-5">Notable Companies Worked For</h2>
          <div className="flex flex-wrap gap-3">
            {profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-slate-100 shadow-sm transition-all hover:scale-105">
                {company}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
