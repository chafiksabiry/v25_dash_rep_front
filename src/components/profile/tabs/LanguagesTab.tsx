import React from 'react';
import { Star, Globe, Pencil } from 'lucide-react';

interface LanguagesTabProps {
  profile: any;
  getProficiencyStars: (proficiency: string) => number;
  takeLanguageAssessment: (language: string, iso639_1Code?: string) => void;
  onEditItemClick: () => void;
}

export const LanguagesTab: React.FC<LanguagesTabProps> = ({ 
  profile, 
  getProficiencyStars, 
  takeLanguageAssessment,
  onEditItemClick
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Language Proficiency</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.personalInfo?.languages?.length > 0 ? (
            profile.personalInfo.languages.map((lang: any, index: number) => {
              const stars = getProficiencyStars(lang.proficiency);
              const languageName = typeof lang.language === 'object' && lang.language ? lang.language.name : 'Unknown Language';
              const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';

              return (
                <div key={index} className="bg-slate-200/40 p-6 rounded-3xl border border-slate-200/30 hover:border-harx-200 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-harx-600 transition-colors">
                        {languageName}
                        {languageCode && <span className="text-slate-400 font-bold ml-2">({languageCode})</span>}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(6)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < stars ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-black text-harx-500 shadow-sm border border-slate-200/30 uppercase italic">
                      {lang.proficiency}
                    </div>
                  </div>

                  {lang.assessmentResults ? (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fluency</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.fluency?.score || 0}%</div>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proficiency</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.proficiency?.score || 0}%</div>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comp.</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.completeness?.score || 0}%</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-slate-200/30 rounded-2xl text-center">
                      <p className="text-xs font-medium text-slate-400 italic">No assessment completed</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onEditItemClick}
                      className="py-3 px-4 bg-slate-50 text-slate-700 border border-slate-200/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:bg-slate-100"
                      title="Edit language"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </span>
                    </button>
                    <button
                      onClick={() => takeLanguageAssessment(languageName, languageCode)}
                      className="flex-1 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 border border-slate-200/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                      {lang.assessmentResults ? 'Retake Assessment' : 'Start Assessment'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-12 bg-slate-200/40 rounded-3xl border border-dashed border-slate-300">
              <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No languages added to profile yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
