import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, ExternalLink, Briefcase, Loader2, AlertCircle } from 'lucide-react';
import { getAgentId } from '../utils/authUtils';

function trainingApiBase(): string {
  return String(import.meta.env.VITE_TRAINING_API_URL || '').replace(/\/$/, '');
}

function openTrainingJourney(journeyId: string) {
  const base = String(import.meta.env.VITE_TRAINING_WEB_BASE_URL || '').replace(/\/$/, '');
  const url = base
    ? `${base}/${journeyId}`
    : `${window.location.origin.replace(/\/$/, '')}/training/repdashboard/${journeyId}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function journeyTitle(j: Record<string, unknown>): string {
  return String(j.title || j.name || 'Formation').trim();
}

function gigLabel(j: Record<string, unknown>): string | null {
  const g = j.gigId;
  if (g == null) return null;
  if (typeof g === 'object' && g !== null && 'title' in g) {
    return String((g as { title?: string }).title || '').trim() || null;
  }
  const s = String(g);
  return s.length > 8 ? `${s.slice(0, 8)}…` : s;
}

export function Training() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const repId = getAgentId();
    const base = trainingApiBase();
    if (!repId) {
      setError('Profil REP introuvable (connectez-vous à nouveau).');
      setLoading(false);
      return;
    }
    if (!base) {
      setError(
        'Variable VITE_TRAINING_API_URL manquante (URL du backend training, ex. https://…/ sans slash final).'
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await axios.get<unknown[]>(
          `${base}/training_journeys/rep/${encodeURIComponent(repId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        const data = res.data;
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setJourneys(list as Record<string, unknown>[]);
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) && e.response?.data && typeof e.response.data === 'object'
            ? String((e.response.data as { error?: string; message?: string }).error ||
                (e.response.data as { message?: string }).message || '')
            : e instanceof Error
              ? e.message
              : '';
        if (!cancelled) {
          setError(msg || 'Impossible de charger les formations pour vos gigs.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Training</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Formations auxquelles vous êtes inscrit pour vos gigs (parcours lancés par l’entreprise).
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-harx-500/10 border border-harx-500/20 px-4 py-2 text-harx-700">
          <BookOpen className="w-5 h-5 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest">Gig enrollments</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin text-harx-500" />
          <span className="font-medium">Chargement des formations…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && journeys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center text-gray-500">
          <p className="font-medium">Aucune formation assignée pour le moment.</p>
          <p className="text-sm mt-2">
            Lorsqu’une entreprise vous inscrit à un parcours pour un gig, il apparaîtra ici.
          </p>
        </div>
      )}

      {!loading && !error && journeys.length > 0 && (
        <ul className="space-y-4">
          {journeys.map((j) => {
            const id = String(j._id || j.id || '');
            const gig = gigLabel(j);
            const status = String(j.status || '—');
            return (
              <li
                key={id || journeyTitle(j)}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-black text-gray-900 truncate">{journeyTitle(j)}</h2>
                  {j.description ? (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{String(j.description)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                      {status}
                    </span>
                    {gig ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-harx-500/10 text-harx-700 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Gig {gig}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!id}
                  onClick={() => openTrainingJourney(id)}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40"
                >
                  Ouvrir
                  <ExternalLink className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
