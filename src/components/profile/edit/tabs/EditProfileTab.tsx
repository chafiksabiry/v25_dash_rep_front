import React from 'react';
import { Video, Play, Square, RotateCcw, Trash2, Calendar, X, Plus, Info, Clock } from 'lucide-react';
import { Industry, Activity } from '../../../ProfileEditView';

interface EditProfileTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  industriesData: Industry[];
  activitiesData: Activity[];
  
  // Video Recording Props
  showVideoRecorder: boolean;
  recordedVideo: string | null;
  existingVideoDeleted: boolean;
  cameraPermission: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  previewVideoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  recordingTime: number;
  formatTime: (s: number) => string;
  startCamera: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  deleteVideo: () => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  showTimeWarning: boolean;
  videoUploaded: boolean;
  uploadingVideo: boolean;
  uploadProgress: number;
  stream: MediaStream | null;
  
  // Dropdown Renderers
  renderIndustryDropdown: () => React.ReactNode;
  renderActivityDropdown: () => React.ReactNode;
  
  // Notable Companies
  tempCompany: string;
  setTempCompany: (c: string) => void;
}

export const EditProfileTab: React.FC<EditProfileTabProps> = ({
  profile,
  setProfile,
  setModifiedSections,
  industriesData,
  activitiesData,
  showVideoRecorder,
  recordedVideo,
  existingVideoDeleted,
  cameraPermission,
  videoRef,
  previewVideoRef,
  isRecording,
  recordingTime,
  formatTime,
  startCamera,
  startRecording,
  stopRecording,
  deleteVideo,
  setShowDeleteConfirmation,
  showTimeWarning,
  videoUploaded,
  uploadingVideo,
  uploadProgress,
  stream,
  renderIndustryDropdown,
  renderActivityDropdown,
  tempCompany,
  setTempCompany
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Biography Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Professional Biography</h2>
        <textarea
          value={profile.professionalSummary?.profileDescription || ''}
          onChange={(e) => {
            setProfile((prev: any) => ({
              ...prev,
              professionalSummary: {
                ...prev.professionalSummary,
                profileDescription: e.target.value
              }
            }));
            setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
          }}
          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none min-h-[160px] leading-relaxed"
          placeholder="Describe your professional background, key achievements, and what you bring to the table..."
        />
      </div>

      {/* Video Introduction Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Introduction Video</h2>
            <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter italic">Personalize your profile</p>
          </div>
          {!showVideoRecorder && !recordedVideo && profile.personalInfo?.presentationVideo?.url && !existingVideoDeleted && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase italic">Video Live</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 mb-8 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Video className="w-8 h-8 text-harx-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Presentation & Persona</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mt-1">
                  Upload or record a 60-second video. This is your chance to stand out to potential partners.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Clock className="w-3 h-3 text-harx-400" />
                Limit: 10:00 Mins
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Info className="w-3 h-3 text-harx-400" />
                High Quality Preferred
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl w-64 h-64 bg-harx-500 rounded-full"></div>
        </div>

        {/* Existing Video Display */}
        {profile.personalInfo?.presentationVideo?.url && !showVideoRecorder && !recordedVideo && !existingVideoDeleted && (
          <div className="space-y-4 mb-8">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black group">
              <video controls className="w-full h-full object-cover">
                <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                <source src={profile.personalInfo.presentationVideo.url} type="video/webm" />
              </video>
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={startCamera} className="p-3 bg-white/90 hover:bg-white text-slate-900 rounded-2xl shadow-xl transition-all active:scale-95 group/btn">
                  <RotateCcw className="w-5 h-5 group-hover/btn:rotate-180 transition-transform duration-500" />
                </button>
                <button onClick={() => setShowDeleteConfirmation(true)} className="p-3 bg-rose-500/90 hover:bg-rose-500 text-white rounded-2xl shadow-xl transition-all active:scale-95">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recorder View */}
        {showVideoRecorder && (
          <div className="bg-slate-900 rounded-3xl p-6 mb-8 border border-white/10 shadow-2xl overflow-hidden">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 group">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {isRecording && (
                <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Live Recording
                </div>
              )}
              <div className="absolute top-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white font-mono text-sm tracking-widest">
                {formatTime(recordingTime)} / 10:00
              </div>
              
              {showTimeWarning && (
                <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center animate-pulse pointer-events-none">
                  <span className="bg-rose-600 text-white px-6 py-2 rounded-full font-black uppercase italic tracking-widest text-xs shadow-2xl">
                    Time Limit Reaching!
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button onClick={startRecording} disabled={!stream} className="px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm"></div>
                  Begin Recording
                </button>
              ) : (
                <button onClick={stopRecording} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-white/10 transition-all active:scale-95 flex items-center gap-3">
                  <Square className="w-4 h-4 fill-current" />
                  Stop & Save
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recorded Preview View */}
        {recordedVideo && (
          <div className="space-y-6 mb-8">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black">
              <video ref={previewVideoRef} src={recordedVideo} controls className="w-full h-full object-cover" />
              <button 
                onClick={async () => { deleteVideo(); await startCamera(); }}
                className="absolute top-6 right-6 p-3 bg-white font-black text-slate-900 rounded-2xl shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[10px] uppercase italic tracking-widest">Retake</span>
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
              <div className="flex items-center gap-3 text-indigo-700 font-black uppercase tracking-widest text-xs italic">
                <Info className="w-5 h-5" />
                Preview Mode - Changes will be saved globally
              </div>
              
              {uploadingVideo && (
                <div className="w-full max-w-md">
                   <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                     <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                   <p className="text-center text-[10px] font-black text-indigo-500 mt-2 uppercase">Uploading: {uploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Video State UI */}
        {!showVideoRecorder && !recordedVideo && (!profile.personalInfo?.presentationVideo?.url || existingVideoDeleted) && cameraPermission !== 'denied' && (
          <div className="group border-4 border-dashed border-gray-100 rounded-[40px] p-16 text-center bg-gray-50/50 transition-all hover:bg-white hover:border-harx-200 hover:shadow-xl cursor-pointer" onClick={startCamera}>
            <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center text-gray-300 shadow-lg mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all">
              <Video className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Record Introduction</h3>
            <p className="text-sm font-bold text-gray-400 mt-3 max-w-xs mx-auto leading-relaxed">
              Bring your profile to life. Representatives with intro videos get 3x more views and higher trust.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
              <Play className="w-3 h-3 text-harx-400 fill-current" />
              Access Camera
            </div>
          </div>
        )}
      </div>

      {/* Industries & Activities Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Industries */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Primary Industries</h2>
          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
            {profile.professionalSummary?.industries?.map((industryItem: any, index: number) => {
              const industryId = typeof industryItem === 'string' ? industryItem : industryItem._id;
              const industryName = typeof industryItem === 'string' 
                ? (industriesData.find(ind => ind._id === industryItem)?.name || industryItem)
                : (industryItem.name || industryId);
              
              return (
                <div key={index} className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 border border-indigo-100 group transition-all hover:bg-indigo-600 hover:text-white">
                  <span className="text-xs font-black uppercase tracking-tighter italic">{industryName}</span>
                  <button onClick={() => {
                    const updated = [...(profile.professionalSummary?.industries || [])];
                    updated.splice(index, 1);
                    setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, industries: updated } }));
                    setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                  }} className="transition-transform group-hover:scale-110">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          {renderIndustryDropdown()}
        </div>

        {/* Activities */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Professional Activities</h2>
          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
            {profile.professionalSummary?.activities?.map((activityItem: any, index: number) => {
              const activityId = typeof activityItem === 'string' ? activityItem : activityItem._id;
              const activityName = typeof activityItem === 'string' 
                ? (activitiesData.find(act => act._id === activityItem)?.name || activityItem)
                : (activityItem.name || activityId);
              
              return (
                <div key={index} className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 border border-emerald-100 group transition-all hover:bg-emerald-600 hover:text-white">
                  <span className="text-xs font-black uppercase tracking-tighter italic">{activityName}</span>
                  <button onClick={() => {
                    const updated = [...(profile.professionalSummary?.activities || [])];
                    updated.splice(index, 1);
                    setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, activities: updated } }));
                    setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                  }} className="transition-transform group-hover:scale-110">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          {renderActivityDropdown()}
        </div>
      </div>

      {/* Notable Companies */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Notable Companies Worked For</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
            <div key={index} className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold group hover:border-harx-400 transition-colors">
              <span className="text-sm">{company}</span>
              <button onClick={() => {
                const updated = [...(profile.professionalSummary?.notableCompanies || [])];
                updated.splice(index, 1);
                setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, notableCompanies: updated } }));
                setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
              }} className="text-gray-300 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={tempCompany}
            onChange={(e) => setTempCompany(e.target.value)}
            className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-harx-500 transition-all"
            placeholder="Add company name..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const btn = e.currentTarget.nextSibling as HTMLButtonElement;
                btn?.click();
              }
            }}
          />
          <button
            onClick={() => {
              if (tempCompany.trim()) {
                const updated = [...(profile.professionalSummary?.notableCompanies || []), tempCompany.trim()];
                setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, notableCompanies: updated } }));
                setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                setTempCompany('');
              }
            }}
            className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all active:scale-95"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
