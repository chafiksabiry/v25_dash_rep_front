import React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Calendar,
  Brain,
  PhoneOutgoing,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  PlayCircle,
  RefreshCw,
  X,
  Check,
  BadgeCheck,
  MessageSquare,
  Star,
  Globe,
  Download,
  TrendingUp,
  Activity as ActivityIcon,
  BookOpen,
  ChevronDown,
  Clock,
  CreditCard,
  Voicemail,
  PhoneOff,
  PhoneMissed,
  Calendar as CalendarIcon,
  Repeat,
  Ban,
  TrendingDown,
  Hash,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/client';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';

export interface CallRecord {
  repCallCommission?: number;
  _id: string;
  call_id?: string;
  agent: string;
  lead?: Lead;
  sid?: string;
  parentCallSid?: string | null;
  direction: 'inbound' | 'outbound-dial';
  provider?: 'twilio';
  startTime: Date;
  endTime?: Date | null;
  status: string;
  duration: number;
  price?: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  transactionOccurred?: boolean | null;
  transaction?: {
    repTransactionCommission?: number;
    _id?: string;
    validByAI?: boolean;
    validByCompany?: boolean;
    updatedAt?: string;
    valid?: boolean | null;
  } | null;
  validByAI?: boolean | null;
  valid?: boolean | null;
  ai_refusal_reason?: string | null;
  argumentation_score?: number;
  ai_call_score?: {
    'Agent fluency': { score: number; feedback: string };
    'Sentiment analysis': { score: number; feedback: string };
    'Fraud detection': { score: number; feedback: string };
    'Script coherence': { score: number; feedback: string };
    'Argumentation': { score: number; feedback: string };
    'Transaction analysis'?: { score: number; feedback: string };
    overall: { score: number; feedback: string };
    transaction_detected?: boolean;
    refusal_detected?: boolean;
  };
  // ── Unified call-analysis layer (shared with calls backend + ops dashboard) ──
  /** Lifecycle of the AI analyzer: pending → processing → scored | auto_refused | error. */
  ai_call_status?: 'pending' | 'processing' | 'scored' | 'auto_refused' | 'error' | null;
  /** Persisted summary (LLM). Falls back to ai_call_score.overall.feedback when absent. */
  ai_summary?: string | null;
  /** Disposition of the call (transaction, appointment, refusal, voicemail, ...). */
  callOutcome?:
    | 'transaction'
    | 'appointment'
    | 'callback_requested'
    | 'argued_interested'
    | 'refusal'
    | 'not_interested'
    | 'already_insured'
    | 'voicemail'
    | 'no_answer'
    | 'busy'
    | 'wrong_number'
    | 'fraud'
    | 'too_short'
    | 'connected_no_sale'
    | null;
  callOutcomeSource?: 'ai' | 'rep' | 'system' | null;
  /** Denormalised flags. `flags.fraud` is the canonical fraud signal now. */
  flags?: {
    fraud?: boolean;
    serious?: boolean;
    transactionDetected?: boolean;
    refusalDetected?: boolean;
  };
  callbackAt?: string | Date | null;
  appointmentAt?: string | Date | null;
  agentValidation?: string;
  companyValidation?: string;
  childCalls?: string[];
  from?: string;
  to?: string;
  transcript?: {
    speaker: string;
    text: string;
    timestamp?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}


interface Lead {
  _id: string;
  name?: string;
  First_Name?: string;
  Last_Name?: string;
  company?: string;
  Deal_Name?: string;
  email?: string;
  Email_1?: string;
  phone?: string;
  Phone?: string;
  gigId?: {
    _id: string;
    title: string;
    commission?: {
      commission_per_call?: number;
      transactionCommission?: number;
    };
    rewardPerCall?: number;
    rewardPerSale?: number;
  };
  status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value?: number;
  probability?: number;
  source?: string;
  assignedTo?: string;
  lastContact?: Date;
  nextAction?: 'call' | 'email' | 'meeting' | 'follow-up';
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecordsProps {
  gigId?: string;
  leadId?: string;
  callValidationFilter?: 'all' | 'approved' | 'pending';
  transactionValidationFilter?: 'all' | 'approved' | 'refused' | 'pending';
}

/** Is the AI analyzer still running (or hasn't run yet) for this call? */
function isAnalysisPending(record: CallRecord): boolean {
  // Prefer the explicit lifecycle field when the backend has set it.
  if (record.ai_call_status) {
    return record.ai_call_status === 'pending' || record.ai_call_status === 'processing';
  }
  // Legacy fallback: pre-analyzer calls only had `validByAI == null`.
  return record.validByAI == null;
}

/**
 * Rich rendering details for the AI-Insights tab "Disposition" card.
 * One entry per `callOutcome` value, plus a sensible fallback for legacy
 * calls that don't carry the field yet.
 */
type OutcomeDetail = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind color base used for borders, icons and the gradient header. */
  color: 'emerald' | 'violet' | 'amber' | 'rose' | 'slate' | 'blue' | 'red';
  /** One-liner explanation shown under the title. */
  reason: string;
  /** Suggested next-best-actions for the rep. */
  nextActions: string[];
};

const OUTCOME_DETAILS: Record<string, OutcomeDetail> = {
  transaction: {
    label: 'Transaction conclue',
    icon: BadgeCheck,
    color: 'emerald',
    reason: 'Le lead a accepté l\'offre durant l\'appel — vente détectée par l\'IA.',
    nextActions: [
      'Vérifier que la vente est bien marquée signée côté CRM',
      'Confirmer la validation entreprise pour libérer la commission',
    ],
  },
  appointment: {
    label: 'Rendez-vous fixé',
    icon: CalendarIcon,
    color: 'violet',
    reason: 'Un rendez-vous a été convenu avec le lead.',
    nextActions: [
      'S\'assurer que le RDV est synchronisé dans l\'agenda',
      'Préparer la fiche lead pour le rappel de confirmation',
    ],
  },
  callback_requested: {
    label: 'Rappel demandé',
    icon: Repeat,
    color: 'amber',
    reason: 'Le lead souhaite être rappelé plus tard.',
    nextActions: [
      'Planifier le rappel à l\'heure convenue',
      'Noter le contexte pour éviter de repartir de zéro',
    ],
  },
  argued_interested: {
    label: 'Argumenté — intéressé',
    icon: TrendingUp,
    color: 'emerald',
    reason: 'L\'argumentaire a été déroulé, le lead reste intéressé sans signer.',
    nextActions: [
      'Programmer un rappel court J+2',
      'Préparer une réponse aux objections détectées',
    ],
  },
  refusal: {
    label: 'Refus catégorique',
    icon: Ban,
    color: 'rose',
    reason: 'Le lead a refusé fermement l\'offre.',
    nextActions: [
      'Marquer le lead comme refus dans la base',
      'Ne pas re-tenter avant la fenêtre de cooling-off',
    ],
  },
  not_interested: {
    label: 'Pas intéressé',
    icon: TrendingDown,
    color: 'amber',
    reason: 'Lead poliment désintéressé — pas un refus catégorique.',
    nextActions: [
      'Tenter une approche différente plus tard',
      'Vérifier si un autre produit correspond mieux',
    ],
  },
  already_insured: {
    label: 'Déjà assuré',
    icon: ShieldCheck,
    color: 'blue',
    reason: 'Le lead a déjà une couverture en cours.',
    nextActions: [
      'Noter l\'échéance pour relancer avant renouvellement',
      'Retirer le lead des prochaines campagnes immédiates',
    ],
  },
  voicemail: {
    label: 'Messagerie vocale',
    icon: Voicemail,
    color: 'slate',
    reason: 'L\'appel est tombé sur la messagerie — aucun échange avec le lead.',
    nextActions: [
      'Replanifier l\'appel sur une plage horaire différente',
      'Envoyer éventuellement un SMS court pour signaler le passage',
    ],
  },
  no_answer: {
    label: 'Non décroché',
    icon: PhoneMissed,
    color: 'slate',
    reason: 'Le lead n\'a pas répondu.',
    nextActions: [
      'Rappeler dans 24h sur un autre créneau',
      'Si > 5 tentatives sans réponse, basculer en "épuisé"',
    ],
  },
  busy: {
    label: 'Occupé',
    icon: PhoneOff,
    color: 'slate',
    reason: 'Ligne occupée — pas de connexion établie.',
    nextActions: ['Réessayer plus tard dans la journée'],
  },
  wrong_number: {
    label: 'Faux numéro',
    icon: Hash,
    color: 'rose',
    reason: 'Le numéro est invalide ou ne mène pas au lead.',
    nextActions: [
      'Marquer le lead comme "faux numéro" dans la base',
      'Demander une mise à jour des coordonnées',
    ],
  },
  fraud: {
    label: 'Fraude détectée',
    icon: ShieldAlert,
    color: 'red',
    reason: 'L\'IA a détecté un comportement frauduleux (score Fraud < 50).',
    nextActions: [
      'Signaler l\'appel pour revue par l\'équipe compliance',
      'L\'appel ne génère pas de commission',
    ],
  },
  too_short: {
    label: 'Trop court',
    icon: Clock,
    color: 'slate',
    // This outcome is reserved for calls the AI never scored (e.g. hangup
    // before the analyzer pipeline ran). Scored calls go through
    // `connected_no_sale` even when short, because content > duration.
    reason: 'L\'appel a été interrompu avant l\'analyse IA — durée très courte.',
    nextActions: [
      'Rappeler le lead pour un vrai échange',
      'Si l\'appel a duré quelques secondes seulement, vérifier l\'enregistrement',
    ],
  },
  connected_no_sale: {
    label: 'Connecté sans suite',
    icon: HelpCircle,
    color: 'slate',
    // Catch-all for calls where the AI ran but no specific signal triggered
    // (e.g. agent silent, dead-air, polite but non-engaging exchange).
    reason: 'Conversation établie sans issue claire identifiée par l\'IA.',
    nextActions: [
      'Consulter le transcript et les scores IA pour comprendre',
      'Replanifier un appel si le potentiel reste à explorer',
    ],
  },
};

/** Resolve a CallRecord to its OutcomeDetail (with a safe fallback). */
function resolveOutcomeDetail(record: CallRecord): OutcomeDetail {
  if (record.callOutcome && OUTCOME_DETAILS[record.callOutcome]) {
    return OUTCOME_DETAILS[record.callOutcome]!;
  }
  // Legacy fallback: derive from telephony status when callOutcome is missing.
  const status = (record.status || '').toLowerCase();
  if (['no-answer', 'noanswer', 'canceled', 'cancelled'].includes(status)) return OUTCOME_DETAILS.no_answer!;
  if (status === 'busy') return OUTCOME_DETAILS.busy!;
  if (status === 'failed') return OUTCOME_DETAILS.wrong_number!;
  return OUTCOME_DETAILS.connected_no_sale!;
}

/** Map `callOutcome` to a short label + tone for the disposition pill. */
function callOutcomeBadge(
  outcome: CallRecord['callOutcome'] | undefined
): { label: string; tone: string } | null {
  if (!outcome) return null;
  const map: Record<string, { label: string; tone: string }> = {
    transaction:        { label: 'Transaction',  tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    appointment:        { label: 'RDV',          tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    callback_requested: { label: 'Rappel',       tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    argued_interested:  { label: 'Argumenté',    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refusal:            { label: 'Refus',        tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_interested:     { label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    already_insured:    { label: 'Déjà assuré',  tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    voicemail:          { label: 'Messagerie',   tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    no_answer:          { label: 'Non décroché', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    busy:               { label: 'Occupé',       tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    wrong_number:       { label: 'Faux numéro',  tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    fraud:              { label: 'Fraude',       tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    too_short:          { label: 'Trop court',   tone: 'bg-slate-50 text-slate-500 border-slate-200' },
    connected_no_sale:  { label: 'Sans suite',   tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  return map[outcome] || null;
}

export function CallRecords({ gigId, leadId, callValidationFilter = 'all', transactionValidationFilter = 'all' }: CallRecordsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);

  const fetchCallRecords = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      if (!agentId) throw new Error('Agent ID not found');

      const response = await api.calls.getByAgentId(agentId);

      if (response && response.success && Array.isArray(response.data)) {
        setCallRecords(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch call records');
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call records');
      setLoading(false);
    }
  };

  const handleAnalyzeCall = async (callId: string) => {
    try {
      setAnalyzingCallId(callId);
      const response = await api.calls.analyze(callId);
      if (response.success) {
        if (selectedCall && (selectedCall._id === callId || (selectedCall as any).$oid === callId)) {
          // The analyzer returns different shapes depending on the path:
          //   • auto-refused: { validByAI:false, callOutcome, data: <full updated call> }
          //   • scored:       { validByAI, data: <scores>, transcript }
          // We merge both shapes so the modal reflects the new lifecycle.
          const isFullDoc =
            response.data && typeof response.data === 'object' && '_id' in response.data;
          const patch: Partial<CallRecord> = isFullDoc
            ? (response.data as Partial<CallRecord>)
            : {
                ai_call_score: response.data,
                transcript: response.transcript || selectedCall.transcript,
                validByAI: response.validByAI,
                valid: response.validByAI,
                argumentation_score: response.data?.Argumentation?.score,
                ai_call_status: 'scored',
                callOutcome: response.callOutcome ?? selectedCall.callOutcome ?? null,
              };
          setSelectedCall({ ...selectedCall, ...patch });
        }
        fetchCallRecords();
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
    } finally {
      setAnalyzingCallId(null);
    }
  };



  useEffect(() => {
    fetchCallRecords();
  }, [gigId, leadId]);


  const openCallDetails = (call: CallRecord, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  };

  const filteredRecords = callRecords.filter(record => {
    if (leadId && record.lead?._id !== leadId) return false;
    if (gigId) {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object'
        ? (recordGig?._id || (recordGig as any)?.$oid)
        : recordGig;
      if (idStr !== gigId) return false;
    }

    // Call Validation Filter
    if (callValidationFilter === 'approved' && record.validByAI !== true) return false;
    // "Pending" = analyzer hasn't reached a verdict yet. Uses the new
    // ai_call_status field when available, falls back to the legacy
    // `validByAI == null` heuristic for older calls.
    if (callValidationFilter === 'pending' && !isAnalysisPending(record)) return false;

    // Transaction Validation Filter
    if (transactionValidationFilter === 'approved' && record.transaction?.validByReps !== true) return false;
    if (transactionValidationFilter === 'refused' && record.transaction?.validByReps !== false) return false;
    if (transactionValidationFilter === 'pending' && record.transaction?.validByReps != null) return false;

    return true;
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('calls.recordsTitle')}</h2>
        <button
          onClick={fetchCallRecords}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('calls.refresh')}</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse pb-6 border-b border-slate-50 last:border-none last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded-md w-36"></div>
                    <div className="flex gap-2">
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-md w-28 mt-1"></div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center p-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{t('calls.noCalls')}</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              {t('calls.noCallsDetail')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredRecords.map((record: CallRecord) => {
              const callId = typeof record._id === 'object' ? (record._id as any).$oid : record._id;
              return (
                <div
                  key={callId}
                  className="p-6 hover:bg-slate-50/50 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${record.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2 flex-wrap">
                          <span>
                            {record.lead?.First_Name ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim() :
                              record.lead?.name || record.to || record.from || 'Unknown Customer'}
                          </span>
                          {record.validByAI === true && (
                            <span
                              title="Appel validé par l'IA — commission RepTransaction créée"
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0"
                            >
                              <BadgeCheck className="w-3 h-3" />
                            </span>
                          )}
                          {(() => {
                            const badge = callOutcomeBadge(record.callOutcome);
                            if (!badge) return null;
                            return (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${badge.tone}`}
                                title={`Issue de l'appel : ${badge.label}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                          {record.flags?.fraud === true && record.callOutcome !== 'fraud' && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border bg-rose-100 text-rose-800 border-rose-300"
                              title="Score Fraud detection < 50"
                            >
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Fraude
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                            {record.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${record.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {record.direction}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                            Durée: {Math.floor((record.duration || 0) / 60)}m {(record.duration || 0) % 60}s
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400/90 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span>{new Date(record.startTime || record.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span>ID: {typeof record._id === 'object' ? (record._id as any).$oid : record._id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      {record.ai_call_score?.overall?.score !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-xs font-black">{record.ai_call_score.overall.score}%</span>
                        </div>
                      )}

                      {(() => {
                        const status = record.status?.toLowerCase() || '';
                        const isCompleted = status === 'completed';
                        // Calls that never reached a human (no-answer / busy / canceled / failed)
                        // are auto-refused server-side, so `validByAI` is already false.
                        // We still render the badge in that case so the rep sees WHY there's
                        // no commission, instead of a silent "-".
                        const isUnansweredStatus = ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(status);
                        const showValidationSection = isCompleted || record.validByAI != null || isUnansweredStatus;
                        return showValidationSection;
                      })() ? (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          {/* Validation de l'Appel AI */}
                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Appel</span>
                            {record.validByAI === true || record.valid === true ? (
                              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-36 whitespace-nowrap">
                                <Check className="w-3.5 h-3.5" />
                                Validé par AI (+{(record.repCallCommission !== undefined ? record.repCallCommission : (record.lead?.gigId?.commission?.commission_per_call || record.lead?.gigId?.rewardPerCall || 4) * 0.7).toFixed(2)}€)
                              </span>
                            ) : record.validByAI === false ? (
                              (() => {
                                const status = record.status?.toLowerCase() || '';
                                const isUnansweredStatus = ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(status);
                                const label = isUnansweredStatus
                                  ? (status === 'busy' ? 'Occupé' : status === 'no-answer' || status === 'noanswer' ? 'Non décroché' : status === 'failed' ? 'Échec' : 'Annulé')
                                  : 'Refusé AI';
                                return (
                                  <span
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap"
                                    title={record.ai_refusal_reason || label}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {label}
                                  </span>
                                );
                              })()
                            ) : record.ai_call_status === 'error' ? (
                              <span
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap"
                                title="L'analyse a échoué — réessayez depuis l'aperçu"
                              >
                                <X className="w-3.5 h-3.5" />
                                Erreur analyse
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-200/40 shadow-sm w-32 whitespace-nowrap"
                                title={
                                  record.ai_call_status === 'processing'
                                    ? "L'IA scanne l'enregistrement…"
                                    : "Analyse à venir"
                                }
                              >
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                Analyse en cours
                              </span>
                            )}
                          </div>

                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>

                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Transaction</span>
                            {record.transaction?.validByReps === true ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-sm w-36 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Signé (+{(record.repTransactionCommission !== undefined ? record.repTransactionCommission : (record.transaction?.repTransactionCommission !== undefined ? record.transaction.repTransactionCommission : (record.lead?.gigId?.commission?.transactionCommission || record.lead?.gigId?.rewardPerSale || 30) * 0.7)).toFixed(2)}€)
                                </span>
                              </div>
                            ) : (record.validByAI === null || record.validByAI === undefined) ? (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            ) : record.transaction?.validByAI === true ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-200/40 shadow-sm w-44 whitespace-nowrap text-center cursor-help" title="Analyse IA positive, en attente de validation finale par l'entreprise">
                                  <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                  Wait for Company Validation
                                </span>
                                {record.argumentation_score !== undefined && (
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Score: {record.argumentation_score}%</span>
                                )}
                              </div>
                            ) : record.transaction?.validByAI === false ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé AI
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => openCallDetails(record, 'insights')}
                          className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                          title="View Details"
                        >
                          <Brain className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detail View */}
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedCall(null)}></div>

          <div className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
              <div className="flex flex-col">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
                  {selectedCall.lead?.First_Name ? `${selectedCall.lead.First_Name} ${selectedCall.lead.Last_Name || ''}`.trim() : 'Call Details'}
                </h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">
                  {new Date(selectedCall.startTime || selectedCall.createdAt).toLocaleString()} • {selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}m ${selectedCall.duration % 60}s` : '0s'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                    Call ID: {typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id}
                  </span>
                </div>
              </div>

              <div className="flex-1 max-w-sm">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <PremiumAudioPlayer url={finalUrl} />;
                })()}
              </div>

              <div className="flex items-center gap-2">

                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('calls.transcript')}
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <ActivityIcon className="w-4 h-4" />
                  {t('calls.aiInsights')}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Appel">
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appel</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${selectedCall.validByAI === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    selectedCall.validByAI === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`} title={selectedCall.validByAI === true ? 'Validé par AI' : selectedCall.validByAI === false ? 'Refusé AI' : 'En cours'}>
                    {selectedCall.validByAI === true ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        +{((selectedCall.lead?.gigId?.commission?.commission_per_call || selectedCall.lead?.gigId?.rewardPerCall || 4) * 0.7).toFixed(2)}€
                      </div>
                    ) : selectedCall.validByAI === false ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3 animate-pulse" />
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Transaction">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</span>
                  </div>
                  {(selectedCall.validByAI === null || selectedCall.validByAI === undefined) ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm" title="En attente">
                      <Clock className="w-3 h-3" />
                    </span>
                  ) : selectedCall.transaction?.validByAI === true ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm" title="Wait for Company Validation">
                      <Clock className="w-3 h-3 animate-pulse" />
                    </span>
                  ) : selectedCall.transaction?.validByAI === false ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm" title="Refusé AI">
                      <X className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm" title="Aucune vente">
                      <Clock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Validation Finale">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${selectedCall.transaction?.validByReps === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    selectedCall.transaction?.validByReps === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`} title={selectedCall.transaction?.validByReps === true ? 'Vente déclarée' : selectedCall.transaction?.validByReps === false ? 'Pas de vente' : 'En attente'}>
                    {selectedCall.transaction?.validByReps === true ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        +{(selectedCall.transaction?.repTransactionCommission !== undefined ? selectedCall.transaction.repTransactionCommission : (selectedCall.lead?.gigId?.commission?.transactionCommission || selectedCall.lead?.gigId?.rewardPerSale || 30) * 0.7).toFixed(2)}€
                      </div>
                    ) : selectedCall.transaction?.validByReps === false ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar">
              {activeTab === 'transcript' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((t, i) => (
                      <div key={i} className={`flex gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex flex-col max-w-[75%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                            <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                          </div>
                          <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${t.speaker?.toLowerCase().includes('agent')
                            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                            : 'bg-gradient-harx text-white rounded-tr-none shadow-lg shadow-harx-500/20'
                            }`}>
                            {t.text}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available</p>
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={analyzingCallId === selectedCall._id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-8 pb-4">
                  {/* Disposition + schedule cards — shown for EVERY call so reps
                      see the AI's verdict even when the rich rubric below is
                      unavailable (voicemail, no-answer, busy, fraud, …). */}
                  <OutcomeInsightCard
                    record={selectedCall}
                    pending={isAnalysisPending(selectedCall)}
                    error={selectedCall.ai_call_status === 'error'}
                    onAnalyze={() => handleAnalyzeCall(selectedCall._id)}
                    analyzing={analyzingCallId === selectedCall._id}
                  />
                  <CallScheduleCard record={selectedCall} />

                  {(!selectedCall.ai_call_score || !selectedCall.ai_call_score.overall?.score) ? (
                    // Legacy calls without any rubric → keep an inline analyze CTA
                    // for the ones that COULD still be scored (completed with audio).
                    selectedCall.recording_url_cloudinary && (
                      <div className="py-6 text-center flex flex-col items-center justify-center gap-3 border border-dashed border-slate-200 rounded-3xl bg-white/70">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                          Analyse détaillée non encore générée
                        </p>
                        <button
                          onClick={() => handleAnalyzeCall(selectedCall._id)}
                          disabled={analyzingCallId === selectedCall._id}
                          className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Brain className={`w-4 h-4 ${analyzingCallId === selectedCall._id ? 'animate-spin' : ''}`} />
                          {analyzingCallId === selectedCall._id ? 'Analyse...' : 'Lancer l\'analyse IA'}
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Executive Summary Section - Now at the Top */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white rounded-[40px] border border-emerald-100/50 shadow-2xl shadow-emerald-500/5 p-10 overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>

                          <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                  <Star className="w-8 h-8" />
                                </div>
                                <div>
                                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{t('calls.executiveSummary')}</h4>
                                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1 opacity-80">Audit Global de Performance</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 bg-slate-50/80 px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Score Global</p>
                                  <div className="text-4xl font-black text-slate-900 leading-none">
                                    {selectedCall.ai_call_score?.overall?.score || 0}<span className="text-xl text-slate-400">%</span>
                                  </div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                  <TrendingUp className={`w-6 h-6 ${(selectedCall.ai_call_score?.overall?.score || 0) >= 70 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[32px] p-8 border border-slate-100 shadow-inner">
                              <p className="text-xl font-bold text-slate-800 leading-relaxed italic relative">
                                <span className="absolute -left-4 -top-4 text-emerald-200 text-6xl font-serif opacity-50">&quot;</span>
                                {/* Prefer the persisted ai_summary; fall back to the rubric's overall feedback. */}
                                {selectedCall.ai_summary ||
                                  selectedCall.ai_call_score?.overall?.feedback ||
                                  'Analyse en cours...'}
                                <span className="text-emerald-200 text-6xl font-serif opacity-50 ml-1 leading-none align-bottom">&quot;</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Metrics Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4">
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('calls.detailedAnalysis')}</h5>
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { label: 'Agent Fluency', key: "Agent fluency", icon: Globe, color: 'emerald' },
                            { label: 'Sentiment Analysis', key: "Sentiment analysis", icon: ActivityIcon, color: 'blue' },
                            { label: 'Fraud Detection', key: "Fraud detection", icon: ShieldAlert, color: 'rose' },
                            { label: 'Script Coherence', key: "Script coherence", icon: ShieldCheck, color: 'indigo' },
                            { label: 'Argumentation Quality', key: "Argumentation", icon: TrendingUp, color: 'amber' },
                            { label: 'Script Adherence', key: "Script adherence", icon: BookOpen, color: 'violet' },
                            { label: 'Transaction Analysis', key: "Transaction analysis", icon: TrendingUp, color: 'emerald' }
                          ].map((metric, mIdx) => {
                            const metricData = selectedCall.ai_call_score?.[metric.key];
                            if (!metricData && metric.key === "Script adherence") return null;
                            const score = metricData?.score || 0;
                            const scoreColorClass = score >= 80 ? 'text-emerald-600 bg-emerald-50' :
                              score >= 50 ? 'text-amber-600 bg-amber-50' :
                                'text-rose-600 bg-rose-50';

                            return (
                              <div key={mIdx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500 flex flex-col h-full group">
                                <div className="flex justify-between items-start mb-8">
                                  <div className={`w-14 h-14 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                                    <metric.icon className="w-7 h-7" />
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <div className={`px-4 py-2 rounded-2xl text-xl font-black shadow-sm border border-transparent ${scoreColorClass}`}>
                                      {score}%
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Score de qualité</p>
                                  </div>
                                </div>

                                <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <span className={`w-1.5 h-4 bg-${metric.color}-500 rounded-full`}></span>
                                  {metric.label}
                                </h5>

                                <div className="flex-1">
                                  <div className="text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-2xl p-5 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all">
                                    {metricData?.feedback?.split('"').map((part, i) =>
                                      i % 2 === 1 ? (
                                        <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b-2 border-amber-200 italic">&quot;{part}&quot;</span>
                                      ) : part
                                    ) || 'Analyse détaillée indisponible.'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
              >
                {t('calls.closeDetails')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  AI Insights — supporting components
// ────────────────────────────────────────────────────────────────────────────

/** Color palette used by OutcomeInsightCard. Centralised so each tone keeps
 *  border / icon / accent in sync without sprinkling Tailwind utilities. */
const OUTCOME_PALETTE: Record<
  OutcomeDetail['color'],
  { gradient: string; border: string; icon: string; accent: string }
> = {
  emerald: {
    gradient: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-100/50',
    icon: 'bg-emerald-50 text-emerald-600',
    accent: 'text-emerald-600',
  },
  violet: {
    gradient: 'from-violet-400 to-fuchsia-500',
    border: 'border-violet-100/50',
    icon: 'bg-violet-50 text-violet-600',
    accent: 'text-violet-600',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    border: 'border-amber-100/50',
    icon: 'bg-amber-50 text-amber-600',
    accent: 'text-amber-600',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-500',
    border: 'border-rose-100/50',
    icon: 'bg-rose-50 text-rose-600',
    accent: 'text-rose-600',
  },
  red: {
    gradient: 'from-red-500 to-rose-600',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-700',
    accent: 'text-red-700',
  },
  slate: {
    gradient: 'from-slate-400 to-slate-600',
    border: 'border-slate-200/60',
    icon: 'bg-slate-100 text-slate-600',
    accent: 'text-slate-600',
  },
  blue: {
    gradient: 'from-blue-400 to-sky-500',
    border: 'border-blue-100/50',
    icon: 'bg-blue-50 text-blue-600',
    accent: 'text-blue-600',
  },
};

/**
 * Contextual "Disposition" card shown at the top of the AI Insights tab.
 *
 * Renders the persisted `callOutcome` with a human-readable explanation and
 * suggested next-best-actions. For pending/error analyses it shows a clear
 * lifecycle state instead of a vague spinner.
 */
function OutcomeInsightCard({
  record,
  pending,
  error,
  onAnalyze,
  analyzing,
}: {
  record: CallRecord;
  pending: boolean;
  error: boolean;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  // Lifecycle takes priority over the outcome itself.
  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-rose-50/40 p-8 shadow-lg shadow-rose-100/30">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-rose-700 uppercase tracking-widest">
              Analyse échouée
            </h4>
            <p className="mt-1 text-sm font-medium text-rose-700/80">
              L'IA n'a pas pu noter cet appel. Vous pouvez relancer l'analyse.
            </p>
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyse…' : 'Relancer l\'analyse'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-[32px] border border-amber-200 bg-amber-50/40 p-8 shadow-lg shadow-amber-100/30">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-amber-700 uppercase tracking-widest">
              Analyse en cours
            </h4>
            <p className="mt-1 text-sm font-medium text-amber-700/80">
              L'IA scanne l'enregistrement. Les insights s'affichent automatiquement
              dès que le scoring est terminé.
            </p>
            {record.recording_url_cloudinary && (
              <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                <Brain className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analyse…' : 'Forcer l\'analyse maintenant'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const detail = resolveOutcomeDetail(record);
  const palette = OUTCOME_PALETTE[detail.color];
  const Icon = detail.icon;
  // Refusal reason is more informative than the generic label when present.
  const subtitle =
    record.ai_refusal_reason && detail.color !== 'emerald' ? record.ai_refusal_reason : null;

  return (
    <div className={`relative rounded-[32px] border ${palette.border} bg-white p-8 shadow-xl shadow-slate-200/20 overflow-hidden`}>
      {/* Gradient blob */}
      <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br ${palette.gradient} opacity-10 blur-3xl`} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div className="flex items-start gap-5">
          <div className={`w-14 h-14 rounded-2xl ${palette.icon} flex items-center justify-center shrink-0 shadow-sm`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Issue de l'appel
            </p>
            <h4 className={`mt-1 text-2xl font-black uppercase tracking-widest ${palette.accent}`}>
              {detail.label}
            </h4>
            {record.callOutcomeSource && (
              <span className="mt-1 inline-block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                source : {record.callOutcomeSource === 'ai' ? 'IA' : record.callOutcomeSource === 'rep' ? 'rep' : 'système'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-slate-50/60 rounded-2xl p-5 border border-slate-100 mb-5">
        <p className="text-sm font-medium text-slate-700 leading-relaxed">{detail.reason}</p>
        {subtitle && (
          <p className="mt-2 text-[12px] font-bold text-slate-500 italic">
            Détail : {subtitle}
          </p>
        )}
        {record.ai_summary && (
          <p className="mt-3 text-[13px] font-medium text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
            {record.ai_summary}
          </p>
        )}
      </div>

      {/* Flags grid — only show when meaningful so the card stays compact. */}
      {(record.flags?.fraud || record.flags?.transactionDetected || record.flags?.refusalDetected) && (
        <div className="relative z-10 flex flex-wrap gap-2 mb-5">
          {record.flags?.fraud && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
              <ShieldAlert className="w-3 h-3" /> Fraude
            </span>
          )}
          {record.flags?.transactionDetected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
              <BadgeCheck className="w-3 h-3" /> Transaction détectée
            </span>
          )}
          {record.flags?.refusalDetected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 border border-rose-200">
              <Ban className="w-3 h-3" /> Refus exprimé
            </span>
          )}
        </div>
      )}

      <div className="relative z-10">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
          Prochaines actions
        </p>
        <ul className="space-y-2">
          {detail.nextActions.map((action, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] font-medium text-slate-600">
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${palette.accent}`} />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Surfaces `callbackAt` / `appointmentAt` when the analyzer extracted them.
 * Hidden when neither is set so non-scheduling calls keep the modal short.
 */
function CallScheduleCard({ record }: { record: CallRecord }) {
  const cb = record.callbackAt ? new Date(record.callbackAt) : null;
  const ap = record.appointmentAt ? new Date(record.appointmentAt) : null;
  if (!cb && !ap) return null;

  const fmt = (d: Date) =>
    d.toLocaleString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">
          Planning
        </h5>
      </div>
      <ul className="space-y-2">
        {cb && (
          <li className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="flex items-center gap-2 text-[12px] font-bold text-amber-700">
              <Repeat className="w-3.5 h-3.5" />
              Rappel programmé
            </span>
            <span className="text-[12px] font-black text-slate-800 tabular-nums">{fmt(cb)}</span>
          </li>
        )}
        {ap && (
          <li className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-violet-50/60 border border-violet-100">
            <span className="flex items-center gap-2 text-[12px] font-bold text-violet-700">
              <CalendarIcon className="w-3.5 h-3.5" />
              Rendez-vous
            </span>
            <span className="text-[12px] font-black text-slate-800 tabular-nums">{fmt(ap)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
