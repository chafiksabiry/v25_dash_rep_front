import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BookOpen, ExternalLink, Briefcase, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';

type JourneyRow = Record<string, unknown> & { __gigTitle?: string; __gigId?: string };

function trainingApiBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    '';
  return String(raw).replace(/\/$/, '');
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

function gigLabel(j: JourneyRow): string | null {
  if (j.__gigTitle) return String(j.__gigTitle);
  const g = j.gigId;
  if (g == null) return null;
  if (typeof g === 'object' && g !== null && 'title' in g) {
    return String((g as { title?: string }).title || '').trim() || null;
  }
  const s = String(g);
  return s.length > 10 ? `${s.slice(0, 10)}…` : s;
}

function journeyKey(j: Record<string, unknown>): string {
  return String(j._id || j.id || '').trim();
}

function mergeJourney(
  map: Map<string, JourneyRow>,
  j: Record<string, unknown>,
  gigTitle?: string,
  gigId?: string
) {
  const id = journeyKey(j);
  if (!id) return;
  const prev = map.get(id);
  if (prev) {
    if (gigTitle && !prev.__gigTitle) prev.__gigTitle = gigTitle;
    if (gigId && !prev.__gigId) prev.__gigId = gigId;
    return;
  }
  const row: JourneyRow = { ...j };
  if (gigTitle) row.__gigTitle = gigTitle;
  if (gigId) row.__gigId = gigId;
  map.set(id, row);
}

async function fetchEnrolledGigsForAgent(
  agentId: string,
  token: string
): Promise<{ gigId: string; title: string }[]> {
  const base = String(import.meta.env.VITE_MATCHING_API_URL || '').replace(/\/$/, '');
  if (!base) return [];

  const res = await fetch(
    `${base}/gig-agents/agents/${encodeURIComponent(agentId)}/gigs?status=enrolled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { gigs?: unknown[] };
  const gigs = Array.isArray(data.gigs) ? data.gigs : [];
  const out: { gigId: string; title: string }[] = [];
  for (const item of gigs) {
    const g = item as { gig?: { _id?: string; title?: string } };
    if (g.gig?._id) {
      out.push({
        gigId: String(g.gig._id),
        title: String(g.gig.title || 'Gig').trim() || 'Gig',
      });
    }
  }
  return out;
}

export function Training() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<{ gigId: string; title: string }[]>([]);
  const [gigFilter, setGigFilter] = useState<string>('__all__');

  const filteredJourneys = useMemo(() => {
    if (gigFilter === '__all__') return journeys;
    return journeys.filter((j) => String(j.__gigId || '') === gigFilter);
  }, [journeys, gigFilter]);

  useEffect(() => {
    const repId = getAgentId();
    const base = trainingApiBase();
    const token = getAuthToken() || '';

    if (!repId) {
      setError('Profil REP introuvable (connectez-vous à nouveau).');
      setLoading(false);
      return;
    }
    if (!base) {
      setError(
        'Variable VITE_TRAINING_API_URL ou VITE_TRAINING_BACKEND_URL manquante (URL du backend training, sans slash final).'
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const byId = new Map<string, JourneyRow>();

        let enrolled: { gigId: string; title: string }[] = [];
        if (token) {
          enrolled = await fetchEnrolledGigsForAgent(repId, token);
          if (!cancelled) setEnrolledGigs(enrolled);
        } else if (!cancelled) {
          setEnrolledGigs([]);
        }

        // 1) Parcours où le rep est explicitement dans enrolledRepIds (lancement ciblé)
        try {
          const repRes = await axios.get<unknown[]>(
            `${base}/training_journeys/rep/${encodeURIComponent(repId)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
          );
          const repList = Array.isArray(repRes.data) ? repRes.data : [];
          repList.forEach((j) => mergeJourney(byId, j as Record<string, unknown>));
        } catch {
          /* optionnel si route absente */
        }

        // 2) Parcours publiés pour chaque gig où le rep est enrolled (matching)
        if (token && enrolled.length > 0) {
          await Promise.all(
            enrolled.map(async ({ gigId, title }) => {
              try {
                const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
                  `${base}/training_journeys/gig/${encodeURIComponent(gigId)}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
                  }
                );
                if (r.status === 404) return;
                const arr = Array.isArray(r.data?.data) ? r.data.data : [];
                arr.forEach((j) =>
                  mergeJourney(byId, j as Record<string, unknown>, title, gigId)
                );
              } catch {
                /* réseau / erreur */
              }
            })
          );
        }

        const merged = Array.from(byId.values()).sort((a, b) =>
          journeyTitle(a).localeCompare(journeyTitle(b), 'fr')
        );
        if (!cancelled) setJourneys(merged);
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) && e.response?.data && typeof e.response.data === 'object'
            ? String(
                (e.response.data as { error?: string; message?: string }).error ||
                  (e.response.data as { message?: string }).message ||
                  ''
              )
            : e instanceof Error
              ? e.message
              : '';
        if (!cancelled) {
          setError(msg || 'Impossible de charger les formations.');
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
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Training</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Formations liées à vos gigs où vous êtes inscrit, et parcours où vous avez été ajouté
            explicitement par l’entreprise.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:items-end">
          <div className="flex items-center gap-2 rounded-xl bg-harx-500/10 border border-harx-500/20 px-4 py-2 text-harx-700 self-start sm:self-end">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">Mes gigs & parcours</span>
          </div>
          <div className="w-full sm:w-auto">
            <label
              htmlFor="training-gig-filter"
              className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Gig inscrit (Marketplace)
            </label>
            <div className="relative">
              <select
                id="training-gig-filter"
                value={gigFilter}
                onChange={(e) => setGigFilter(e.target.value)}
                disabled={loading}
                className="w-full min-w-[260px] appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-800 shadow-sm transition-colors focus:border-harx-500 focus:outline-none focus:ring-2 focus:ring-harx-500/20 disabled:cursor-wait disabled:opacity-70"
              >
                <option value="__all__">
                  {enrolledGigs.length === 0 && !loading
                    ? 'Aucun gig enrolled'
                    : 'Tous les gigs inscrits'}
                </option>
                {enrolledGigs.map((g) => (
                  <option key={g.gigId} value={g.gigId}>
                    {g.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {enrolledGigs.length === 0 && !loading && !error && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                Aucun gig « Enrolled » détecté via l’API matching — vérifiez le Marketplace ou la
                connexion.
              </p>
            )}
          </div>
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
          <p className="font-medium">Aucune formation trouvée pour vos gigs inscrits.</p>
          <p className="text-sm mt-2">
            Être inscrit à un gig n’ajoute pas automatiquement un parcours : l’entreprise doit avoir
            créé un training pour ce gig (statut actif / rehearsal / completed). Sinon, la liste
            reste vide même si le Marketplace affiche « Enrolled ».
          </p>
        </div>
      )}

      {!loading && !error && journeys.length > 0 && filteredJourneys.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-6 text-amber-900 text-sm font-medium">
          Aucune formation pour le gig sélectionné. Choisissez « Tous les gigs inscrits » ou un autre
          gig, ou vérifiez que l’API training expose bien{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">/training_journeys/gig/…</code>{' '}
          (déploiement backend à jour).
        </div>
      )}

      {!loading && !error && filteredJourneys.length > 0 && (
        <ul className="space-y-4">
          {filteredJourneys.map((j) => {
            const id = journeyKey(j);
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
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-harx-500/10 text-harx-700 flex items-center gap-1 max-w-full">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="truncate">{gig}</span>
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
