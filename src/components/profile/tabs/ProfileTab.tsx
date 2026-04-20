import React, { useEffect, useRef, useState } from 'react';
import { Clock, Calendar, Pencil, RefreshCw, Video } from 'lucide-react';

interface ProfileTabProps {
  profile: any;
  onSaveAbout?: (value: string) => Promise<void> | void;
  onReplaceVideo?: (file: File) => Promise<void> | void;
  isUploadingVideo?: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSaveAbout, onReplaceVideo, isUploadingVideo = false }) => {
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAboutDraft(String(profile?.professionalSummary?.profileDescription || ''));
  }, [profile?.professionalSummary?.profileDescription]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* About Section */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">About</h2>
          <button
            type="button"
            onClick={() => setIsEditingAbout(true)}
            className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-harx text-white hover:opacity-90 transition-all"
            title="Edit About"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Profile Description */}
        <div className="mb-6">
          {isEditingAbout ? (
            <div className="space-y-3">
              <textarea
                value={aboutDraft}
                onChange={(e) => setAboutDraft(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-harx-100 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-harx-200"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAboutDraft(String(profile?.professionalSummary?.profileDescription || ''));
                    setIsEditingAbout(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveAbout?.(aboutDraft);
                    setIsEditingAbout(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : profile.professionalSummary?.profileDescription ? (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.professionalSummary.profileDescription}</p>
          ) : (
            <p className="text-slate-500 italic">No professional summary provided</p>
          )}
        </div>

        {/* Introduction Video Section */}
        <div className="border-t border-slate-200/50 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-harx-900">Introduction Video</h3>
            <button
              type="button"
              onClick={() => setIsEditingVideo(true)}
              className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-harx text-white hover:opacity-90 transition-all"
              title="Edit Video"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {isEditingVideo && (
            <div className="mb-4 space-y-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="user"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await onReplaceVideo?.(file);
                  e.currentTarget.value = '';
                  setIsEditingVideo(false);
                }}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-harx-100 bg-white text-harx-700 text-sm font-black uppercase tracking-wider hover:bg-harx-50 disabled:opacity-60"
              >
                {isUploadingVideo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {isUploadingVideo ? 'Uploading...' : 'Re-record / Upload new video'}
              </button>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingVideo(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {profile.personalInfo?.presentationVideo?.url ? (
            <div className="space-y-4">
              <div className="w-full">
                <video 
                  controls 
                  className="w-full aspect-video bg-harx-900/90 rounded-2xl object-cover shadow-lg"
                >
                  <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="bg-slate-200/40 rounded-2xl p-4 border border-slate-200/30 flex gap-6">
                {profile.personalInfo.presentationVideo.duration && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-harx-400" />
                    <span>{Math.floor(profile.personalInfo.presentationVideo.duration)}s</span>
                  </div>
                )}
                {profile.personalInfo.presentationVideo.recordedAt && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-harx-400" />
                    <span>Recorded {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-amber-800 text-sm flex items-center gap-3">
              <span className="text-xl">🎥</span>
              <span>A video introduction helps you stand out. Please add one to your profile.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
