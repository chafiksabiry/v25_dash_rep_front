import React, { useEffect, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { fetchSkillsByType, Skill } from '../../../services/api/skills';

interface SkillsTabProps {
  profile: any;
  formatSkillsForDisplay: (skillsData: any) => any[];
  findSkillData: (skillName: string) => any;
  takeContactCenterSkillAssessment: (skillName: string, categoryName?: string) => void;
  onEditItemClick: () => void;
  onDeleteSkill: (type: 'technical' | 'professional' | 'soft', index: number) => void;
  onAddSkill: (type: 'technical' | 'professional' | 'soft', skillId: string) => void;
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
  onEditItemClick,
  onDeleteSkill,
  onAddSkill
}) => {
  const [availableSkills, setAvailableSkills] = useState<Record<'technical' | 'professional' | 'soft', Skill[]>>({
    technical: [],
    professional: [],
    soft: []
  });
  const [activeAddType, setActiveAddType] = useState<'technical' | 'professional' | 'soft' | null>(null);
  const [searchTermByType, setSearchTermByType] = useState<Record<'technical' | 'professional' | 'soft', string>>({
    technical: '',
    professional: '',
    soft: ''
  });

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const [technical, professional, soft] = await Promise.all([
          fetchSkillsByType('technical'),
          fetchSkillsByType('professional'),
          fetchSkillsByType('soft')
        ]);
        setAvailableSkills({
          technical: Object.values(technical || {}).flat(),
          professional: Object.values(professional || {}).flat(),
          soft: Object.values(soft || {}).flat()
        });
      } catch (error) {
        console.error('Error loading skills list in SkillsTab:', error);
      }
    };
    loadSkills();
  }, []);

  const normalizeId = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
    if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
    if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
    return null;
  };

  const getCurrentSkillIds = (type: 'technical' | 'professional' | 'soft') =>
    new Set(
      (profile?.skills?.[type] || [])
        .map((item: any) => normalizeId(item?.skill) || normalizeId(item?._id))
        .filter((id: string | null): id is string => !!id)
    );

  const getFilteredSkills = (type: 'technical' | 'professional' | 'soft') => {
    const selectedIds = getCurrentSkillIds(type);
    const search = (searchTermByType[type] || '').trim().toLowerCase();
    return availableSkills[type].filter((skill) => {
      if (selectedIds.has(skill._id)) return false;
      if (!search) return true;
      return (
        skill.name.toLowerCase().includes(search) ||
        (skill.description || '').toLowerCase().includes(search)
      );
    });
  };

  const renderAddDropdown = (type: 'technical' | 'professional' | 'soft') => {
    if (activeAddType !== type) return null;
    const options = getFilteredSkills(type);
    return (
      <div className="mt-3 w-full bg-white border border-harx-100/80 rounded-xl shadow-sm overflow-hidden">
        <input
          type="text"
          value={searchTermByType[type]}
          onChange={(e) => setSearchTermByType((prev) => ({ ...prev, [type]: e.target.value }))}
          placeholder={`Search ${type} skills...`}
          className="w-full px-3 py-2.5 text-sm border-b border-harx-100/70 outline-none"
        />
        <div className="max-h-56 overflow-auto">
          {options.length > 0 ? (
            options.map((skill) => (
              <button
                key={skill._id}
                type="button"
                onClick={() => {
                  onAddSkill(type, skill._id);
                  setSearchTermByType((prev) => ({ ...prev, [type]: '' }));
                }}
                className="w-full text-left px-3 py-2 hover:bg-harx-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="text-sm font-bold text-slate-800">{skill.name}</div>
                <div className="text-xs text-slate-500 truncate">{skill.description}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500">No skills available.</div>
          )}
        </div>
      </div>
    );
  };

  const renderSkillChip = (
    type: 'technical' | 'professional' | 'soft',
    skill: any,
    idx: number,
    chipClassName: string
  ) => (
    <div
      key={`${skill?.name || 'skill'}-${idx}`}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${chipClassName}`}
    >
      <span>{skill.name}</span>
      <button
        type="button"
        onClick={() => onDeleteSkill(type, idx)}
        className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-slate-300/50 transition-colors"
        title="Delete this skill"
        aria-label={`Delete ${skill.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Skill Categories - Vertical Layout */}
      <div className="space-y-5">
        {/* Technical Skills */}
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-900">Technical</h2>
            <div>
              <button
                type="button"
                onClick={() => setActiveAddType(activeAddType === 'technical' ? null : 'technical')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-widest transition-all ${
                  activeAddType === 'technical'
                    ? 'bg-gradient-harx text-white border-transparent shadow-md shadow-harx-500/20'
                    : 'bg-harx-50 text-harx-700 border-harx-100 hover:bg-harx-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-start content-start">
            {formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) =>
              renderSkillChip('technical', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30 italic')
            )}
          </div>
          {renderAddDropdown('technical')}
        </div>

        {/* Professional Skills */}
        <div className="bg-harx-alt-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-alt-900">Professional</h2>
            <div>
              <button
                type="button"
                onClick={() => setActiveAddType(activeAddType === 'professional' ? null : 'professional')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-widest transition-all ${
                  activeAddType === 'professional'
                    ? 'bg-gradient-harx text-white border-transparent shadow-md shadow-harx-500/20'
                    : 'bg-harx-50 text-harx-700 border-harx-100 hover:bg-harx-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) =>
              renderSkillChip('professional', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
          {renderAddDropdown('professional')}
        </div>

        {/* Soft Skills */}
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-900">Soft Skills</h2>
            <div>
              <button
                type="button"
                onClick={() => setActiveAddType(activeAddType === 'soft' ? null : 'soft')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-widest transition-all ${
                  activeAddType === 'soft'
                    ? 'bg-gradient-harx text-white border-transparent shadow-md shadow-harx-500/20'
                    : 'bg-harx-50 text-harx-700 border-harx-100 hover:bg-harx-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) =>
              renderSkillChip('soft', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
          {renderAddDropdown('soft')}
        </div>
      </div>

      {/* Contact Center Skills Assessments */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <h2 className="text-xl font-black text-harx-900 tracking-tight mb-6">Contact Center Assessments</h2>
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
                    <div key={skillName} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/80 rounded-2xl border border-harx-100/60 hover:border-harx-300 transition-colors group">
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
                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-harx-50 text-harx-700 border border-harx-100 hover:bg-harx-100 transition-all"
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
                            ? 'bg-harx-alt-50 text-harx-alt-700 border border-harx-alt-100 hover:bg-harx-alt-100' 
                            : 'bg-gradient-harx text-white hover:opacity-90 shadow-xl shadow-harx-500/20'}
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
