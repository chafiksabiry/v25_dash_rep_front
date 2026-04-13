import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  Briefcase,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';

type JourneyRow = Record<string, unknown> & { __gigTitle?: string; __gigId?: string };
type ModuleRow = { _id?: string; id?: string; title?: string; sections?: unknown[] };
type SlideRow = { title?: string; subtitle?: string; content?: string; bullets?: string[] };
type RepProgressRow = {
  journeyId?: string;
  moduleTotal?: number;
  moduleFinished?: number;
  moduleInProgress?: number;
  engagementScore?: number;
  lastAccessed?: string;
};

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
  return String(j.title || j.name || 'Training').trim();
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

function extractModules(j: JourneyRow): ModuleRow[] {
  const raw = (j.modules || []) as unknown[];
  return Array.isArray(raw) ? (raw as ModuleRow[]) : [];
}

function extractSlides(j: JourneyRow): SlideRow[] {
  const p = (j.presentation || {}) as Record<string, unknown>;
  const slides = p.slides;
  if (!Array.isArray(slides)) return [];
  return slides as SlideRow[];
}

function safeHex(raw: unknown, fallback: string): string {
  const s = String(raw || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : fallback;
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

function dedupeAndSort(rows: JourneyRow[]): JourneyRow[] {
  const m = new Map<string, JourneyRow>();
  for (const j of rows) {
    const k = journeyKey(j);
    if (k && !m.has(k)) m.set(k, j);
  }
  return Array.from(m.values()).sort((a, b) => journeyTitle(a).localeCompare(journeyTitle(b), 'en'));
}

function getOrCreateTrainingSessionId(): string {
  try {
    let s = sessionStorage.getItem('harx_rep_training_session');
    if (!s) {
      s =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `ts-${Date.now()}`;
      sessionStorage.setItem('harx_rep_training_session', s);
    }
    return s;
  } catch {
    return `ts-${Date.now()}`;
  }
}

function slideProgressPayload(journey: JourneyRow, slideIndex: number) {
  const slides = extractSlides(journey);
  const modules = extractModules(journey);
  const n = slides.length;
  if (n <= 0) return null;
  const clamped = Math.min(Math.max(0, slideIndex), n - 1);
  const mIdx =
    modules.length > 0
      ? Math.min(modules.length - 1, Math.floor((clamped / Math.max(n - 1, 1)) * modules.length))
      : 0;
  const moduleId = String(modules[mIdx]?._id || modules[mIdx]?.id || `module-${mIdx + 1}`);
  const pct = Math.min(100, Math.round(((clamped + 1) / n) * 100));
  return { moduleId, pct, slideIndex: clamped, slideCount: n };
}

/** Matching API may return Mongo extended JSON `{ $oid }` instead of a plain string. */
function normalizeMongoId(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    return String((raw as { $oid: string }).$oid || '').trim();
  }
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return normalizeMongoId((raw as { _id: unknown })._id);
  }
  return String(raw).trim();
}

async function fetchEnrolledGigsForAgent(
  agentId: string,
  token: string
): Promise<{ gigId: string; title: string }[]> {
  const base = String(import.meta.env.VITE_MATCHING_API_URL || '').replace(/\/$/, '');
  if (!base) return [];

  console.log('[Training] fetchEnrolledGigsForAgent:start', { agentId, base });
  const res = await fetch(
    `${base}/gig-agents/agents/${encodeURIComponent(agentId)}/gigs?status=enrolled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    console.warn('[Training] fetchEnrolledGigsForAgent:non-ok', {
      status: res.status,
      statusText: res.statusText
    });
    return [];
  }
  const data = (await res.json()) as { gigs?: unknown[] };
  const gigs = Array.isArray(data.gigs) ? data.gigs : [];
  const out: { gigId: string; title: string }[] = [];
  for (const item of gigs) {
    const g = item as { gig?: { _id?: unknown; title?: string } };
    const gigId = normalizeMongoId(g.gig?._id);
    if (gigId) {
      out.push({
        gigId,
        title: String(g.gig?.title || 'Gig').trim() || 'Gig',
      });
    }
  }
  console.log('[Training] fetchEnrolledGigsForAgent:done', {
    count: out.length,
    gigs: out.map((g) => ({ gigId: g.gigId, title: g.title }))
  });
  return out;
}

export function Training() {
  const repId = getAgentId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<{ gigId: string; title: string }[]>([]);
  const [gigFilter, setGigFilter] = useState<string>('__all__');
  /** Trainings returned by GET /training_journeys/gig/:id when a single gig is selected */
  const [gigFetchedJourneys, setGigFetchedJourneys] = useState<JourneyRow[]>([]);
  const [gigFetchLoading, setGigFetchLoading] = useState(false);
  /** Last completed per-gig fetch so empty-state copy matches reality (200 + [] vs 404 vs network). */
  const [gigFetchOutcome, setGigFetchOutcome] = useState<{
    gigId: string;
    kind: 'ok' | 'not_found' | 'error';
  } | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [progressByJourney, setProgressByJourney] = useState<Record<string, RepProgressRow>>({});

  const displayJourneys = useMemo(() => {
    if (gigFilter === '__all__') return journeys;
    const fromGlobal = journeys.filter((j) => String(j.__gigId || '') === gigFilter);
    return dedupeAndSort([...gigFetchedJourneys, ...fromGlobal]);
  }, [journeys, gigFilter, gigFetchedJourneys]);

  const listLoading = loading || (gigFilter !== '__all__' && gigFetchLoading);

  useEffect(() => {
    const base = trainingApiBase();
    const token = getAuthToken() || '';

    if (!repId) {
      setError('Rep profile not found. Please sign in again.');
      setLoading(false);
      return;
    }
    if (!base) {
      setError(
        'Missing VITE_TRAINING_API_URL or VITE_TRAINING_BACKEND_URL (training API base URL, no trailing slash).'
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

        try {
          const repRes = await axios.get<unknown[]>(
            `${base}/training_journeys/rep/${encodeURIComponent(repId)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
          );
          const repList = Array.isArray(repRes.data) ? repRes.data : [];
          repList.forEach((j) => mergeJourney(byId, j as Record<string, unknown>));
        } catch {
          /* optional */
        }

        if (token && enrolled.length > 0) {
          await Promise.all(
            enrolled.map(async ({ gigId, title }) => {
              try {
                console.log('[Training] fetchByGig:start', { gigId, title });
                const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
                  `${base}/training_journeys/gig/${encodeURIComponent(gigId)}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
                  }
                );
                console.log('[Training] fetchByGig:response', {
                  gigId,
                  status: r.status,
                  count: Array.isArray(r.data?.data) ? r.data.data.length : 0
                });
                if (r.status === 404) return;
                const arr = Array.isArray(r.data?.data) ? r.data.data : [];
                arr.forEach((j) =>
                  mergeJourney(byId, j as Record<string, unknown>, title, gigId)
                );
              } catch {
                console.warn('[Training] fetchByGig:error', { gigId });
              }
            })
          );
        }

        const merged = Array.from(byId.values()).sort((a, b) =>
          journeyTitle(a).localeCompare(journeyTitle(b), 'en')
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
          setError(msg || 'Could not load trainings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // When user picks a gig, refetch trainings for that gig so the list updates even if the initial bulk load failed
  useEffect(() => {
    if (gigFilter === '__all__') {
      setGigFetchedJourneys([]);
      setGigFetchLoading(false);
      setGigFetchOutcome(null);
      return;
    }

    const base = trainingApiBase();
    const token = getAuthToken() || '';
    if (!base || !token) {
      setGigFetchedJourneys([]);
      setGigFetchOutcome({ gigId: gigFilter, kind: 'error' });
      return;
    }

    const gigTitle =
      enrolledGigs.find((g) => g.gigId === gigFilter)?.title || 'Gig';
    let cancelled = false;
    setGigFetchLoading(true);
    setGigFetchOutcome(null);

    (async () => {
      try {
        console.log('[Training] refetchSelectedGig:start', { gigFilter });
        const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
          `${base}/training_journeys/gig/${encodeURIComponent(gigFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
          }
        );
        console.log('[Training] refetchSelectedGig:response', {
          gigFilter,
          status: r.status,
          count: Array.isArray(r.data?.data) ? r.data.data.length : 0
        });
        if (cancelled) return;
        if (r.status === 404) {
          setGigFetchedJourneys([]);
          setGigFetchOutcome({ gigId: gigFilter, kind: 'not_found' });
          return;
        }
        const arr = Array.isArray(r.data?.data) ? r.data.data : [];
        const rows: JourneyRow[] = arr.map((raw) => {
          const j = raw as Record<string, unknown>;
          return {
            ...j,
            __gigId: gigFilter,
            __gigTitle: gigTitle,
          };
        });
        setGigFetchedJourneys(rows);
        setGigFetchOutcome({ gigId: gigFilter, kind: 'ok' });
      } catch {
        if (!cancelled) {
          console.warn('[Training] refetchSelectedGig:error', { gigFilter });
          setGigFetchedJourneys([]);
          setGigFetchOutcome({ gigId: gigFilter, kind: 'error' });
        }
      } finally {
        if (!cancelled) setGigFetchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gigFilter, enrolledGigs]);

  const selectedGigTitle =
    gigFilter === '__all__'
      ? null
      : enrolledGigs.find((g) => g.gigId === gigFilter)?.title || null;

  const selectedJourney = useMemo(
    () => displayJourneys.find((j) => journeyKey(j) === selectedJourneyId) || null,
    [displayJourneys, selectedJourneyId]
  );

  useEffect(() => {
    const modules = selectedJourney
      ? extractModules(selectedJourney).map((m, i) => {
          const sections = Array.isArray(m.sections)
            ? m.sections
                .map((s, si) => {
                  if (typeof s === 'string') return s;
                  if (typeof s === 'object' && s !== null && 'title' in (s as Record<string, unknown>)) {
                    return String((s as { title?: unknown }).title || `Section ${si + 1}`);
                  }
                  return `Section ${si + 1}`;
                })
                .filter(Boolean)
            : [];
          return {
            title: String(m.title || `Module ${i + 1}`),
            sections,
            slides: [] as { title: string; globalIndex: number }[]
          };
        })
      : [];
    if (selectedJourney && modules.length > 0) {
      const slideTitles = extractSlides(selectedJourney).map((s, idx) =>
        String(s.title || `Slide ${idx + 1}`)
      );
      const totalSlides = slideTitles.length;
      const totalModules = modules.length;
      const base = totalModules > 0 ? Math.floor(totalSlides / totalModules) : 0;
      let remainder = totalModules > 0 ? totalSlides % totalModules : 0;
      let cursor = 0;
      for (let i = 0; i < modules.length; i++) {
        const take = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        const chunk = slideTitles.slice(cursor, cursor + take);
        modules[i].slides = chunk.map((title, j) => ({
          title,
          globalIndex: cursor + j
        }));
        cursor += take;
      }
    }
    const slides = selectedJourney ? extractSlides(selectedJourney) : [];
    const activeModuleIndex =
      modules.length > 0 && slides.length > 0
        ? Math.min(
            modules.length - 1,
            Math.max(0, Math.floor((activeSlide / Math.max(slides.length - 1, 1)) * modules.length))
          )
        : 0;
    localStorage.setItem('repTrainingSidebarModules', JSON.stringify(modules));
    localStorage.setItem('repTrainingSidebarActiveModuleIndex', String(activeModuleIndex));
    localStorage.setItem('repTrainingSidebarActiveSlideIndex', String(activeSlide));
    window.dispatchEvent(new CustomEvent('rep-training-modules-updated'));
  }, [selectedJourney, activeSlide]);

  useEffect(() => {
    const onGotoSlide = (ev: Event) => {
      const e = ev as CustomEvent<{ index?: number }>;
      const idx = e.detail?.index;
      if (typeof idx !== 'number' || idx < 0 || !selectedJourney) return;
      const n = extractSlides(selectedJourney).length;
      if (n === 0) return;
      setActiveSlide(Math.min(Math.max(0, idx), n - 1));
    };
    window.addEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
    return () => window.removeEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
  }, [selectedJourney]);

  useEffect(() => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    axios
      .get<{ success?: boolean; data?: RepProgressRow[] }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/trainings-progress`
      )
      .then((r) => {
        const rows = Array.isArray(r.data?.data) ? r.data.data : [];
        const map: Record<string, RepProgressRow> = {};
        rows.forEach((row) => {
          const key = String(row.journeyId || '').trim();
          if (key) map[key] = row;
        });
        setProgressByJourney(map);
      })
      .catch(() => undefined);
  }, [repId]);

  const pushProgress = useCallback(
    async (
      journeyId: string,
      moduleId: string,
      progress: number,
      status: 'not_started' | 'in_progress' | 'completed'
    ) => {
      if (!repId) return;
      const base = trainingApiBase();
      if (!base) return;
      try {
        const r = await axios.post<{ success?: boolean; data?: RepProgressRow }>(
          `${base}/training_journeys/rep-progress`,
          {
            repId,
            journeyId,
            moduleId,
            progress,
            status,
            engagementScore: progress
          }
        );
        if (r.data?.data) {
          setProgressByJourney((prev) => ({ ...prev, [journeyId]: r.data.data as RepProgressRow }));
        }
      } catch (e) {
        console.warn('[Training] rep-progress save failed', e);
      }
    },
    [repId]
  );

  const postTrainingTrackingEvent = useCallback(
    async (journeyId: string, moduleId: string, slideIndex: number, slideCount: number) => {
      if (!repId) return;
      const base = trainingApiBase();
      if (!base) return;
      try {
        await axios.post(`${base}/training_journeys/tracking-events`, {
          repId,
          journeyId,
          moduleId,
          slideIndex,
          event: 'slide_view',
          sessionId: getOrCreateTrainingSessionId(),
          meta: { slideCount }
        });
      } catch (e) {
        console.warn('[Training] tracking-events save failed', e);
      }
    },
    [repId]
  );

  /** Persist slide position + append tracking row on any navigation (arrows, sidebar, Continue). */
  useEffect(() => {
    if (!selectedJourney || !repId) return;
    const jid = journeyKey(selectedJourney);
    if (!jid) return;
    const payload = slideProgressPayload(selectedJourney, activeSlide);
    if (!payload) return;

    const t = window.setTimeout(() => {
      const status: 'not_started' | 'in_progress' | 'completed' =
        payload.pct >= 100 ? 'completed' : 'in_progress';
      void pushProgress(jid, payload.moduleId, payload.pct, status);
      void postTrainingTrackingEvent(jid, payload.moduleId, payload.slideIndex, payload.slideCount);
    }, 400);

    return () => window.clearTimeout(t);
  }, [selectedJourney, activeSlide, repId, pushProgress, postTrainingTrackingEvent]);

  return (
    <div className={selectedJourney ? 'w-full h-[calc(100vh-120px)]' : 'space-y-6 w-full'}>
      {!selectedJourney && (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Training</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Trainings linked to gigs you are enrolled in, plus journeys your company assigned to you
            directly.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px] sm:items-end">
          <div className="flex items-center gap-2 rounded-xl bg-harx-500/10 border border-harx-500/20 px-4 py-2 text-harx-700 self-start sm:self-end">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">My gigs & paths</span>
          </div>
          <div className="w-full sm:w-auto">
            <label
              htmlFor="training-gig-filter"
              className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              Enrolled gig (Marketplace)
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
                    ? 'No enrolled gigs'
                    : 'All enrolled gigs'}
                </option>
                {enrolledGigs.map((g) => (
                  <option key={g.gigId} value={g.gigId}>
                    {g.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {gigFilter !== '__all__' && selectedGigTitle && !listLoading && (
              <p className="mt-2 text-xs font-semibold text-harx-700">
                Showing trainings for: <span className="text-gray-900">{selectedGigTitle}</span>
              </p>
            )}
            {enrolledGigs.length === 0 && !loading && !error && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                No enrolled gigs from the matching API — check the Marketplace or your connection.
              </p>
            )}
          </div>
        </div>
      </div>

      {listLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin text-harx-500" />
          <span className="font-medium">
            {gigFilter !== '__all__' && gigFetchLoading
              ? 'Loading trainings for this gig…'
              : 'Loading trainings…'}
          </span>
        </div>
      )}

      {!listLoading && error && (
        <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!listLoading && !error && gigFilter === '__all__' && journeys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center text-gray-500">
          <p className="font-medium">No trainings found for your enrolled gigs.</p>
          <p className="text-sm mt-2">
            Enrolling in a gig does not create a training by itself: the company must publish a
            training for that gig (status active, rehearsal, or completed). The list can stay empty
            even if the Marketplace shows “Enrolled”.
          </p>
        </div>
      )}

      {!listLoading && !error && gigFilter !== '__all__' && displayJourneys.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center text-gray-500">
          <p className="font-medium">No trainings for this gig yet.</p>
          {gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'ok' ? (
            <p className="text-sm mt-2">
              The training service responded successfully but has no published journeys for this
              gig. Your org may still be preparing content, the journey may still be in draft, or
              the journey may be linked to a different gig id than the one in the Marketplace.
              Only journeys with status active, rehearsal, or completed are shown.
            </p>
          ) : gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'not_found' ? (
            <p className="text-sm mt-2">
              The training API returned 404 for{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                GET /training_journeys/gig/:gigId
              </code>
              . Deploy the latest training backend or verify API routing and the base URL in{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">VITE_TRAINING_*</code>.
            </p>
          ) : gigFetchOutcome?.gigId === gigFilter && gigFetchOutcome.kind === 'error' ? (
            <p className="text-sm mt-2">
              Could not reach the training API for this gig (network error, CORS, or missing auth).
              Check your connection, sign in again, and confirm{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">VITE_TRAINING_*</code>{' '}
              points at the training service.
            </p>
          ) : (
            <p className="text-sm mt-2">
              Select the gig again or refresh the page. If this persists, verify the training API URL
              and that you are signed in.
            </p>
          )}
        </div>
      )}

      {!listLoading && !error && displayJourneys.length > 0 && (
        <ul className="space-y-4">
          {displayJourneys.map((j) => {
            const id = journeyKey(j);
            const gig = gigLabel(j);
            const status = String(j.status || '—');
            const modules = extractModules(j);
            const slides = extractSlides(j);
            const progress = id ? progressByJourney[id] : undefined;
            const moduleTotal = Number(progress?.moduleTotal || modules.length || 0);
            const moduleFinished = Number(progress?.moduleFinished || 0);
            const modulePercent =
              moduleTotal > 0 ? Math.min(100, Math.round((moduleFinished / moduleTotal) * 100)) : 0;
            const engagement = Number(progress?.engagementScore);
            const engagementPercent =
              Number.isFinite(engagement) ? Math.min(100, Math.round(engagement)) : 0;
            /** Slide-level progress is stored in engagementScore; module counts stay for “X/6 modules”. */
            const percent = Math.max(modulePercent, engagementPercent);
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
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span>Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-harx-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {moduleFinished}/{moduleTotal || modules.length || 0} modules completed
                      {slides.length > 0 ? ` • ${slides.length} slides` : ''}
                      {engagementPercent > 0 && slides.length > 0
                        ? ` • ${engagementPercent}% slide progress`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    type="button"
                    disabled={!id}
                    onClick={() => {
                      if (!id) return;
                      setSelectedJourneyId(id);
                      setActiveSlide(0);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-harx-600 text-white px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-harx-700 transition-colors disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}

      {!listLoading && !error && selectedJourney && (
        <div className="h-full overflow-hidden rounded-2xl border border-harx-100 bg-white shadow-sm">
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
              <div className="flex items-center gap-3 border-b border-harx-100 bg-white px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedJourneyId(null)}
                  className="rounded-xl border border-harx-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-harx-600 hover:bg-harx-50"
                >
                  Back to list
                </button>
                <h3 className="truncate text-sm font-black text-harx-700">{journeyTitle(selectedJourney)}</h3>
              </div>
              <div className="relative flex-1 p-4 md:p-5">
                {(() => {
                  const slides = extractSlides(selectedJourney);
                  if (slides.length === 0) {
                    return <p className="text-sm text-gray-500">No slides available for this training.</p>;
                  }
                  const s = slides[activeSlide] || slides[0];
                  const vc = ((s as unknown as { visualConfig?: Record<string, unknown> }).visualConfig || {}) as Record<string, unknown>;
                  const isDark = String(vc.theme || '').toLowerCase() === 'dark';
                  const bg = safeHex(vc.backgroundHex, isDark ? '#1f1b4f' : '#ffffff');
                  const fg = safeHex(vc.textHex, isDark ? '#ffffff' : '#0f172a');
                  const accent = safeHex(vc.accentHex, '#F43F5E');
                  const slideStyle: React.CSSProperties = {
                    background: String(vc.layout || '').toLowerCase() === 'gradient'
                      ? `linear-gradient(135deg, ${bg}, ${safeHex(vc.accentHex, '#6D28D9')})`
                      : bg,
                    color: fg
                  };
                  return (
                    <>
                      <div
                        className="relative h-[calc(100%-48px)] min-h-[420px] overflow-hidden rounded-3xl border p-7 shadow-xl"
                        style={{ ...slideStyle, borderColor: `${accent}55` }}
                      >
                        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ backgroundColor: `${accent}33` }} />
                        <div className="pointer-events-none absolute -left-10 bottom-[-30px] h-32 w-32 rounded-full" style={{ backgroundColor: `${accent}33` }} />
                        <h4 className="max-w-4xl text-3xl font-black leading-tight md:text-5xl" style={{ color: fg }}>
                          {String(s.title || 'Slide')}
                        </h4>
                        {s.subtitle ? (
                          <p
                            className="mt-4 inline-block rounded-2xl border px-4 py-2 text-lg font-semibold"
                            style={{ borderColor: `${fg}66`, color: accent, backgroundColor: `${fg}11` }}
                          >
                            {String(s.subtitle)}
                          </p>
                        ) : null}
                        {s.content ? (
                          <p className="mt-5 max-w-4xl text-base leading-7" style={{ color: fg }}>
                            {String(s.content)}
                          </p>
                        ) : null}
                        {Array.isArray(s.bullets) && s.bullets.length > 0 ? (
                          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm" style={{ color: fg }}>
                            {s.bullets.slice(0, 5).map((b, i) => (
                              <li key={i}>{String(b)}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSlide((p) => Math.max(0, p - 1))}
                        disabled={activeSlide === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-rose-200 bg-white p-3 text-fuchsia-600 shadow-lg disabled:opacity-40"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlide((p) => Math.min(slides.length - 1, p + 1));
                        }}
                        disabled={activeSlide >= slides.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-rose-200 bg-white p-3 text-fuchsia-600 shadow-lg disabled:opacity-40"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm">
                          {activeSlide + 1} / {slides.length}
                        </span>
                        <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-bold text-gray-600 shadow-sm">
                          {(() => {
                            const modCount = extractModules(selectedJourney).length || 1;
                            const mIdx =
                              modCount > 0
                                ? Math.min(
                                    modCount - 1,
                                    Math.floor(
                                      (activeSlide / Math.max(slides.length - 1, 1)) * modCount
                                    )
                                  )
                                : 0;
                            return `${mIdx + 1} / ${modCount}`;
                          })()}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
