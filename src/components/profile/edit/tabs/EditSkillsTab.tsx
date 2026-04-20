import React from 'react';
import { X, ShieldCheck, Zap, Heart } from 'lucide-react';
import { Skill, SkillsByCategory } from '../../../../services/api/skills';

interface EditSkillsTabProps {
  skillsData: {
    technical: SkillsByCategory;
    professional: SkillsByCategory;
    soft: SkillsByCategory;
  };
  getCurrentSkills: (type: 'technical' | 'professional' | 'soft') => any[];
  handleSkillsChange: (type: 'technical' | 'professional' | 'soft', skills: Array<{skill: string}>) => void;
  renderSkillDropdown: (skillType: 'technical' | 'professional' | 'soft', placeholder: string, colorScheme: string) => React.ReactNode;
}

export const EditSkillsTab: React.FC<EditSkillsTabProps> = ({
  skillsData,
  getCurrentSkills,
  handleSkillsChange,
  renderSkillDropdown
}) => {
  const skillCategories = [
    { 
      type: 'technical' as const, 
      label: 'Technical Expertise', 
      icon: Zap, 
      color: 'blue', 
      desc: 'Coding languages, software, and hard technical tools.',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-100',
      hover: 'hover:bg-blue-600'
    },
    { 
      type: 'professional' as const, 
      label: 'Professional Skills', 
      icon: ShieldCheck, 
      color: 'green', 
      desc: 'Industry-specific workflows, management, and business processes.',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      hover: 'hover:bg-emerald-600'
    },
    { 
      type: 'soft' as const, 
      label: 'Soft Skills', 
      icon: Heart, 
      color: 'purple', 
      desc: 'Communication, leadership, curiosity, and interpersonal abilities.',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-100',
      hover: 'hover:bg-purple-600'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {skillCategories.map((cat) => {
        const Icon = cat.icon;
        const currentSkills = getCurrentSkills(cat.type);
        
        return (
          <div key={cat.type} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 ${cat.bg} ${cat.text} rounded-2xl`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">{cat.label}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1 leading-relaxed">
                  {cat.desc}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
              {currentSkills.length > 0 ? (
                currentSkills.map((skillRef: any, idx: number) => {
                  const skillDataForType = skillsData[cat.type];
                  const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
                  const skillObj = Object.values(skillDataForType).flat().find((s: Skill) => s._id === skillId);
                  
                  return (
                    <div key={idx} className={`flex items-center gap-2 ${cat.bg} ${cat.text} px-4 py-2 rounded-xl border ${cat.border} group transition-all ${cat.hover} hover:text-white`}>
                      <span className="text-xs font-black uppercase tracking-tighter italic">{skillObj?.name || 'Unknown Skill'}</span>
                      <button 
                        onClick={() => {
                          const updated = currentSkills.filter((_, i) => i !== idx);
                          handleSkillsChange(cat.type, updated);
                        }}
                        className="transition-transform group-hover:scale-110"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm font-bold text-gray-300 italic py-2">No {cat.type} skills added yet</div>
              )}
            </div>

            <div className="max-w-md">
              {renderSkillDropdown(cat.type, `Search and add ${cat.type} skills...`, cat.color)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
