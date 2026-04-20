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
  const [isRecorderReady, setIsRecorderReady] = useState(false);
  const [isRecordingNow, setIsRecordingNow] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setAboutDraft(String(profile?.professionalSummary?.profileDescription || ''));
  }, [profile?.professionalSummary?.profileDescription]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  };

  const startRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
      }
      setIsRecorderReady(true);
      setRecordedVideoBlob(null);
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl('');
      }
    } catch (error) {
      console.error('Camera/microphone access failed:', error);
      window.alert('Unable to access camera/microphone.');
    }
  };

  const beginRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordedVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      stopCameraStream();
      setIsRecorderReady(false);
      setIsRecordingNow(false);
    };

    recorder.start();
    setIsRecordingNow(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

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
              {!isRecorderReady && !recordedVideoBlob && (
                <button
                  type="button"
                  onClick={startRecorder}
                  disabled={isUploadingVideo}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-harx-100 bg-white text-harx-700 text-sm font-black uppercase tracking-wider hover:bg-harx-50 disabled:opacity-60"
                >
                  <Video className="w-4 h-4" />
                  Start recording
                </button>
              )}

              {isRecorderReady && (
                <div className="space-y-3">
                  <video ref={liveVideoRef} muted className="w-full aspect-video bg-black rounded-2xl object-cover" />
                  <div className="flex items-center justify-end gap-2">
                    {!isRecordingNow ? (
                      <button
                        type="button"
                        onClick={beginRecording}
                        className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
                      >
                        Record
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              )}

              {recordedVideoUrl && (
                <div className="space-y-3">
                  <video controls src={recordedVideoUrl} className="w-full aspect-video bg-black rounded-2xl object-cover" />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!recordedVideoBlob) return;
                        const file = new File([recordedVideoBlob], 'presentation-video.webm', { type: 'video/webm' });
                        await onReplaceVideo?.(file);
                        setIsEditingVideo(false);
                      }}
                      disabled={isUploadingVideo}
                      className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-60"
                    >
                      {isUploadingVideo ? <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</span> : 'Use this video'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsEditingVideo(false);
                    setIsRecorderReady(false);
                    setIsRecordingNow(false);
                    setRecordedVideoBlob(null);
                    if (recordedVideoUrl) {
                      URL.revokeObjectURL(recordedVideoUrl);
                      setRecordedVideoUrl('');
                    }
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
