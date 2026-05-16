/** Same rule as GigsMarketplace: agent-facing amounts use a 0.7 multiplier. */
export const AGENT_COMMISSION_MULTIPLIER = 0.7;

export type GigCommissionLike = {
  transactionCommission?: number | { type?: string; amount?: string | number };
  bonusAmount?: string | number;
  bonus?: string | number;
  minimumVolume?: { amount?: string | number; period?: string; unit?: string };
  bonusPeriod?: string;
  bonusType?: string;
};

export function applyAgentCut(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (Number.isNaN(num)) return null;
  return Number((num * AGENT_COMMISSION_MULTIPLIER).toFixed(2));
}

function unitLabelFr(unitRaw: string | undefined): string {
  const u = String(unitRaw || '').toUpperCase();
  if (u === 'CALLS' || u === 'APPEL' || u === 'APPELS') return 'appels';
  if (u === 'TRANSACTIONS' || u === 'TRANSACTION') return 'transactions';
  if (u === 'SALES' || u === 'VENTES' || u === 'VENTE') return 'ventes';
  if (!u) return 'unités';
  return u.toLowerCase();
}

function periodLabelFr(periodRaw: string | undefined): string | null {
  const p = String(periodRaw || '').toLowerCase();
  if (!p) return null;
  if (p.includes('month') || p === 'monthly' || p === 'mois') return 'mois';
  if (p.includes('week') || p === 'weekly' || p.includes('semaine')) return 'semaine';
  if (p.includes('day') || p === 'daily' || p.includes('jour')) return 'jour';
  return periodRaw!.trim();
}

/**
 * Second line for the bonus pill (e.g. "chaque 25 appels / mois") from minimumVolume / bonusPeriod.
 */
export function formatBonusVolumeLine(comm: GigCommissionLike | undefined): string | null {
  if (!comm) return null;
  const mv = comm.minimumVolume;
  const amount = mv?.amount !== undefined && mv?.amount !== null ? String(mv.amount).trim() : '';
  if (amount && amount !== '0') {
    const unit = unitLabelFr(mv?.unit);
    const periodSrc = comm.bonusPeriod || comm.bonusType || mv?.period;
    const period = periodLabelFr(periodSrc);
    if (period) return `chaque ${amount} ${unit} / ${period}`;
    return `chaque ${amount} ${unit}`;
  }
  const fallbackPeriod = periodLabelFr(comm.bonusPeriod || comm.bonusType);
  if (fallbackPeriod) return `par ${fallbackPeriod}`;
  return null;
}

export type TransactionPillDisplay = {
  primary: string;
  /** When true, do not append currency symbol after primary */
  isPercent: boolean;
};

/**
 * Transaction badge: numeric `transactionCommission` from the gig is treated as a gross amount in currency;
 * the pill shows the agent share (× 0.7).
 * Use `{ type: 'percentage' | 'percent', amount }` to show `amount%` explicitly.
 * Other object shapes use `amount` as currency and apply the same × 0.7 rule.
 */
export function getTransactionPillDisplay(
  comm: GigCommissionLike | undefined,
  currencySymbol: string
): TransactionPillDisplay | null {
  const raw = comm?.transactionCommission;
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'object') {
    const type = String(raw.type || '').toLowerCase();
    const amtRaw = raw.amount;
    const amt = amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
    if (Number.isNaN(amt) || amt <= 0) return null;

    if (type === 'percentage' || type === 'percent' || type === '%') {
      return { primary: `${amt}%`, isPercent: true };
    }

    const cut = applyAgentCut(amt);
    if (cut !== null && cut > 0) return { primary: `${cut}`, isPercent: false };
    return null;
  }

  const num = Number(String(raw).replace(/,/g, ''));
  if (Number.isNaN(num) || num <= 0) return null;

  const cut = applyAgentCut(num);
  if (cut === null || cut <= 0) return null;
  return { primary: `${cut}`, isPercent: false };
}

export type BonusPillDisplay = { primary: string; secondary: string | null };

export function getBonusPillDisplay(comm: GigCommissionLike | undefined, currencySymbol: string): BonusPillDisplay | null {
  const raw = comm?.bonusAmount ?? comm?.bonus;
  if (raw === undefined || raw === null || raw === '') return null;
  const base = parseFloat(String(raw).replace(/,/g, ''));
  if (Number.isNaN(base) || base === 0) return null;

  const cut = applyAgentCut(raw);
  if (cut === null || cut <= 0) return null;

  const sym = String(raw).includes('€') ? '' : currencySymbol;
  const primary = `+${cut}${sym}`;
  const secondary = formatBonusVolumeLine(comm);
  return { primary, secondary };
}
