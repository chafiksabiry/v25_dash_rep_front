import React from 'react';
import { Star } from 'lucide-react';

interface SkillsTabProps {
  profile: any;
  formatSkillsForDisplay: (skillsData: any) => any[];
  findSkillData: (skillName: string) => any;
  takeContactCenterSkillAssessment: (skillName: string, categoryName?: string) => void;
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
  takeContactCenterSkillAssessment
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Skill Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Technical Skills */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">Technical</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) => (
              <span key={idx} className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 italic">
                {skill.name}
              </span>
            ))}
          </div>
        </div>

        {/* Professional Skills */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">Professional</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) => (
              <span key={idx} className="px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                {skill.name}
              </span>
            ))}
          </div>
        </div>

        {/* Soft Skills */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-4">Soft Skills</h2>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) => (
              <span key={idx} className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Center Skills Assessments */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6">Contact Center Assessments</h2>
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
              <h3 className="text-md font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">{category.name}</h3>
              <div className="grid grid-cols-1 gap-4">
                {category.skills.map((skillName: string) => {
                  const skillData = findSkillData(skillName);
                  return (
                    <div key={skillName} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-harx-200 transition-colors group">
                      <div className="space-y-1 mb-4 md:mb-0">
                        <h4 className="font-bold text-gray-900">{skillName}</h4>
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
                          <span className="text-xs font-medium text-gray-400 italic">Not yet assessed</span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                        className={`
                          px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                          ${skillData?.assessmentResults 
                            ? 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10'}
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
