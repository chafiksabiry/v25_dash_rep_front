import { Phone, Briefcase, Sparkles, BadgeEuro } from 'lucide-react';

export type GigCardAgentStatus = 'enrolled' | 'invited' | 'pending' | 'none' | string;

export function getGigCardStyleForStatus(status: GigCardAgentStatus, layout: 'grid' | 'page' = 'grid') {
  const motion = layout === 'grid' ? 'hover:-translate-y-1 transition-all duration-300' : 'transition-shadow duration-300';
  const baseClass =
    layout === 'grid'
      ? `group rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border ${motion} flex flex-col h-full min-w-0`
      : `group rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] border ${motion} flex flex-col min-w-0`;

  switch (status) {
    case 'enrolled':
      return {
        container: `${baseClass} bg-gradient-to-br from-white to-emerald-50/60 border-emerald-100 hover:border-emerald-300 hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)]`,
        category: 'text-emerald-600/90 group-hover:text-emerald-600',
      };
    case 'invited':
      return {
        container: `${baseClass} bg-gradient-to-br from-white to-indigo-50/60 border-indigo-100 hover:border-indigo-300 hover:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)]`,
        category: 'text-indigo-600/90 group-hover:text-indigo-600',
      };
    case 'pending':
      return {
        container: `${baseClass} bg-gradient-to-br from-white to-amber-50/60 border-amber-100 hover:border-amber-300 hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)]`,
        category: 'text-amber-600/90 group-hover:text-amber-600',
      };
    default:
      return {
        container: `${baseClass} bg-gradient-to-br from-white to-slate-50/80 border-slate-200/60 hover:border-slate-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]`,
        category: 'text-indigo-600/90 group-hover:text-indigo-600',
      };
  }
}

/** Commission pills — même rendu que le marketplace (montants après cut 0.7, bonus + volume). */
export function renderGigCommissionBadges(gig: any) {
  if (!gig || !gig.commission) return null;
  const comm = gig.commission;
  const currencySymbol = typeof comm.currency === 'object' ? comm.currency?.symbol || '€' : comm.currency || '€';

  const applyCut = (val: any) => {
    if (val === undefined || val === null || val === '') return val;
    const num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return val;
    return Number((num * 0.7).toFixed(2));
  };

  const perCall = applyCut(comm.commission_per_call);
  const hasCall = perCall !== undefined && perCall > 0;

  const transComm = comm.transactionCommission;
  const hasTrans = transComm !== undefined && (typeof transComm === 'number' ? transComm > 0 : Number(transComm.amount) > 0);
  const transAmount = applyCut(typeof transComm === 'number' ? transComm : transComm?.amount);
  const transType = typeof transComm === 'object' && transComm.type ? transComm.type : 'Transaction';

  const bonusRaw = comm.bonusAmount || comm.bonus;
  const bonus = applyCut(bonusRaw);
  const hasBonus = bonus !== undefined && bonus != 0 && bonus != '0';

  let bonusConditionStr = '';
  if (comm.minimumVolume?.amount) {
    const unit = String(comm.minimumVolume?.unit || '').toUpperCase();
    const translatedUnit =
      unit === 'CALLS' || unit === 'APPELS'
        ? 'APPELS'
        : unit === 'TRANSACTIONS'
          ? 'TRANSACTIONS'
          : unit === 'SALES' || unit === 'VENTES'
            ? 'VENTES'
            : unit;
    bonusConditionStr = `POUR ${comm.minimumVolume.amount} ${translatedUnit}`;
  }

  const bonusPeriodRaw = comm.bonusPeriod || comm.bonusType || comm.minimumVolume?.period || '';
  let bonusPeriodStr = 'BONUS';
  if (bonusPeriodRaw) {
    const p = String(bonusPeriodRaw).toLowerCase();
    if (p.includes('month') || p.includes('mois')) bonusPeriodStr = 'BONUS / MOIS';
    else if (p.includes('week') || p.includes('semaine')) bonusPeriodStr = 'BONUS / SEMAINE';
    else if (p.includes('day') || p.includes('jour')) bonusPeriodStr = 'BONUS / JOUR';
    else bonusPeriodStr = `BONUS / ${bonusPeriodRaw}`.toUpperCase();
  }

  if (bonusConditionStr) {
    bonusPeriodStr = bonusPeriodStr.replace('BONUS', `BONUS ${bonusConditionStr}`);
  }

  if (!hasCall && !hasTrans && !hasBonus) {
    const base = applyCut(comm.baseAmount);
    if (base && base != 0 && base != '0') {
      return (
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
            <BadgeEuro className="w-4 h-4 opacity-70" />
            <span className="font-black text-sm">
              {base}
              {currencySymbol}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">/yr base</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {hasCall && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg border border-cyan-400 shadow-[0_2px_12px_-2px_rgba(6,182,212,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt"
          title="Commission par appel"
        >
          <Phone className="w-3.5 h-4 fill-white animate-float" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">
              {perCall}
              {currencySymbol}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">/ appel</span>
          </div>
        </div>
      )}

      {hasTrans && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg border border-violet-400 shadow-[0_2px_12px_-2px_rgba(139,92,246,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt"
          title="Commission par transaction"
        >
          <Briefcase className="w-3.5 h-3.5 fill-white animate-float" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">
              {transAmount}
              {currencySymbol}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">/ {transType}</span>
          </div>
        </div>
      )}

      {hasBonus && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg border border-pink-400 shadow-[0_2px_12px_-2px_rgba(244,63,94,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt"
          title="Bonus"
        >
          <Sparkles className="w-3.5 h-3.5 fill-white animate-wiggle" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">
              +{bonus}
              {String(bonus).includes('€') ? '' : currencySymbol}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">{bonusPeriodStr}</span>
          </div>
        </div>
      )}
    </div>
  );
}
