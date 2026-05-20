import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2, Layout, Globe, Activity as ActivityIcon, Wallet as WalletIcon, Hourglass, Trophy, Flame } from 'lucide-react';
import api, { repTransactionsApi, type RepTransactionRow } from '../utils/client';
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
  type ChartMetric = 'all' | 'reachability' | 'argumentation' | 'validation' | 'conversion';
  const [activeChartMetric, setActiveChartMetric] = useState<ChartMetric>('all');
  const { t } = useTranslation();

  // Earnings & objectifs (RepTransaction-backed)
  const [walletStats, setWalletStats] = useState<{
    availableBalance: number;
    pendingCommissions: number;
    lifetimeEarnings: number;
  }>({ availableBalance: 0, pendingCommissions: 0, lifetimeEarnings: 0 });
  const [repLedger, setRepLedger] = useState<RepTransactionRow[]>([]);

  useEffect(() => {
    const agentId = profile?._id || localStorage.getItem('agentId') || localStorage.getItem('userId');
    const realUserId = (profile?.userId && typeof profile?.userId === 'object')
      ? profile?.userId?._id
      : (profile?.userId || localStorage.getItem('userId'));

    if (!agentId) return;

    const fetchData = async () => {
      try {
        const [callsRes, gigsRes, walletRes, ledgerRes] = await Promise.all([
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls?agentId=${agentId}`),
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls/gigs?userId=${realUserId || agentId}`),
          api.get(`/escrow/agent/wallet/${agentId}`).catch(() => null),
          repTransactionsApi.list(agentId, { status: 'earned', limit: 300 }).catch(() => null)
        ]);

        const [calls, gigs] = await Promise.all([callsRes.json(), gigsRes.json()]);
        setCallsData(Array.isArray(calls.data) ? calls.data : []);
        setGigsData(Array.isArray(gigs.data) ? gigs.data : []);

        if (walletRes?.data?.success && walletRes.data.data) {
          const w = walletRes.data.data;
          setWalletStats({
            availableBalance: Number(w.availableBalance || 0),
            pendingCommissions: Number(w.pendingCommissions || 0),
            lifetimeEarnings: Number(w.lifetimeEarnings || 0)
          });
        }
        if (ledgerRes?.success && Array.isArray(ledgerRes.data)) {
          setRepLedger(ledgerRes.data);
        }
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

  // Earnings this week (last 7 days), 70% rep share from the ledger
  const weeklyEarnings = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return repLedger.reduce((sum, row) => {
      if (row.status !== 'earned') return sum;
      const created = new Date(row.createdAt).getTime();
      if (created < oneWeekAgo) return sum;
      return sum + (row.repShare || 0);
    }, 0);
  }, [repLedger]);

  // Objectif gig — uses the selected gig's bonus thresholds (volume + bonus amount).
  // Counts only this month's calls of the matching gig.
  const objectif = useMemo(() => {
    if (selectedGigId === 'all') {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthCalls = callsData.filter((c) => {
        const d = new Date(c.createdAt || c.startTime || 0).getTime();
        return d >= monthStart.getTime();
      }).length;
      return {
        label: 'Tous les Gigs',
        current: monthCalls,
        target: 0,
        bonusAmount: 0,
        progressPct: 0
      };
    }

    const gig = gigsData.find((g) => (g._id || g.id) === selectedGigId);
    const target = gig?.commission?.minimumVolume || gig?.commission?.bonusMinimumCalls || 25;
    const bonusGross = gig?.commission?.bonusAmount || gig?.rewardBonus || 120;
    const bonusRepShare = Math.round(bonusGross * 0.7 * 100) / 100;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const current = callsData.filter((c) => {
      const cGigId = typeof c.gigId === 'object' ? (c.gigId?._id || c.gigId?.id) : c.gigId;
      if (cGigId !== selectedGigId) return false;
      const d = new Date(c.createdAt || c.startTime || 0).getTime();
      return d >= monthStart.getTime();
    }).length;

    const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      label: gig?.title || 'Gig',
      current,
      target,
      bonusAmount: bonusRepShare,
      progressPct
    };
  }, [selectedGigId, gigsData, callsData]);

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

    const metricCalls = filteredCalls.filter(call => {
      if (activeChartMetric === 'all') return true;
      if (call.status?.toLowerCase() !== 'completed') return false;
      
      switch (activeChartMetric) {
        case 'reachability':
          return true; // Any completed call
        case 'argumentation':
          return call.argumentation_score >= 50 || (call.ai_call_score?.["Argumentation"]?.score || 0) >= 50 || call.ai_call_score?.overall?.score > 0;
        case 'validation':
          return call.valid === true || call.validByAI === true;
        case 'conversion':
          return call.transactionOccurred === true || call.ai_call_score?.transaction_detected === true;
        default:
          return true;
      }
    });

    const counts = range.map(date => {
      const dateString = date.toDateString();
      return metricCalls.filter(call => {
        const callDate = new Date(call.createdAt || call.date);
        return callDate.toDateString() === dateString;
      }).length;
    });

    let label = t('dashboard.performance.chartLabel');
    let color = 'rgba(59, 130, 246, 0.5)';
    let borderColor = 'rgb(59, 130, 246)';
    
    switch(activeChartMetric) {
      case 'reachability': label = "Appels Connectés"; color = 'rgba(6, 182, 212, 0.5)'; borderColor = 'rgb(6, 182, 212)'; break;
      case 'argumentation': label = "Appels Argumentés"; color = 'rgba(245, 158, 11, 0.5)'; borderColor = 'rgb(245, 158, 11)'; break;
      case 'validation': label = "Appels Conformes"; color = 'rgba(99, 102, 241, 0.5)'; borderColor = 'rgb(99, 102, 241)'; break;
      case 'conversion': label = "Ventes Réalisées"; color = 'rgba(244, 63, 94, 0.5)'; borderColor = 'rgb(244, 63, 94)'; break;
    }

    return {
      labels: range.map(d => dayNames[d.getDay()]),
      datasets: [
        {
          label,
          data: counts,
          backgroundColor: color,
          borderColor: borderColor,
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


      {/* 4 Interactive Rate Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gauge 1: Reachability */}
        <div 
          onClick={() => setActiveChartMetric(activeChartMetric === 'reachability' ? 'all' : 'reachability')}
          className={`bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between ${activeChartMetric === 'reachability' ? 'ring-2 ring-cyan-500 shadow-cyan-500/20' : ''}`}
        >
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
        <div 
          onClick={() => setActiveChartMetric(activeChartMetric === 'argumentation' ? 'all' : 'argumentation')}
          className={`bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between ${activeChartMetric === 'argumentation' ? 'ring-2 ring-amber-500 shadow-amber-500/20' : ''}`}
        >
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
        <div 
          onClick={() => setActiveChartMetric(activeChartMetric === 'validation' ? 'all' : 'validation')}
          className={`bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between ${activeChartMetric === 'validation' ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}`}
        >
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
        <div 
          onClick={() => setActiveChartMetric(activeChartMetric === 'conversion' ? 'all' : 'conversion')}
          className={`bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between ${activeChartMetric === 'conversion' ? 'ring-2 ring-rose-500 shadow-rose-500/20' : ''}`}
        >
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

      {/* Earnings & Objectifs — RepTransaction-backed (70% rep share) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Solde disponible */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solde disponible</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <WalletIcon size={18} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">
              {walletStats.availableBalance.toFixed(2)} €
            </span>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
              Prêt au retrait
            </p>
          </div>
        </div>

        {/* En attente */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En attente</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Hourglass size={18} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">
              {walletStats.pendingCommissions.toFixed(2)} €
            </span>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">
              Validation IA en cours
            </p>
          </div>
        </div>

        {/* Cette semaine */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cette semaine</span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">
              {weeklyEarnings.toFixed(2)} €
            </span>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">
              7 derniers jours
            </p>
          </div>
        </div>

        {/* Gains totaux */}
        <div className="bg-slate-950 text-white border border-slate-800 rounded-[32px] p-6 shadow-xl shadow-slate-900/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-harx-500/20 blur-3xl" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Gains totaux</span>
            <div className="h-10 w-10 rounded-2xl bg-white/10 text-white flex items-center justify-center">
              <Trophy size={18} />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-black tracking-tighter">
              {walletStats.lifetimeEarnings.toFixed(2)} €
            </span>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mt-1">
              Depuis votre arrivée
            </p>
          </div>
        </div>
      </div>

      {/* Objectif gig */}
      <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl shadow-slate-200/20 p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-harx-500/10 blur-3xl -mr-24 -mt-24" />
        <div className="flex items-start justify-between gap-6 flex-wrap relative z-10">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Target size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 tracking-tight">Objectif du mois</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                {objectif.label}
              </p>
            </div>
          </div>

          {objectif.target > 0 ? (
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Bonus à débloquer
              </span>
              <span className="text-2xl font-black text-emerald-600 tracking-tighter block mt-1 flex items-center justify-end gap-1.5">
                <Flame size={18} className="text-emerald-500" />
                +{objectif.bonusAmount.toFixed(2)} €
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 italic">
              Sélectionnez un Gig pour voir l'objectif
            </span>
          )}
        </div>

        {objectif.target > 0 && (
          <div className="mt-6 space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                <span className="text-slate-900 text-base font-black">{objectif.current}</span>
                {' '}/{' '}
                <span>{objectif.target}</span>
                {' appels validés ce mois-ci'}
              </span>
              <span className="font-black text-slate-900">{objectif.progressPct}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                  objectif.progressPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-rose-400 to-rose-600'
                }`}
                style={{ width: `${objectif.progressPct}%` }}
              />
            </div>
            {objectif.progressPct >= 100 ? (
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Objectif atteint — bonus crédité
              </p>
            ) : (
              <p className="text-[10px] font-bold text-slate-500">
                Plus que {objectif.target - objectif.current} appels validés pour décrocher votre bonus.
              </p>
            )}
          </div>
        )}
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
                  {activeChartMetric === 'all' ? t('dashboard.performance.title') : `Évolution : ${chartData.datasets[0].label}`}
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