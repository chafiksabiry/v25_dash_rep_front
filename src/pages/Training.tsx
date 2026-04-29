import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Briefcase,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  X
} from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { useRepTrainingNav } from '../contexts/RepTrainingNavContext';
import {
  getModuleColorStyles,
  getViewerThemeTokens,
  resolveRepViewerTheme,
} from '../utils/trainingViewerTheme';

type JourneyRow = Record<string, unknown> & { __gigTitle?: string; __gigId?: string };
type ModuleRow = { _id?: string; id?: string; title?: string; sections?: unknown[]; quizzes?: unknown[] };
type SlideRow = { title?: string; subtitle?: string; content?: string; bullets?: string[] };
type RepProgressRow = {
  journeyId?: string;
  moduleTotal?: number;
  moduleFinished?: number;
  moduleInProgress?: number;
  engagementScore?: number;
  lastAccessed?: string;
};

/** Aligné sur GET /training_journeys/rep/:repId/progress-summary */
type RepSlideProgressSummary = {
  trainingCount: number;
  journeys: {
    journeyId: string;
    journeyTitle: string;
    completedUnits?: number;
    totalUnits?: number;
    completedModules?: number;
    totalModules?: number;
    completedSections?: number;
    totalSections?: number;
    completedQuizzes?: number;
    totalQuizzes?: number;
    slidesSeen: number;
    slidesTotal: number;
    ratio: number;
    /** Index 0-based pour reprendre au « Continue » (aligné backend) */
    currentSlideIndex: number;
  }[];
  sumOfRatios: number;
  averageRatio: number;
  overallPercent: number;
  formulaHuman: string;
};

type ViewerSlide =
  | {
      key: string;
      kind: 'overview';
      modules: Array<{ title: string; moduleIndex: number; sections: Array<{ title: string; sectionIndex: number }> }>;
    }
  | { key: string; kind: 'module_intro'; moduleIndex: number; totalModules: number; mod: any }
  | { key: string; kind: 'section'; moduleIndex: number; totalModules: number; section: any; modTitle: string }
  | {
      key: string;
      kind: 'quiz_group';
      moduleIndex: number;
      totalModules: number;
      questions: Array<{ quizTitle: string; question: any; correctAnswer: number }>;
    };

function trainingApiBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    '';
  return String(raw).replace(/\/$/, '');
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

/** Id Mongo d’une slide (tracking) ; vide si absent (l’API utilisera slideIndex). */
function slideStableId(slide: unknown): string {
  if (!slide || typeof slide !== 'object') return '';
  const r = slide as Record<string, unknown>;
  const a = normalizeMongoId(r._id);
  if (a) return a;
  const b = normalizeMongoId(r.slideId);
  if (b) return b;
  const id = r.id;
  if (typeof id === 'string' && /^[a-f\d]{24}$/i.test(id.trim())) return id.trim();
  return '';
}

function clampTrainingSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  const i = Math.round(Number(index));
  if (!Number.isFinite(i)) return 0;
  return Math.min(slideCount - 1, Math.max(0, i));
}

/** Reprend la bonne slide : champ API `currentSlideIndex`, sinon repli engagement (comme le backend). */
function initialSlideForContinue(
  slideCount: number,
  slideRow:
    | { currentSlideIndex?: number; slidesSeen?: number; slidesTotal?: number }
    | undefined,
  engagementPercent: number
): number {
  if (slideCount <= 0) return 0;
  if (
    slideRow != null &&
    typeof slideRow.currentSlideIndex === 'number' &&
    Number.isFinite(slideRow.currentSlideIndex)
  ) {
    return clampTrainingSlideIndex(slideRow.currentSlideIndex, slideCount);
  }
  const eng = Math.min(100, Math.max(0, engagementPercent));
  const approx = Math.round((eng / 100) * slideCount);
  return clampTrainingSlideIndex(approx - 1, slideCount);
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
  const location = useLocation();
  const repId = getAgentId();
  const { setTrainingNav, clearTrainingNav } = useRepTrainingNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<{ gigId: string; title: string }[]>([]);
  const [gigFilter, setGigFilter] = useState<string>('__all__');
  const [routeGigApplied, setRouteGigApplied] = useState(false);
  /** Trainings returned by GET /training_journeys/gig/:id when a single gig is selected */
  const [gigFetchedJourneys, setGigFetchedJourneys] = useState<JourneyRow[]>([]);
  const [gigFetchLoading, setGigFetchLoading] = useState(false);
  /** Last completed per-gig fetch so empty-state copy matches reality (200 + [] vs 404 vs network). */
  const [gigFetchOutcome, setGigFetchOutcome] = useState<{
    gigId: string;
    kind: 'ok' | 'not_found' | 'error';
  } | null>(null);

  const routeGigId = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return String(p.get('gigId') || '').trim();
  }, [location.search]);

  useEffect(() => {
    setRouteGigApplied(false);
  }, [routeGigId]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [formationViewerSlideIndex, setFormationViewerSlideIndex] = useState(0);
  const [formationViewerQuizState, setFormationViewerQuizState] = useState<
    Record<string, { selected: number | null; revealed: boolean }>
  >({});
  const [formationViewerQuizPage, setFormationViewerQuizPage] = useState<Record<string, number>>({});
  const [progressByJourney, setProgressByJourney] = useState<Record<string, RepProgressRow>>({});
  const [slideProgressSummary, setSlideProgressSummary] = useState<RepSlideProgressSummary | null>(null);
  const [completedSectionsByJourney, setCompletedSectionsByJourney] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const progressSyncInFlightRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (routeGigApplied) return;
    if (!routeGigId) {
      setRouteGigApplied(true);
      return;
    }
    if (enrolledGigs.length <= 0) return;
    if (enrolledGigs.some((g) => g.gigId === routeGigId)) {
      setGigFilter(routeGigId);
    }
    setRouteGigApplied(true);
  }, [routeGigId, enrolledGigs, routeGigApplied]);

  const selectedJourney = useMemo(
    () => displayJourneys.find((j) => journeyKey(j) === selectedJourneyId) || null,
    [displayJourneys, selectedJourneyId]
  );
  const formationViewerSlides = useMemo((): ViewerSlide[] => {
    if (!selectedJourney) return [];
    const modules = extractModules(selectedJourney);
    if (!Array.isArray(modules) || modules.length === 0) return [];
    const totalModules = modules.length;
    const slides: ViewerSlide[] = [
      {
        key: 'overview',
        kind: 'overview',
        modules: modules.map((mod, mi) => {
          const sections = Array.isArray(mod?.sections) ? mod.sections : [];
          return {
            title: String(mod?.title || `Module ${mi + 1}`),
            moduleIndex: mi,
            sections: sections.map((sec: any, si: number) => ({
              title: String(sec?.title || `Section ${si + 1}`),
              sectionIndex: si,
            })),
          };
        }),
      },
    ];
    modules.forEach((mod, mi) => {
      slides.push({ key: `m${mi}-intro`, kind: 'module_intro', moduleIndex: mi, totalModules, mod });
      const sections = Array.isArray(mod?.sections) ? mod.sections : [];
      sections.forEach((sec: any, si: number) => {
        slides.push({
          key: `m${mi}-s${si}`,
          kind: 'section',
          moduleIndex: mi,
          totalModules,
          section: sec,
          modTitle: String(mod?.title || `Module ${mi + 1}`),
        });
      });
      const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
      const moduleQuestions: Array<{ quizTitle: string; question: any; correctAnswer: number }> = [];
      quizzes.forEach((qz: any, qi: number) => {
        const quizTitle = String(qz?.title || `Quiz ${qi + 1}`);
        const questions = Array.isArray(qz?.questions) ? qz.questions : [];
        questions.forEach((q: any) => {
          const correct = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
          moduleQuestions.push({ quizTitle, question: q, correctAnswer: correct });
        });
      });
      if (moduleQuestions.length > 0) {
        slides.push({
          key: `m${mi}-quiz`,
          kind: 'quiz_group',
          moduleIndex: mi,
          totalModules,
          questions: moduleQuestions,
        });
      }
    });
    return slides;
  }, [selectedJourney]);
  const formationViewerSlideIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    formationViewerSlides.forEach((slide, idx) => map.set(slide.key, idx));
    return map;
  }, [formationViewerSlides]);
  const jumpToFormationSlide = useCallback(
    (key: string) => {
      const idx = formationViewerSlideIndexByKey.get(key);
      if (typeof idx === 'number') setFormationViewerSlideIndex(idx);
    },
    [formationViewerSlideIndexByKey]
  );
  const currentFormationViewerSlide = formationViewerSlides[formationViewerSlideIndex];

  const repViewerTheme = useMemo(
    () => resolveRepViewerTheme(selectedJourney, selectedJourneyId || ''),
    [selectedJourney, selectedJourneyId]
  );
  const viewerThemeTokens = useMemo(() => getViewerThemeTokens(repViewerTheme), [repViewerTheme]);
  const moduleColorStyles = useMemo(() => getModuleColorStyles(repViewerTheme), [repViewerTheme]);

  useEffect(() => {
    return () => {
      clearTrainingNav();
    };
  }, [clearTrainingNav]);

  useEffect(() => {
    if (!selectedJourneyId) {
      setFormationViewerSlideIndex(0);
      setFormationViewerQuizState({});
      setFormationViewerQuizPage({});
    }
  }, [selectedJourneyId]);

  useEffect(() => {
    if (!selectedJourney) {
      clearTrainingNav();
      return;
    }
    const slides = extractSlides(selectedJourney);
    const modules = extractModules(selectedJourney).map((m, i) => {
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
        slides: [] as { title: string; globalIndex: number; slideId: string }[]
      };
    });
    if (modules.length > 0 && slides.length > 0) {
      const slideTitles = slides.map((s, idx) => String(s.title || `Slide ${idx + 1}`));
      const totalSlides = slideTitles.length;
      const totalModules = modules.length;
      const base = totalModules > 0 ? Math.floor(totalSlides / totalModules) : 0;
      let remainder = totalModules > 0 ? totalSlides % totalModules : 0;
      let cursor = 0;
      for (let i = 0; i < modules.length; i++) {
        const take = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        const chunk = slideTitles.slice(cursor, cursor + take);
        modules[i].slides = chunk.map((title, j) => {
          const gi = cursor + j;
          return {
            title,
            globalIndex: gi,
            slideId: slideStableId(slides[gi])
          };
        });
        cursor += take;
      }
    } else if (modules.length > 0) {
      // Fallback for journeys built only from modules/sections:
      // keep sidebar populated so it doesn't show "No slides".
      let cursor = 0;
      modules.forEach((m) => {
        const sectionTitles =
          Array.isArray(m.sections) && m.sections.length > 0 ? m.sections : ['Overview'];
        m.slides = sectionTitles.map((title) => {
          const globalIndex = cursor;
          cursor += 1;
          return {
            title: String(title || 'Section'),
            globalIndex,
            slideId: '',
          };
        });
      });
    }
    const activeModuleIndex =
      modules.length > 0 && slides.length > 0
        ? Math.min(
            modules.length - 1,
            Math.max(0, Math.floor((activeSlide / Math.max(slides.length - 1, 1)) * modules.length))
          )
        : 0;
    setTrainingNav({
      // Hide training module dropdowns from the sidebar:
      // keep only the top-level "Training" section visible.
      trainingModules: [],
      activeTrainingModuleIndex: activeModuleIndex,
      activeTrainingSlideIndex: Math.max(0, activeSlide)
    });
  }, [selectedJourney, activeSlide, setTrainingNav]);

  useEffect(() => {
    const onGotoSlide = (ev: Event) => {
      const e = ev as CustomEvent<{ index?: number; slideId?: string }>;
      if (!selectedJourney) return;
      const slides = extractSlides(selectedJourney);
      const n = slides.length;
      if (n === 0) return;
      let idx = e.detail?.index;
      const sid = e.detail?.slideId;
      if (typeof sid === 'string' && sid.trim()) {
        const found = slides.findIndex((s) => slideStableId(s) === sid.trim());
        if (found >= 0) idx = found;
      }
      if (typeof idx !== 'number' || idx < 0) return;
      setActiveSlide(Math.min(Math.max(0, idx), n - 1));
    };
    window.addEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
    return () => window.removeEventListener('rep-training-goto-slide', onGotoSlide as EventListener);
  }, [selectedJourney]);

  const fetchTrainingProgressRows = useCallback(async () => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    try {
      const r = await axios.get<{ success?: boolean; data?: RepProgressRow[] }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/trainings-progress`
      );
      const rows = Array.isArray(r.data?.data) ? r.data.data : [];
      const map: Record<string, RepProgressRow> = {};
      rows.forEach((row) => {
        const key = String(row.journeyId || '').trim();
        if (key) map[key] = row;
      });
      setProgressByJourney(map);
    } catch {
      /* ignore */
    }
  }, [repId]);

  useEffect(() => {
    void fetchTrainingProgressRows();
  }, [fetchTrainingProgressRows]);

  const fetchSlideProgressSummary = useCallback(async () => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    try {
      const r = await axios.get<{ success?: boolean; data?: RepSlideProgressSummary }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/progress-summary`,
        gigFilter === '__all__' ? {} : { params: { gigId: gigFilter } }
      );
      setSlideProgressSummary(r.data?.data ?? null);
    } catch {
      setSlideProgressSummary(null);
    }
  }, [repId, gigFilter]);

  useEffect(() => {
    void fetchSlideProgressSummary();
  }, [fetchSlideProgressSummary]);

  useEffect(() => {
    if (!repId || !selectedJourneyId || !selectedJourney) return;
    const slide = currentFormationViewerSlide;
    if (!slide || slide.kind !== 'section') return;

    const modules = extractModules(selectedJourney);
    const moduleRow = modules[slide.moduleIndex];
    if (!moduleRow) return;

    const moduleId =
      normalizeMongoId((moduleRow as any)?._id) ||
      normalizeMongoId((moduleRow as any)?.id) ||
      String(slide.moduleIndex);
    const sectionId =
      normalizeMongoId((slide.section as any)?._id) ||
      normalizeMongoId((slide.section as any)?.id) ||
      String((slide.section as any)?.title || '').trim() ||
      `section-${slide.moduleIndex}-${formationViewerSlideIndex}`;
    if (!moduleId || !sectionId) return;

    const alreadyDone = !!completedSectionsByJourney[selectedJourneyId]?.[moduleId]?.includes(sectionId);
    if (alreadyDone) return;

    const syncKey = `${selectedJourneyId}:${moduleId}:${sectionId}`;
    if (progressSyncInFlightRef.current.has(syncKey)) return;
    progressSyncInFlightRef.current.add(syncKey);

    const base = trainingApiBase();
    if (!base) return;

    const currentDone = completedSectionsByJourney[selectedJourneyId]?.[moduleId] || [];
    const nextDone = [...new Set([...currentDone, sectionId])];
    const sections = Array.isArray((moduleRow as any)?.sections) ? (moduleRow as any).sections : [];
    const quizzes = Array.isArray((moduleRow as any)?.quizzes) ? (moduleRow as any).quizzes : [];
    const totalSections = sections.length;
    const hasQuizzes = quizzes.length > 0;
    const progress =
      totalSections > 0 ? Math.min(100, Math.round((nextDone.length / totalSections) * 100)) : 0;
    const status: 'not_started' | 'in_progress' | 'completed' =
      progress >= 100 && !hasQuizzes ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

    setCompletedSectionsByJourney((prev) => ({
      ...prev,
      [selectedJourneyId]: {
        ...(prev[selectedJourneyId] || {}),
        [moduleId]: nextDone,
      },
    }));

    axios
      .post(`${base}/training_journeys/rep-progress`, {
        repId,
        journeyId: selectedJourneyId,
        moduleId,
        progress,
        status,
        completedSections: nextDone,
      })
      .then(async () => {
        await Promise.all([fetchTrainingProgressRows(), fetchSlideProgressSummary()]);
      })
      .catch(() => undefined)
      .finally(() => {
        progressSyncInFlightRef.current.delete(syncKey);
      });
  }, [
    repId,
    selectedJourneyId,
    selectedJourney,
    currentFormationViewerSlide,
    formationViewerSlideIndex,
    completedSectionsByJourney,
    fetchTrainingProgressRows,
    fetchSlideProgressSummary,
  ]);

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

      {!selectedJourney &&
        gigFilter !== '__all__' &&
        slideProgressSummary &&
        slideProgressSummary.trainingCount > 0 && (
          <div className="rounded-2xl border border-harx-200 bg-gradient-to-br from-harx-50/90 to-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-harx-600">
              Progression (formations du gig)
            </p>
            {selectedGigTitle ? (
              <p className="mt-1 text-xs font-semibold text-gray-600 truncate">{selectedGigTitle}</p>
            ) : null}
            <p className="mt-2 text-2xl font-black text-gray-900 tabular-nums">
              {slideProgressSummary.overallPercent} %
            </p>
          </div>
        )}

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
              All journeys linked to this gig are shown, including draft/not published.
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
            const slides = extractSlides(j);
            const progress = id ? progressByJourney[id] : undefined;
            const engagement = Number(progress?.engagementScore);
            const engagementPercent =
              Number.isFinite(engagement) ? Math.min(100, Math.round(engagement)) : 0;
            const slideRow =
              id && slideProgressSummary?.journeys
                ? slideProgressSummary.journeys.find((x) => x.journeyId === id)
                : undefined;
            const progressTotal =
              slideRow && Number(slideRow.totalUnits) > 0
                ? Number(slideRow.totalUnits)
                : slideRow && slideRow.slidesTotal > 0
                  ? slideRow.slidesTotal
                  : Number(progress?.moduleTotal) > 0
                    ? Number(progress?.moduleTotal)
                    : slides.length;
            let progressDone =
              slideRow && Number(slideRow.completedUnits) >= 0
                ? Number(slideRow.completedUnits)
                : slideRow?.slidesSeen ?? 0;
            if (!slideRow && progressTotal > 0) {
              if (Number(progress?.moduleFinished) >= 0) {
                progressDone = Math.min(progressTotal, Number(progress?.moduleFinished || 0));
              } else if (engagementPercent > 0) {
                progressDone = Math.min(
                  progressTotal,
                  Math.round((engagementPercent / 100) * progressTotal)
                );
              }
            }
            const slidePercent =
              progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;
            return (
              <li
                key={id || journeyTitle(j)}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-black text-gray-900 truncate">{journeyTitle(j)}</h2>
                  {j.description ? (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{String(j.description)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-2">
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
                      <span className="tabular-nums">{progressTotal > 0 ? `${slidePercent}%` : '—'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-harx-500 transition-[width]"
                        style={{ width: `${progressTotal > 0 ? slidePercent : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    type="button"
                    disabled={!id}
                    onClick={() => {
                      if (!id) return;
                      const slideCount = slides.length;
                      setSelectedJourneyId(id);
                      setActiveSlide(initialSlideForContinue(slideCount, slideRow, engagementPercent));
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
          <div className="flex h-full min-h-0 flex-col" style={{ background: viewerThemeTokens.shellBg }}>
            <div className="flex items-center gap-3 border-b border-harx-100 bg-white px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJourneyId(null);
                    void fetchSlideProgressSummary();
                  }}
                  className="rounded-xl border border-harx-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-harx-600 hover:bg-harx-50"
                >
                  Back to list
                </button>
                <h3 className="truncate text-sm font-black text-harx-700">{journeyTitle(selectedJourney)}</h3>
              </div>
              <div
                className="relative flex-1 overflow-y-auto p-4 md:p-5"
                style={{ background: viewerThemeTokens.contentBg }}
              >
                {(() => {
                  if (!currentFormationViewerSlide) return <p className="text-sm text-slate-300">Aucun module.</p>;
                  return (
                    <div className="mx-auto w-full max-w-5xl">
                      {currentFormationViewerSlide.kind === 'overview' ? (
                        <div
                          className="rounded-3xl border p-4 sm:p-6"
                          style={{
                            borderColor: viewerThemeTokens.accentBorder,
                            background: viewerThemeTokens.panelBg,
                            boxShadow: viewerThemeTokens.accentShadow,
                          }}
                        >
                          <div
                            className="rounded-2xl border p-4 backdrop-blur-sm sm:p-5"
                            style={{
                              borderColor: viewerThemeTokens.accentBorder,
                              background: 'linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-harx-300">
                                  HARX Training
                                </p>
                                <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                                  {journeyTitle(selectedJourney)}
                                </h3>
                              </div>
                              <span
                                className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold text-white"
                                style={{
                                  borderColor: moduleColorStyles[0].chipBorder,
                                  background: moduleColorStyles[0].chipBg,
                                }}
                              >
                                {currentFormationViewerSlide.modules.length} modules
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">
                              Choisissez un module pour afficher son contenu organise par sections.
                            </p>
                          </div>
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {currentFormationViewerSlide.modules.map((mod) => {
                              const moduleTheme =
                                moduleColorStyles[mod.moduleIndex % moduleColorStyles.length];
                              return (
                                <div
                                  key={`overview-mod-${mod.moduleIndex}`}
                                  className="rounded-2xl border p-3 shadow-[0_10px_35px_-20px_rgba(236,72,153,0.35)] transition-all duration-300 hover:-translate-y-0.5"
                                  style={{
                                    borderColor: moduleTheme.border,
                                    background: viewerThemeTokens.cardBg,
                                    boxShadow: moduleTheme.glow,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => jumpToFormationSlide(`m${mod.moduleIndex}-intro`)}
                                    className="group flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-white shadow-sm transition hover:brightness-105"
                                    style={{ background: moduleTheme.accentBg }}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/90">
                                        Module {mod.moduleIndex + 1}
                                      </span>
                                      <span className="mt-0.5 block truncate text-sm font-semibold">{mod.title}</span>
                                    </span>
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                      Ouvrir
                                    </span>
                                  </button>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                                    <span>{mod.sections.length} section(s)</span>
                                  </div>
                                  <p
                                    className="mt-2 rounded-lg border border-dashed px-2.5 py-2 text-xs text-slate-300"
                                    style={{ borderColor: moduleTheme.border, background: moduleTheme.softBg }}
                                  >
                                    Cliquez sur le module pour voir les sections.
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : currentFormationViewerSlide.kind === 'module_intro' ? (
                        (() => {
                          const mod = currentFormationViewerSlide.mod;
                          const moduleTheme =
                            moduleColorStyles[
                              currentFormationViewerSlide.moduleIndex % moduleColorStyles.length
                            ];
                          const sections = Array.isArray(mod?.sections) ? mod.sections : [];
                          const sectionCount = sections.length;
                          const desc = String(mod?.description || '').trim();
                          const showFullDescription = sectionCount === 0 && !!desc;
                          return (
                            <div
                              className="rounded-3xl border bg-[#0b1025]/90 p-5 sm:p-7"
                              style={{ borderColor: moduleTheme.border, boxShadow: moduleTheme.glow }}
                            >
                              <p
                                className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-white"
                                style={{ borderColor: moduleTheme.chipBorder, background: moduleTheme.chipBg }}
                              >
                                Module {currentFormationViewerSlide.moduleIndex + 1} /{' '}
                                {currentFormationViewerSlide.totalModules}
                              </p>
                              <h3 className="mb-3 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                                {String(mod?.title || 'Module')}
                              </h3>
                              {showFullDescription ? (
                                <div className="prose prose-sm max-w-none text-slate-200">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc}</ReactMarkdown>
                                </div>
                              ) : sectionCount > 0 ? (
                                <>
                                  <p className="text-sm leading-relaxed text-slate-300">
                                    Contenu du module par sections.
                                  </p>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {sections.map((sec: any, si: number) => {
                                      const sectionTitle = String(sec?.title || `Section ${si + 1}`).trim();
                                      const rawContent = String(sec?.content || '').trim();
                                      const preview = rawContent
                                        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                                        .replace(/[*_`#>-]/g, '')
                                        ? rawContent
                                            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                                            .replace(/[*_`#>-]/g, '')
                                            .replace(/\s+/g, ' ')
                                            .slice(0, 170)
                                            .trim()
                                        : '';
                                      return (
                                        <button
                                          key={`module-intro-sec-${currentFormationViewerSlide.moduleIndex}-${si}`}
                                          type="button"
                                          onClick={() =>
                                            jumpToFormationSlide(`m${currentFormationViewerSlide.moduleIndex}-s${si}`)
                                          }
                                          className="w-full rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5"
                                          style={{
                                            borderColor: moduleTheme.border,
                                            background: viewerThemeTokens.cardBg,
                                            boxShadow: moduleTheme.glow,
                                          }}
                                        >
                                          <div className="flex items-start gap-2">
                                            <span
                                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ring-1"
                                              style={{
                                                background: moduleTheme.chipBg,
                                                borderColor: moduleTheme.chipBorder,
                                              }}
                                            >
                                              {si + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-semibold text-white">{sectionTitle}</p>
                                              {preview ? (
                                                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                                                  {preview}
                                                  {rawContent.length > 170 ? '…' : ''}
                                                </p>
                                              ) : (
                                                <p className="mt-1 text-xs text-slate-400">
                                                  Aucun contenu texte pour cette section.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-slate-300">Pas de description pour ce module.</p>
                              )}
                            </div>
                          );
                        })()
                      ) : currentFormationViewerSlide.kind === 'section' ? (
                        (() => {
                          const cfs = currentFormationViewerSlide;
                          const moduleTheme =
                            moduleColorStyles[cfs.moduleIndex % moduleColorStyles.length];
                          const sectionMdComponents: Components = {
                            p: ({ children }) => (
                              <p className="mb-3 text-[15px] leading-7 text-slate-200 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul
                                className="mb-3 space-y-2 rounded-xl border p-3 last:mb-0"
                                style={{ borderColor: moduleTheme.border, background: moduleTheme.softBg }}
                              >
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li className="flex items-start gap-2 text-[14px] leading-6 text-slate-200">
                                <span
                                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: moduleTheme.chipBorder }}
                                />
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
                            h1: ({ children }) => (
                              <h4 className="mb-2 mt-4 text-xl font-bold text-white first:mt-0">{children}</h4>
                            ),
                            h2: ({ children }) => (
                              <h5 className="mb-2 mt-4 text-lg font-bold text-white first:mt-0">{children}</h5>
                            ),
                            h3: ({ children }) => (
                              <h6 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h6>
                            ),
                          };
                          return (
                            <div
                              className="rounded-3xl border bg-[#0b1025]/90 p-5 sm:p-7"
                              style={{
                                borderColor: moduleTheme.border,
                                boxShadow: moduleTheme.glow,
                              }}
                            >
                              <p
                                className="mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold text-white"
                                style={{
                                  borderColor: moduleTheme.chipBorder,
                                  background: moduleTheme.chipBg,
                                }}
                              >
                                {cfs.modTitle}
                              </p>
                              <h3 className="mb-3 text-lg font-bold text-white sm:text-xl">
                                {String(cfs.section?.title || 'Section')}
                              </h3>
                              {String(cfs.section?.content || '').trim() ? (
                                <div
                                  className="rounded-2xl border p-4"
                                  style={{
                                    borderColor: moduleTheme.border,
                                    background: viewerThemeTokens.cardBg,
                                    boxShadow: moduleTheme.glow,
                                  }}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={sectionMdComponents}>
                                    {String(cfs.section.content)}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300">Contenu vide.</p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const slide = currentFormationViewerSlide;
                          const totalQuestions = slide.questions.length;
                          const page = Math.min(
                            Math.max(formationViewerQuizPage[slide.key] ?? 0, 0),
                            Math.max(0, totalQuestions - 1)
                          );
                          const currentQuestion = slide.questions[page];
                          const q = currentQuestion?.question;
                          const opts = Array.isArray(q?.options) ? q.options : [];
                          const qKey = `${slide.key}-q${page}`;
                          const qState = formationViewerQuizState[qKey] || {
                            selected: null as number | null,
                            revealed: false,
                          };
                          const correctIdx =
                            typeof currentQuestion?.correctAnswer === 'number'
                              ? currentQuestion.correctAnswer
                              : 0;
                          const isCorrect =
                            qState.revealed && qState.selected !== null && qState.selected === correctIdx;
                          const isWrong =
                            qState.revealed && qState.selected !== null && qState.selected !== correctIdx;
                          return (
                            <div className="rounded-3xl border border-harx-500/30 bg-[#0b1025]/90 p-5 shadow-[0_20px_70px_-25px_rgba(236,72,153,0.4)] sm:p-7">
                              <p className="mb-2 inline-flex rounded-full border border-harx-400/40 bg-harx-500/20 px-2.5 py-1 text-xs font-semibold text-harx-100">
                                {currentQuestion?.quizTitle || `Quiz module ${slide.moduleIndex + 1}`}
                              </p>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="rounded-full border border-harx-400/35 bg-[#12172f] px-2.5 py-1 font-semibold text-harx-100">
                                  Question {page + 1} / {totalQuestions}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={page <= 0}
                                    onClick={() =>
                                      setFormationViewerQuizPage((prev) => ({
                                        ...prev,
                                        [slide.key]: Math.max(0, (prev[slide.key] ?? 0) - 1),
                                      }))
                                    }
                                    className="rounded-lg border border-harx-500/30 bg-[#12172f] px-2.5 py-1 font-semibold text-slate-200 transition hover:border-harx-400/60 disabled:opacity-40"
                                  >
                                    Précédente
                                  </button>
                                  <button
                                    type="button"
                                    disabled={page >= totalQuestions - 1}
                                    onClick={() =>
                                      setFormationViewerQuizPage((prev) => ({
                                        ...prev,
                                        [slide.key]: Math.min(
                                          totalQuestions - 1,
                                          (prev[slide.key] ?? 0) + 1
                                        ),
                                      }))
                                    }
                                    className="rounded-lg border border-harx-400/40 bg-gradient-to-r from-harx-600/85 to-harx-alt-500/85 px-2.5 py-1 font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                                  >
                                    Suivante
                                  </button>
                                </div>
                              </div>
                              <p className="mb-4 text-base font-semibold text-white sm:text-lg">
                                {String(q?.question || '')}
                              </p>
                              <div className="space-y-2" role="radiogroup" aria-label="Réponses">
                                {opts.map((op: string, oi: number) => {
                                  const selected = qState.selected === oi;
                                  const showAsCorrect = qState.revealed && oi === correctIdx;
                                  const wrongSelected =
                                    qState.revealed && qState.selected === oi && oi !== correctIdx;
                                  return (
                                    <button
                                      key={oi}
                                      type="button"
                                      disabled={qState.revealed}
                                      onClick={() => {
                                        if (qState.revealed) return;
                                        setFormationViewerQuizState((prev) => ({
                                          ...prev,
                                          [qKey]: {
                                            selected: oi,
                                            revealed: prev[qKey]?.revealed ?? false,
                                          },
                                        }));
                                      }}
                                      className={`flex w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                                        showAsCorrect
                                          ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-100'
                                          : wrongSelected
                                            ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                                            : selected && !qState.revealed
                                              ? 'border-harx-400 bg-harx-500/25 text-white'
                                              : 'border-harx-500/20 bg-[#12172f] text-slate-100 hover:border-harx-400/40'
                                      }`}
                                    >
                                      <span className="mr-2 font-mono text-xs text-slate-400">{oi + 1}.</span>
                                      <span className="flex-1">{String(op)}</span>
                                      {showAsCorrect ? (
                                        <CheckCircle className="ml-2 h-4 w-4 shrink-0 text-emerald-600" />
                                      ) : null}
                                      {wrongSelected ? <X className="ml-2 h-4 w-4 shrink-0 text-rose-600" /> : null}
                                    </button>
                                  );
                                })}
                              </div>
                              {!qState.revealed ? (
                                <button
                                  type="button"
                                  disabled={qState.selected === null}
                                  onClick={() =>
                                    setFormationViewerQuizState((prev) => ({
                                      ...prev,
                                      [qKey]: {
                                        selected: prev[qKey]?.selected ?? null,
                                        revealed: true,
                                      },
                                    }))
                                  }
                                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-harx-600 to-harx-alt-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Valider ma réponse
                                </button>
                              ) : (
                                <div className="mt-4 rounded-xl border border-harx-500/20 bg-[#12172f] px-3 py-3">
                                  <p
                                    className={`text-sm font-semibold ${
                                      isCorrect ? 'text-emerald-300' : isWrong ? 'text-rose-300' : 'text-slate-200'
                                    }`}
                                  >
                                    {isCorrect
                                      ? 'Bonne réponse !'
                                      : isWrong
                                        ? 'Ce n’était pas la bonne réponse.'
                                        : 'Réponse affichée.'}
                                  </p>
                                  {String(q?.explanation || '').trim() ? (
                                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                      {String(q.explanation)}
                                    </p>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })()}
              </div>
              {formationViewerSlides.length > 0 && (
                <div
                  className="shrink-0 border-t px-4 py-3 sm:px-6"
                  style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.panelBg }}
                >
                  <div
                    className="mb-3 h-2 w-full overflow-hidden rounded-full border"
                    style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.cardBg }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        background: viewerThemeTokens.accentBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                        width: `${((formationViewerSlideIndex + 1) / formationViewerSlides.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setFormationViewerSlideIndex((i) => Math.max(0, i - 1))}
                      disabled={formationViewerSlideIndex <= 0}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: viewerThemeTokens.accentBorder,
                        background: viewerThemeTokens.cardBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" /> Précédent
                    </button>
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium text-white"
                      style={{ borderColor: viewerThemeTokens.accentBorder, background: viewerThemeTokens.cardBg }}
                    >
                      {formationViewerSlideIndex + 1} / {formationViewerSlides.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormationViewerSlideIndex((i) =>
                          Math.min(formationViewerSlides.length - 1, i + 1)
                        )
                      }
                      disabled={formationViewerSlideIndex >= formationViewerSlides.length - 1}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: viewerThemeTokens.accentBorder,
                        background: viewerThemeTokens.accentBg,
                        boxShadow: viewerThemeTokens.accentShadow,
                      }}
                    >
                      Suivant <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
