import React from 'react';
import { Clock, CheckCircle, AlertTriangle, RefreshCw, ChevronRight, Pencil } from 'lucide-react';

interface OnboardingTabProps {
  profile: any;
  countryMismatch: any;
  checkingCountryMismatch: boolean;
  showLoadingSpinner: boolean;
  timezoneData: any;
  getTimezoneMismatchInfo: () => any;
  repWizardApi: any;
  onEditItemClick: (tab?: string) => void;
}

export const OnboardingTab: React.FC<OnboardingTabProps> = ({
  profile,
  countryMismatch,
  checkingCountryMismatch,
  showLoadingSpinner,
  timezoneData,
  getTimezoneMismatchInfo,
  repWizardApi,
  onEditItemClick
}) => {
  const onboardingPhases = [1, 2, 3, 4];
  const timezoneMismatch = getTimezoneMismatchInfo();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Verification & Alerts Section */}
      {(countryMismatch?.hasMismatch || checkingCountryMismatch || timezoneMismatch) && (
        <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-5">Verification Notices</h2>
          
          <div className="space-y-4">
            {/* Country Mismatch */}
            {countryMismatch?.hasMismatch && (
              <div className="p-5 bg-rose-50/50 border border-rose-100/50 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-rose-800 text-sm uppercase tracking-wide">Location Mismatch</h4>
                  <p className="text-sm text-rose-700 mt-1 leading-relaxed">
                    Account registered from <span className="font-bold underline">{countryMismatch.firstLoginCountry}</span>, but your profile specifies <span className="font-bold underline">{countryMismatch.selectedCountry}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Timezone Mismatch */}
            {timezoneMismatch && (
              <div className="p-5 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex items-start gap-4">
                <Clock className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-amber-800 text-sm uppercase tracking-wide">Timezone Synchronization</h4>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                    Your working timezone (<span className="font-bold">{timezoneMismatch.timezoneName}</span>) belongs to <span className="font-bold">{timezoneMismatch.timezoneCountry}</span>, while your profile country is <span className="font-bold">{timezoneMismatch.selectedCountry}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Validation Loading */}
            {checkingCountryMismatch && showLoadingSpinner && (
              <div className="flex items-center gap-3 p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-sm font-bold text-indigo-700">Verifying location data...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Onboarding Progress */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Onboarding Progress</h2>
        <div className="space-y-4">
          {onboardingPhases.map((phaseNum) => {
            const phaseKey = `phase${phaseNum}`;
            const status = profile.onboardingProgress?.phases?.[phaseKey]?.status || 'pending';
            const isCompleted = status === 'completed';
            const isCurrent = status === 'in_progress';

            return (
              <div key={phaseNum} className={`
                flex items-center gap-5 p-5 rounded-3xl border transition-all
                ${isCompleted ? 'bg-emerald-50/20 border-emerald-100/50' : 
                  isCurrent ? 'bg-indigo-50/40 border-indigo-200/50 shadow-sm scale-[1.02]' : 
                  'bg-slate-200/40 border-slate-200/30 opacity-60'}
              `}>
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner
                  ${isCompleted ? 'bg-emerald-500 text-white' : 
                    isCurrent ? 'bg-indigo-600 text-white animate-pulse' : 
                    'bg-slate-50 text-slate-400 border border-slate-200'}
                `}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : phaseNum}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 uppercase">Phase {phaseNum}</span>
                    <span className={`
                      text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter
                      ${isCompleted ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                    `}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    {isCompleted ? 'Steps successfully verified' : 'Requires additional information'}
                  </div>
                </div>
                
                {isCurrent && (
                  <button 
                    onClick={() => window.location.href = '/reporchestrator'}
                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEditItemClick('profile')}
                  className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Edit onboarding related info"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Working Hours & Availability */}
      <div className="bg-slate-100/60 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Availability & Schedule</h2>
          <button
            type="button"
            onClick={() => onEditItemClick('availability')}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Selected Timezone</h3>
            <div className="p-5 bg-slate-200/40 rounded-2xl border border-slate-200/30">
              <span className="text-sm font-bold text-slate-700">
                {timezoneData
                  ? repWizardApi.formatTimezone(timezoneData)
                  : typeof profile.availability?.timeZone === 'string'
                    ? profile.availability.timeZone
                    : 'Not configured'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Weekly Schedule</h3>
            <div className="space-y-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const daySchedule = profile.availability?.schedule?.find((s: any) => s.day === day);
                return (
                  <div key={day} className="flex items-center justify-between px-4 py-2 bg-slate-200/40 rounded-xl border border-slate-200/30">
                    <span className="text-xs font-bold text-slate-600">{day}</span>
                    <span className={`text-[10px] font-black uppercase ${daySchedule ? 'text-indigo-600' : 'text-slate-300 italic'}`}>
                      {daySchedule ? `${daySchedule.hours.start} - ${daySchedule.hours.end}` : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
