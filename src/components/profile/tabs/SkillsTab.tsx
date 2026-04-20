import React from 'react';
import { Pencil } from 'lucide-react';

interface SkillsTabProps {
  profile: any;
  formatSkillsForDisplay: (skillsData: any) => any[];
  findSkillData: (skillName: string) => any;
  takeContactCenterSkillAssessment: (skillName: string, categoryName?: string) => void;
  onEditItemClick: () => void;
}

const CONTACT_CENTER_SKILLS = [
  {
    name: "Communication",
    skills: ["Active Listening", "Clear Speech", "Empathy", "Tone Management"]
  },
  {
    name: "Problem Solving",
    skills: ["Issue Analysis", "Solution Finding", "Decision Making", "Resource Utilization"]
  },
  {
    name: "Customer Service",
    skills: ["Service Orientation", "Conflict Resolution", "Product Knowledge", "Quality Assurance"]
  }
];

export const SkillsTab: React.FC<SkillsTabProps> = ({ 
  profile, 
  formatSkillsForDisplay, 
  findSkillData,
  takeContactCenterSkillAssessment,
  onEditItemClick
}) => {
  const renderEditableSkillChip = (skill: any, idx: number, chipClassName: string) => (
    <div
      key={`${skill?.name || 'skill'}-${idx}`}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${chipClassName}`}
    >
      <span>{skill.name}</span>
      <button
        type="button"
        onClick={onEditItemClick}
        className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-slate-300/50 transition-colors"
        title="Edit this skill"
        aria-label={`Edit ${skill.name}`}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Skill Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Technical Skills */}
        <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
          <h2 className="text-lg font-black text-slate-900 mb-4">Technical</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) =>
              renderEditableSkillChip(skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30 italic')
            )}
          </div>
        </div>

        {/* Professional Skills */}
        <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
          <h2 className="text-lg font-black text-slate-900 mb-4">Professional</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) =>
              renderEditableSkillChip(skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
        </div>

        {/* Soft Skills */}
        <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
          <h2 className="text-lg font-black text-slate-900 mb-4">Soft Skills</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) =>
              renderEditableSkillChip(skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
        </div>
      </div>

      {/* Contact Center Skills Assessments */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Contact Center Assessments</h2>
        <div className="space-y-6">
          {[
            ...CONTACT_CENTER_SKILLS,
            {
              name: "Activities",
              skills: (profile.professionalSummary?.activities || []).map((a: any) => typeof a === 'string' ? a : a.name)
            },
            {
              name: "Industries",
              skills: (profile.professionalSummary?.industries || []).map((i: any) => typeof i === 'string' ? i : i.name)
            }
          ].filter(category => category.skills.length > 0).map((category) => (
            <div key={category.name} className="space-y-4">
              <h3 className="text-md font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/30 pb-2">{category.name}</h3>
              <div className="grid grid-cols-1 gap-4">
                {category.skills.map((skillName: string) => {
                  const skillData = findSkillData(skillName);
                  return (
                    <div key={skillName} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-200/40 rounded-2xl border border-slate-200/30 hover:border-harx-200 transition-colors group">
                      <div className="space-y-1 mb-4 md:mb-0">
                        <h4 className="font-bold text-slate-900">{skillName}</h4>
                        {skillData?.assessmentResults ? (
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-harx-500 uppercase">Score: {skillData.assessmentResults.score}/100</span>
                            <div className="flex gap-1">
                              {skillData.assessmentResults.keyMetrics && Object.entries(skillData.assessmentResults.keyMetrics).map(([key, val]: [string, any]) => (
                                <span key={key} title={key} className="w-2 h-2 rounded-full bg-harx-400 opacity-40"></span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Not yet assessed</span>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={onEditItemClick}
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                        className={`
                          px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                          ${skillData?.assessmentResults 
                            ? 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10'}
                        `}
                      >
                        {skillData?.assessmentResults ? 'Retake' : 'Take Assessment'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
