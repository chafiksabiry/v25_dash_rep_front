import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2, Layout, Globe, Activity } from 'lucide-react';
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

  useEffect(() => {
    const userId = profile?._id || localStorage.getItem('userId');
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [callsRes, gigsRes] = await Promise.all([
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls?userId=${userId}`),
          fetch(`https://v25dashboardbackend-production.up.railway.app/api/calls/gigs?userId=${userId}`)
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
    { icon: TrendingUp, label: 'REPS Score', value: `${overallScore}/100`, change: 'Current', type: 'positive', color: 'harx' },
    { icon: Layout, label: 'Onboarding', value: `${onboardingProgress}%`, change: 'Progress', type: 'positive', color: 'blue' },
    { icon: Briefcase, label: 'Gigs Enrolled', value: gigsData.length, change: 'Active', type: 'neutral', color: 'amber' },
    { icon: Phone, label: 'Calls Passed', value: callsData.length, change: 'Total', type: 'positive', color: 'emerald' },
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
      return callsData.filter(call => {
        const callDate = new Date(call.createdAt || call.date);
        return callDate.toDateString() === dateString;
      }).length;
    });

    return {
      labels: range.map(d => dayNames[d.getDay()]),
      datasets: [
        {
          label: 'Calls',
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
    { label: 'Professionalism', value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.professionalism || 85, icon: Shield, color: 'text-blue-500' },
    { label: 'Effectiveness', value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.effectiveness || 90, icon: Zap, color: 'text-amber-500' },
    { label: 'Customer Focus', value: profile?.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.customerFocus || 92, icon: Users, color: 'text-emerald-500' },
    { label: 'Overall Match', value: `${overallScore}%`, icon: Target, color: 'text-harx-500' }
  ];

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Histogram */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/30 overflow-hidden">
          <div className="px-10 py-8 border-b border-white/40 flex items-center justify-between bg-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-harx-500 text-white flex items-center justify-center shadow-lg shadow-harx-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                  Performance Activity
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Your daily call volume
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
          <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 relative z-10 opacity-70">Expertise Analysis</h2>
          <div className="grid grid-cols-1 gap-6 relative z-10">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/item">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${metric.color}`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">{metric.label}</p>
                </div>
                <p className="text-2xl font-black text-white tracking-tighter group-hover/item:scale-110 transition-transform">{metric.value}{typeof metric.value === 'number' ? '' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
