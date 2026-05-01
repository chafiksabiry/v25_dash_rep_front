import React from 'react';
import { TrendingUp, Users, DollarSign, Clock, Star, Bell, BookOpen, MessageSquare, Phone, Target, Award, ArrowRight, Briefcase, Zap, Shield, CheckCircle2 } from 'lucide-react';

export function Dashboard({ userName }: { userName?: string }) {
  const displayName = userName ? userName.split(' ')[0] : 'User';
  const stats = [
    { icon: TrendingUp, label: 'Total Earnings', value: '$12,450', change: '+14%', type: 'positive', color: 'harx' },
    { icon: Users, label: 'Completed Projects', value: '156', change: '+7%', type: 'positive', color: 'blue' },
    { icon: DollarSign, label: 'Pending Payments', value: '$2,250', change: 'pending', type: 'neutral', color: 'amber' },
    { icon: Clock, label: 'Active Hours', value: '245h', change: '+22%', type: 'positive', color: 'emerald' },
  ];

  const activeProjects = [
    {
      id: 1,
      client: 'TechCorp Inc.',
      type: 'Customer Support',
      progress: 75,
      earnings: '$450',
      deadline: '2 days left',
      status: 'In Progress'
    },
    {
      id: 2,
      client: 'E-commerce Solutions',
      type: 'Technical Support',
      progress: 40,
      earnings: '$320',
      deadline: '5 days left',
      status: 'In Progress'
    }
  ];

  const availableProjects = [
    {
      id: 1,
      title: 'Customer Support Representative',
      company: 'TechCorp Inc.',
      type: 'Phone Support',
      rate: '$25/hour',
      duration: '4 hours',
      requirements: ['Fluent English', 'Tech Knowledge']
    },
    {
      id: 2,
      title: 'Technical Support Specialist',
      company: 'Software Solutions Ltd.',
      type: 'Email Support',
      rate: '$30/hour',
      duration: '6 hours',
      requirements: ['Software Experience', 'Problem Solving']
    }
  ];

  const performanceMetrics = [
    { label: 'Customer Satisfaction', value: '4.8/5', icon: Star, color: 'text-amber-500' },
    { label: 'Response Rate', value: '98%', icon: Zap, color: 'text-blue-500' },
    { label: 'Resolution Time', value: '15m avg', icon: Clock, color: 'text-emerald-500' },
    { label: 'Conversion Rate', value: '65%', icon: Target, color: 'text-harx-500' }
  ];

  const notifications = [
    {
      id: 1,
      type: 'project',
      message: 'New project available: Technical Support for E-commerce Platform',
      time: '5 minutes ago',
      icon: Briefcase,
      color: 'blue'
    },
    {
      id: 2,
      type: 'payment',
      message: 'Payment received: $450 for Project #123',
      time: '1 hour ago',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      id: 3,
      type: 'feedback',
      message: 'New client feedback received',
      time: '2 hours ago',
      icon: MessageSquare,
      color: 'harx'
    }
  ];

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-xl shadow-slate-200/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-harx-100/30 to-blue-100/30 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-harx">{displayName}!</span>
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">Your professional metrics are looking exceptional today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-harx-500 transition-all group">
              <Bell className="w-6 h-6" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-harx-500 border-2 border-white rounded-full group-hover:scale-110 transition-transform"></span>
            </button>
            <button className="px-8 py-3.5 bg-gradient-harx text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-harx-500/30 hover:opacity-90 active:scale-95 transition-all">
              Start New Project
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-slate-50/50 backdrop-blur-md rounded-[28px] p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${
              stat.color === 'harx' ? 'bg-harx-500' :
              stat.color === 'blue' ? 'bg-blue-500' :
              stat.color === 'amber' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
                stat.color === 'harx' ? 'text-harx-500' :
                stat.color === 'blue' ? 'text-blue-500' :
                stat.color === 'amber' ? 'text-amber-500' :
                'text-emerald-500'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100 ${
                stat.type === 'positive' ? 'text-emerald-600' :
                stat.type === 'negative' ? 'text-rose-600' :
                'text-amber-600'
              }`}>
                {stat.change}
              </div>
            </div>
            
            <div className="space-y-1 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-md rounded-[32px] border border-white/80 shadow-xl shadow-slate-200/30 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/40">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-harx-500" />
              Active Projects
            </h2>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
              {activeProjects.length}
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-4">
            {activeProjects.map((project) => (
              <div key={project.id} className="p-6 group hover:bg-white/40 transition-all rounded-2xl my-2">
                <div className="flex items-center justify-between mb-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-harx-600 transition-colors">{project.client}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{project.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                      {project.status}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{project.deadline}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Completion Progress</span>
                      <span className="text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                      <div
                        className="bg-gradient-harx h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-black text-emerald-700 tracking-tight">Earnings: {project.earnings}</span>
                    </div>
                    <button className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-harx-50 hover:text-harx-500 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-8">
          {/* Performance Metrics */}
          <div className="bg-slate-950 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-harx-500/30 transition-colors"></div>
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 relative z-10 opacity-70">Insights & Metrics</h2>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <metric.icon className={`w-5 h-5 mb-3 ${metric.color}`} />
                  <p className="text-xl font-black text-white tracking-tighter">{metric.value}</p>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/80 shadow-xl shadow-slate-200/30">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: 'Start Call Session', icon: Phone, color: 'harx' },
                { label: 'View Resources', icon: BookOpen, color: 'blue' },
                { label: 'Contact Support', icon: MessageSquare, color: 'slate' }
              ].map((action, idx) => (
                <button key={idx} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-sm transition-all group">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-white transition-colors mr-3 ${
                      action.color === 'harx' ? 'text-harx-500' :
                      action.color === 'blue' ? 'text-blue-500' :
                      'text-slate-400'
                    }`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{action.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-harx-500 transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Achievements - Redesigned to match new vibe */}
          <div className="bg-gradient-harx rounded-[32px] p-8 text-white shadow-xl shadow-harx-500/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2 leading-tight">Top Performer Status</h2>
              <p className="text-white/80 text-xs font-medium leading-relaxed mb-6">
                You are currently in the top 10% of active representatives. Maintain this momentum to unlock exclusive rewards.
              </p>
              <button className="w-full bg-white text-harx-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-harx-50 transition-colors shadow-lg">
                View Achievements
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Projects - Redesigned with premium cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest flex items-center gap-3">
            <Zap className="w-6 h-6 text-amber-500" />
            Marketplace Opportunities
          </h2>
          <button className="text-xs font-black text-harx-600 uppercase tracking-widest hover:text-harx-700 transition-colors px-4 py-2 bg-harx-50 rounded-xl border border-harx-100">
            Explore All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {availableProjects.map((project) => (
            <div key={project.id} className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/80 shadow-xl shadow-slate-200/30 group hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div className="flex items-start justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-harx-600 transition-colors">{project.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <Shield className="w-3.5 h-3.5" />
                    {project.company}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{project.rate}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Per hour</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 mb-8 py-4 border-y border-slate-100/60">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-harx-400" />
                  <span className="text-xs font-bold text-slate-600">{project.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-harx-400" />
                  <span className="text-xs font-bold text-slate-600">{project.duration}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {project.requirements.map((req, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wide border border-slate-200/50"
                  >
                    {req}
                  </span>
                ))}
              </div>
              
              <button className="w-full py-4 bg-slate-900 text-white rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/10">
                Apply for placement
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity / Notifications */}
      <div className="bg-white/60 backdrop-blur-md rounded-[32px] border border-white/80 shadow-xl shadow-slate-200/30 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Bell className="w-5 h-5 text-harx-500" />
            Activity Log
          </h2>
          <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-harx-500">Mark all as read</button>
        </div>
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <div key={notification.id} className="p-6 flex items-center justify-between group hover:bg-white/40 transition-all">
              <div className="flex items-center space-x-5">
                <div className={`p-3 rounded-2xl shadow-sm border ${
                  notification.color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                  notification.color === 'emerald' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                  'bg-harx-50 border-harx-100 text-harx-500'
                }`}>
                  <notification.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900 tracking-tight leading-snug">{notification.message}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notification.time}</p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-harx-50 group-hover:text-harx-500 transition-all">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}