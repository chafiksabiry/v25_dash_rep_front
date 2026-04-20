import React from 'react';
import { Clock, Calendar } from 'lucide-react';

interface ProfileTabProps {
  profile: any;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* About Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">About</h2>
        
        {/* Profile Description */}
        <div className="mb-6">
          {profile.professionalSummary?.profileDescription ? (
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{profile.professionalSummary.profileDescription}</p>
          ) : (
            <p className="text-gray-500 italic">No professional summary provided</p>
          )}
        </div>

        {/* Introduction Video Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Introduction Video</h3>
          
          {profile.personalInfo?.presentationVideo?.url ? (
            <div className="space-y-4">
              <div className="w-full">
                <video 
                  controls 
                  className="w-full aspect-video bg-black rounded-2xl object-cover shadow-lg"
                >
                  <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex gap-6">
                {profile.personalInfo.presentationVideo.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-harx-400" />
                    <span>{Math.floor(profile.personalInfo.presentationVideo.duration)}s</span>
                  </div>
                )}
                {profile.personalInfo.presentationVideo.recordedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-harx-400" />
                    <span>Recorded {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm flex items-center gap-3">
              <span className="text-xl">🎥</span>
              <span>A video introduction helps you stand out. Please add one to your profile.</span>
            </div>
          )}
        </div>
      </div>

      {/* Industries Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Industries</h2>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.industries?.length > 0 ? (
            profile.professionalSummary.industries.map((ind: any, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-harx-50 text-harx-600 rounded-xl text-sm font-bold border border-harx-100 shadow-sm shadow-harx-500/5 transition-all hover:scale-105">
                {typeof ind === 'string' ? ind : ind.name || ind._id}
              </span>
            ))
          ) : (
            <p className="text-gray-500 italic">No industries specified</p>
          )}
        </div>
      </div>

      {/* Activities Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Activities</h2>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.activities?.length > 0 ? (
            profile.professionalSummary.activities.map((act: any, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-harx-alt-50 text-harx-alt-600 rounded-xl text-sm font-bold border border-harx-alt-100 shadow-sm shadow-harx-alt-500/5 transition-all hover:scale-105">
                {typeof act === 'string' ? act : act.name || act._id}
              </span>
            ))
          ) : (
            <p className="text-gray-500 italic">No activities specified</p>
          )}
        </div>
      </div>

      {/* Notable Companies */}
      {profile.professionalSummary?.notableCompanies?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Notable Companies</h2>
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
