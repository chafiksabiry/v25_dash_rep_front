import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2, Layout, Globe, Activity as ActivityIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardProps {
  profile?: any;
}

export function Dashboard({ profile }: DashboardProps) {
  const [callsData, setCallsData] = useState<any[]>([]);
  const [gigsData, setGigsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string>('all');
  const { t } = useTranslation();

  useEffect(() => {
    const agentId = profile?._id || localStorage.getItem('agentId') || localStorage.getItem('userId');
    const realUserId = (profile?.userId && typeof profile?.userId === 'object')
      ? profile?.userId?._id
      : (profile?.userId || localStorage.getItem('userId'));

    if (!agentId) return;

    const fetchData = async () => {
      try {
        const [callsRes, gigsRes] = await Promise.all([
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls?agentId=${agentId}`),
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls/gigs?userId=${realUserId || agentId}`)
        ]);
        
        const [calls, gigs] = await Promise.all([callsRes.json(), gigsRes.json()]);
        setCallsData(Array.isArray(calls.data) ? calls.data : []);
        setGigsData(Array.isArray(gigs.data) ? gigs.data : []);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // Dynamic filter logic
  const filteredCalls = React.useMemo(() => {
    if (selectedGigId === 'all') {
      return callsData;
    }
    return callsData.filter(call => {
      const cGigId = typeof call.gigId === 'object' ? (call.gigId?._id || call.gigId?.id) : call.gigId;
      return cGigId === selectedGigId;
    });
  }, [callsData, selectedGigId]);

  // Rate calculations
  const totalCallsCount = filteredCalls.length;
  const completedCallsCount = filteredCalls.filter(call => 
    call.status?.toLowerCase() === 'completed'
  ).length;

  const reachabilityPct = totalCallsCount > 0 
    ? Math.round((completedCallsCount / totalCallsCount) * 100) 
    : 0;

  const pitchCount = filteredCalls.filter(call => 
    call.status?.toLowerCase() === 'completed' && (
      call.argumentation_score >= 50 || 
      (call.ai_call_score?.["Argumentation"]?.score || 0) >= 50 ||
      call.ai_call_score?.overall?.score > 0
    )
  ).length;

  const argumentationPct = completedCallsCount > 0 
    ? Math.round((pitchCount / completedCallsCount) * 100) 
    : 0;

  const validCount = filteredCalls.filter(call => 
    call.status?.toLowerCase() === 'completed' && (
      call.valid === true || 
      call.validByAI === true
    )
  ).length;

  const validationPct = completedCallsCount > 0 
    ? Math.round((validCount / completedCallsCount) * 100) 
    : 0;

  const transactionCount = filteredCalls.filter(call => 
    call.status?.toLowerCase() === 'completed' && (
      call.transactionOccurred === true || 
      call.ai_call_score?.transaction_detected === true
    )
  ).length;

  const conversionPct = completedCallsCount > 0 
    ? Math.round((transactionCount / completedCallsCount) * 100) 
    : 0;

  // Helper to calculate score (ported from ProfileView)
  const calculateOverallScore = () => {
    if (!profile?.skills?.contactCenter?.length || !profile?.skills?.contactCenter[0]?.assessmentResults?.keyMetrics) return 75; // Fallback
    const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
    return Math.floor((professionalism + effectiveness + customerFocus) / 3);
  };

  const displayName = profile?.personalInfo?.name ? profile.personalInfo.name.split(' ')[0] : 'User';
  const overallScore = calculateOverallScore();
  
  const calculateOnboardingProgress = () => {
    if (!profile?.onboardingProgress?.phases) return 0;
    const phases = profile.onboardingProgress.phases;
    const completedPhases = Object.values(phases).filter((p: any) => p.status === 'completed').length;
    return Math.round((completedPhases / 5) * 100);
  };

  const onboardingProgress = calculateOnboardingProgress();

  const stats = [
    { icon: TrendingUp, label: t('dashboard.stats.repsScore'), value: `${overallScore}/100`, change: t('dashboard.stats.current'), type: 'positive', color: 'harx' },
    { icon: Layout, label: t('dashboard.stats.onboarding'), value: `${onboardingProgress}%`, change: t('dashboard.stats.progress'), type: 'positive', color: 'blue' },
    { icon: Briefcase, label: t('dashboard.stats.gigsEnrolled'), value: gigsData.length, change: t('dashboard.stats.active'), type: 'neutral', color: 'amber' },
    { icon: Phone, label: t('dashboard.stats.callsPassed'), value: filteredCalls.length, change: t('dashboard.stats.total'), type: 'positive', color: 'emerald' },
  ];

  const processCallsForChart = () => {
    const now = new Date();
    const daysToShow = 7;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const range = Array.from({ length: daysToShow }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToShow - 1 - i));
      return d;
    });

    const counts = range.map(date => {
      const dateString = date.toDateString();
      return filteredCalls.filter(call => {
        const callDate = new Date(call.createdAt || call.date);
        return callDate.toDateString() === dateString;
      }).length;
    });

    return {
      labels: range.map(d => dayNames[d.getDay()]),
      datasets: [
        {
          label: t('dashboard.performance.chartLabel'),
          data: counts,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  };

  const chartData = processCallsForChart();
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  };

  const performanceMetrics = [
    { label: t('dashboard.expertise.professionalism'), value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.professionalism || 85, icon: Shield, color: 'text-blue-500' },
    { label: t('dashboard.expertise.effectiveness'), value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.effectiveness || 90, icon: Zap, color: 'text-amber-500' },
    { label: t('dashboard.expertise.customerFocus'), value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.customerFocus || 92, icon: Users, color: 'text-emerald-500' },
    { label: t('dashboard.expertise.overallMatch'), value: `${overallScore}%`, icon: Target, color: 'text-harx-500' }
  ];

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Dynamic Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-xl shadow-slate-200/10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Bonjour, {displayName} 👋
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Suivi en temps réel de vos indicateurs de performance commerciale
          </p>
        </div>

        {/* Beautiful Glassmorphic Dropdown */}
        <div className="relative flex items-center gap-2.5 shrink-0">
          <Briefcase size={16} className="text-purple-600 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrer :</span>
          <select
            value={selectedGigId}
            onChange={(e) => setSelectedGigId(e.target.value)}
            className="appearance-none bg-white/80 border border-slate-100 hover:border-purple-200 px-4 py-2.5 pr-10 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 min-w-[200px]"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <option value="all">Tous les Gigs (All Gigs)</option>
            {gigsData.map((gig) => (
              <option key={gig._id || gig.id} value={gig._id || gig.id}>
                {gig.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-xl shadow-slate-200/20 hover:shadow-harx-500/10 transition-all duration-500">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${
              stat.color === 'harx' ? 'bg-harx-500' :
              stat.color === 'blue' ? 'bg-blue-500' :
              stat.color === 'amber' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                stat.color === 'harx' ? 'text-harx-500' :
                stat.color === 'blue' ? 'text-blue-500' :
                stat.color === 'amber' ? 'text-amber-500' :
                'text-emerald-500'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/80 border border-slate-100 text-slate-500 shadow-sm">
                {stat.change}
              </div>
            </div>
            
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                {loading ? '...' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4 Interactive Rate Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gauge 1: Reachability */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between">
          <div className="flex flex-col items-center text-center space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de Joignabilité</span>
            
            {/* SVG Circle Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-slate-100/50" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" className="stroke-cyan-500 transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * reachabilityPct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{reachabilityPct}%</span>
                <span className="text-[9px] text-cyan-600 font-extrabold uppercase tracking-wide">Connected</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-bold leading-tight">
              {completedCallsCount} / {totalCallsCount} Appels Réussis
            </p>
          </div>
          <p className="border-t border-slate-100/80 pt-3 mt-4 text-[10px] text-slate-400 font-semibold italic text-center w-full leading-relaxed">
            Pourcentage d'appels ayant abouti à un échange de vive voix avec le client.
          </p>
        </div>

        {/* Gauge 2: Pitch/Argumentation */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between">
          <div className="flex flex-col items-center text-center space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux d'Argumentation</span>
            
            {/* SVG Circle Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-slate-100/50" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" className="stroke-amber-500 transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * argumentationPct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{argumentationPct}%</span>
                <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wide">Pitched</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-bold leading-tight">
              {pitchCount} / {completedCallsCount} Appels Argumentés
            </p>
          </div>
          <p className="border-t border-slate-100/80 pt-3 mt-4 text-[10px] text-slate-400 font-semibold italic text-center w-full leading-relaxed">
            Pourcentage d'appels connectés où un argumentaire structuré a été présenté.
          </p>
        </div>

        {/* Gauge 3: AI Validation */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between">
          <div className="flex flex-col items-center text-center space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux d'Appels Valides</span>
            
            {/* SVG Circle Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-slate-100/50" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" className="stroke-indigo-500 transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * validationPct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{validationPct}%</span>
                <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wide">AI Compliant</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-bold leading-tight">
              {validCount} / {completedCallsCount} Appels Conformes
            </p>
          </div>
          <p className="border-t border-slate-100/80 pt-3 mt-4 text-[10px] text-slate-400 font-semibold italic text-center w-full leading-relaxed">
            Pourcentage d'appels qualifiés et validés conformes par notre audit IA.
          </p>
        </div>

        {/* Gauge 4: Conversion Rate */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-default flex flex-col justify-between">
          <div className="flex flex-col items-center text-center space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de Conversion</span>
            
            {/* SVG Circle Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-slate-100/50" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" className="stroke-rose-500 transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * conversionPct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tighter">{conversionPct}%</span>
                <span className="text-[9px] text-rose-600 font-extrabold uppercase tracking-wide">Transactions</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-bold leading-tight">
              {transactionCount} / {completedCallsCount} Ventes Réalisées
            </p>
          </div>
          <p className="border-t border-slate-100/80 pt-3 mt-4 text-[10px] text-slate-400 font-semibold italic text-center w-full leading-relaxed">
            Pourcentage d'appels aboutissant à une transaction ou vente confirmée.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Histogram */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/30 overflow-hidden">
          <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-harx-500 text-white flex items-center justify-center shadow-lg shadow-harx-500/20">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                  {t('dashboard.performance.title')}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  {t('dashboard.performance.subtitle')}
                </p>
              </div>
            </div>
          </div>
          <div className="p-10">
            <div className="h-[300px] w-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Assessment Metrics */}
        <div className="bg-slate-950 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-harx-500/30 transition-colors"></div>
          <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 relative z-10 opacity-70">{t('dashboard.expertise.title')}</h2>
          <div className="grid grid-cols-1 gap-6 relative z-10">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${metric.color}`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">{metric.label}</p>
                </div>
                <p className="text-2xl font-black text-white tracking-tighter group-hover/item:scale-110 transition-transform">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}