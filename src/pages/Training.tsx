import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  Briefcase,
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { useRepTrainingNav } from '../contexts/RepTrainingNavContext';

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

/** Aligné sur GET /training_journeys/rep/:repId/slide-progress-summary */
type RepSlideProgressSummary = {
  trainingCount: number;
  journeys: {
    journeyId: string;
    journeyTitle: string;
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

type TrainingSectionCard = {
  title: string;
  preview: string;
  globalIndex: number;
  slideId: string;
  content: string;
  bullets: string[];
};

type TrainingQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type TrainingModuleCard = {
  moduleId: string;
  title: string;
  color: string;
  sections: TrainingSectionCard[];
  quizzes: TrainingQuizQuestion[];
};

function extractRepDeckHtml(journey: JourneyRow | null): string {
  if (!journey) return '';
  const row = journey as Record<string, unknown>;
  const methodologyData =
    row.methodologyData && typeof row.methodologyData === 'object'
      ? (row.methodologyData as Record<string, unknown>)
      : null;
  const htmlCandidates = [
    methodologyData?.repInteractivePresentationHtml,
    methodologyData?.repFormationDeckHtml,
    row.repInteractivePresentationHtml,
    row.repFormationDeckHtml
  ];
  for (const item of htmlCandidates) {
    const html = String(item || '').trim();
    if (html) return html;
  }
  return '';
}

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

function isMongoObjectId(raw: string): boolean {
  return /^[a-f\d]{24}$/i.test(String(raw || '').trim());
}

function cleanPreview(raw: unknown): string {
  return String(raw || '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[*_`#>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildJourneyModuleCards(journey: JourneyRow): TrainingModuleCard[] {
  const modules = extractModules(journey);
  const slides = extractSlides(journey);
  if (modules.length <= 0 && slides.length <= 0) return [];

  const palette = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f97316', '#ef4444', '#a855f7'];
  const moduleCount = Math.max(1, modules.length || 1);
  const base = Math.floor(slides.length / moduleCount);
  let remainder = slides.length % moduleCount;
  let cursor = 0;
  const cards: TrainingModuleCard[] = [];

  for (let i = 0; i < moduleCount; i++) {
    const module = modules[i];
    const take = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const chunk = slides.slice(cursor, cursor + take);
    const moduleIdRaw = String(module?._id || module?.id || '').trim();
    const moduleId = isMongoObjectId(moduleIdRaw) ? moduleIdRaw : '';
    const moduleSections = Array.isArray(module?.sections) ? module.sections : [];
    const sections: TrainingSectionCard[] =
      moduleSections.length > 0
        ? moduleSections.map((rawSection, idx) => {
            const section =
              typeof rawSection === 'object' && rawSection !== null
                ? (rawSection as Record<string, unknown>)
                : {};
            const title =
              String(
                section.title ||
                  section.name ||
                  (typeof rawSection === 'string' ? rawSection : '') ||
                  `Section ${idx + 1}`
              ).trim() || `Section ${idx + 1}`;
            const content = String(section.content || section.description || '').trim();
            const bullets = Array.isArray(section.bullets)
              ? section.bullets.map((b) => String(b || '').trim()).filter(Boolean)
              : [];
            return {
              title,
              preview: cleanPreview(content || bullets[0] || ''),
              globalIndex: cursor + idx,
              slideId: '',
              content,
              bullets
            };
          })
        : chunk.map((slide, idx) => {
            const title = String(slide.title || `Section ${idx + 1}`).trim();
            const content = String(slide.content || slide.subtitle || '').trim();
            const bullets = Array.isArray(slide.bullets)
              ? slide.bullets.map((b) => String(b || '').trim()).filter(Boolean)
              : [];
            return {
              title,
              preview: cleanPreview(content),
              globalIndex: cursor + idx,
              slideId: slideStableId(slide),
              content,
              bullets
            };
          });
    const quizzesRaw = Array.isArray(module?.quizzes) ? module.quizzes : [];
    const quizzes: TrainingQuizQuestion[] = [];
    quizzesRaw.forEach((rawQuiz) => {
      const quiz =
        typeof rawQuiz === 'object' && rawQuiz !== null ? (rawQuiz as Record<string, unknown>) : {};
      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
      questions.forEach((rawQuestion) => {
        const q =
          typeof rawQuestion === 'object' && rawQuestion !== null
            ? (rawQuestion as Record<string, unknown>)
            : {};
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o || '').trim()).filter(Boolean)
          : [];
        const question = String(q.question || q.title || '').trim();
        const correctAnswer = Number.isFinite(Number(q.correctAnswer))
          ? Math.max(0, Math.floor(Number(q.correctAnswer)))
          : 0;
        if (question && options.length > 0) {
          quizzes.push({ question, options, correctAnswer });
        }
      });
    });

    cards.push({
      moduleId,
      title: String(module?.title || `Module ${i + 1}`),
      color: palette[i % palette.length],
      sections,
      quizzes
    });
    cursor += take;
  }
  return cards;
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
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [quizAnswersByModule, setQuizAnswersByModule] = useState<Record<number, Record<number, number>>>({});
  const [quizPassedByModule, setQuizPassedByModule] = useState<Record<number, boolean>>({});
  const [quizFeedbackByModule, setQuizFeedbackByModule] = useState<Record<number, string>>({});
  const [progressByJourney, setProgressByJourney] = useState<Record<string, RepProgressRow>>({});
  const [slideProgressSummary, setSlideProgressSummary] = useState<RepSlideProgressSummary | null>(null);

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
  const selectedJourneyModules = useMemo(
    () => (selectedJourney ? buildJourneyModuleCards(selectedJourney) : []),
    [selectedJourney]
  );
  const slideSummaryByJourney = useMemo(() => {
    const map = new Map<string, RepSlideProgressSummary['journeys'][number]>();
    const rows = Array.isArray(slideProgressSummary?.journeys) ? slideProgressSummary.journeys : [];
    rows.forEach((row) => {
      const id = String(row.journeyId || '').trim();
      if (id) map.set(id, row);
    });
    return map;
  }, [slideProgressSummary]);

  const isJourneyCompleted = useCallback(
    (journey: JourneyRow): boolean => {
      const id = journeyKey(journey);
      if (!id) return false;

      const slideRow = slideSummaryByJourney.get(id);
      if (slideRow) {
        if (slideRow.slidesTotal > 0) {
          return slideRow.slidesSeen >= slideRow.slidesTotal || slideRow.ratio >= 1;
        }
        return slideRow.ratio >= 1;
      }

      const progressRow = progressByJourney[id];
      if (!progressRow) return false;
      const finished = Number(progressRow.moduleFinished || 0);
      const total = Number(progressRow.moduleTotal || 0);
      return total > 0 && finished >= total;
    },
    [slideSummaryByJourney, progressByJourney]
  );

  const selectedJourneyGigId = useMemo(() => {
    if (!selectedJourney) return '';
    const fromJourney = String(selectedJourney.__gigId || '').trim();
    if (fromJourney) return fromJourney;
    if (gigFilter !== '__all__') return gigFilter;
    return '';
  }, [selectedJourney, gigFilter]);

  const nextIncompleteJourneyForGig = useMemo(() => {
    if (!selectedJourney) return null;
    if (!selectedJourneyGigId) return null;
    const currentId = journeyKey(selectedJourney);
    return (
      displayJourneys.find((j) => {
        const id = journeyKey(j);
        if (!id || id === currentId) return false;
        if (String(j.__gigId || '').trim() !== selectedJourneyGigId) return false;
        return !isJourneyCompleted(j);
      }) || null
    );
  }, [selectedJourney, selectedJourneyGigId, displayJourneys, isJourneyCompleted]);

  const isModuleUnlocked = useCallback(
    (moduleIndex: number) => {
      if (moduleIndex <= 0) return true;
      return !!quizPassedByModule[moduleIndex - 1];
    },
    [quizPassedByModule]
  );

  useEffect(() => {
    return () => {
      clearTrainingNav();
    };
  }, [clearTrainingNav]);

  useEffect(() => {
    if (!selectedJourneyId) {
      setSelectedModuleIndex(null);
      setSelectedSectionIndex(null);
      setQuizAnswersByModule({});
      setQuizPassedByModule({});
      setQuizFeedbackByModule({});
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
    }
    const activeModuleIndex =
      modules.length > 0 && slides.length > 0
        ? Math.min(
            modules.length - 1,
            Math.max(0, Math.floor((activeSlide / Math.max(slides.length - 1, 1)) * modules.length))
          )
        : 0;
    setTrainingNav({
      trainingModules: modules,
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

  const fetchSlideProgressSummary = useCallback(async () => {
    if (!repId) return;
    const base = trainingApiBase();
    if (!base) return;
    try {
      const r = await axios.get<{ success?: boolean; data?: RepSlideProgressSummary }>(
        `${base}/training_journeys/rep/${encodeURIComponent(repId)}/slide-progress-summary`,
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

  const persistJourneyProgressFromQuiz = useCallback(
    async (journey: JourneyRow, nextQuizPassed: Record<number, boolean>, currentModuleIndex: number) => {
      const jid = journeyKey(journey);
      if (!jid) return;
      const modules = buildJourneyModuleCards(journey);
      const totalModules = Math.max(1, modules.length);
      const passedCount = modules.reduce((acc, _m, idx) => (nextQuizPassed[idx] ? acc + 1 : acc), 0);
      const pct = Math.min(100, Math.round((passedCount / totalModules) * 100));
      const currentModule = modules[currentModuleIndex];
      const status: 'not_started' | 'in_progress' | 'completed' =
        pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
      await pushProgress(jid, currentModule?.moduleId || '', pct, status);
      await fetchSlideProgressSummary();
    },
    [pushProgress, fetchSlideProgressSummary]
  );

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
            const slidesTotal =
              slideRow && slideRow.slidesTotal > 0 ? slideRow.slidesTotal : slides.length;
            let slidesSeen = slideRow?.slidesSeen ?? 0;
            if (!slideRow && slidesTotal > 0 && engagementPercent > 0) {
              slidesSeen = Math.min(
                slidesTotal,
                Math.round((engagementPercent / 100) * slidesTotal)
              );
            }
            const slidePercent =
              slidesTotal > 0 ? Math.min(100, Math.round((slidesSeen / slidesTotal) * 100)) : 0;
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
                      <span className="tabular-nums">{slidesTotal > 0 ? `${slidePercent}%` : '—'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-harx-500 transition-[width]"
                        style={{ width: `${slidesTotal > 0 ? slidePercent : 0}%` }}
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
                      setSelectedModuleIndex(null);
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
            <div className="flex h-full min-h-0 flex-col bg-[#060b1d]">
              <div className="flex items-center gap-3 border-b border-harx-100 bg-white px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJourneyId(null);
                    setSelectedModuleIndex(null);
                    void fetchSlideProgressSummary();
                  }}
                  className="rounded-xl border border-harx-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-harx-600 hover:bg-harx-50"
                >
                  Back to list
                </button>
                <h3 className="truncate text-sm font-black text-harx-700">{journeyTitle(selectedJourney)}</h3>
              </div>
              <div className="relative flex-1 overflow-y-auto bg-gradient-to-br from-[#0a1638] via-[#111a3e] to-[#1f1747] p-4 md:p-5">
                {(() => {
                  const repDeckHtml = extractRepDeckHtml(selectedJourney);
                  if (repDeckHtml) {
                    return (
                      <div className="h-full min-h-[640px] overflow-hidden rounded-2xl border border-white/20 bg-[#060b1d] shadow-2xl">
                        <iframe
                          title={`${journeyTitle(selectedJourney)} interactive deck`}
                          srcDoc={repDeckHtml}
                          className="h-full w-full border-0"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                        />
                      </div>
                    );
                  }
                  if (selectedJourneyModules.length === 0) {
                    return <p className="text-sm text-gray-200">No modules available for this training.</p>;
                  }
                  const modules = selectedJourneyModules;
                  const currentModuleIndex = selectedModuleIndex == null ? 0 : selectedModuleIndex;
                  const currentModule = modules[currentModuleIndex] || null;
                  const currentSection =
                    currentModule && selectedSectionIndex != null
                      ? currentModule.sections[selectedSectionIndex] || null
                      : null;
                  const moduleUnlocked =
                    selectedModuleIndex == null ? true : isModuleUnlocked(selectedModuleIndex);
                  const showModuleGrid = selectedModuleIndex == null;
                  const showSectionGrid = selectedModuleIndex != null && selectedSectionIndex == null;
                  const showSectionDetail = selectedModuleIndex != null && selectedSectionIndex != null;
                  const moduleQuizAnswers = quizAnswersByModule[currentModuleIndex] || {};
                  const moduleQuizPassed = !!quizPassedByModule[currentModuleIndex];
                  const canOpenNextModule =
                    selectedModuleIndex != null &&
                    moduleQuizPassed &&
                    selectedModuleIndex < modules.length - 1;
                  const moduleQuizCount = currentModule?.quizzes.length || 0;

                  const submitModuleQuiz = async () => {
                    if (!currentModule) return;
                    if (!moduleUnlocked) return;
                    if (moduleQuizCount <= 0) {
                      setQuizPassedByModule((prev) => ({ ...prev, [currentModuleIndex]: true }));
                      setQuizFeedbackByModule((prev) => ({
                        ...prev,
                        [currentModuleIndex]: 'Module valide (pas de quiz).'
                      }));
                      await persistJourneyProgressFromQuiz(
                        selectedJourney,
                        { ...quizPassedByModule, [currentModuleIndex]: true },
                        currentModuleIndex
                      );
                      return;
                    }
                    let correct = 0;
                    currentModule.quizzes.forEach((q, idx) => {
                      if (moduleQuizAnswers[idx] === q.correctAnswer) correct += 1;
                    });
                    const score = Math.round((correct / Math.max(1, moduleQuizCount)) * 100);
                    const passed = score >= 70;
                    const nextPassed = { ...quizPassedByModule, [currentModuleIndex]: passed };
                    setQuizPassedByModule(nextPassed);
                    setQuizFeedbackByModule((prev) => ({
                      ...prev,
                      [currentModuleIndex]: passed
                        ? `Quiz valide (${score}%).`
                        : `Quiz non valide (${score}%). Minimum 70% requis.`
                    }));
                    await persistJourneyProgressFromQuiz(selectedJourney, nextPassed, currentModuleIndex);
                  };

                  return (
                    <>
                      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-white backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/80">HARX Training</p>
                            <p className="truncate text-sm font-bold">{journeyTitle(selectedJourney)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedModuleIndex != null && (
                              <button
                                type="button"
                                onClick={() => setSelectedModuleIndex(null)}
                                className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-100"
                              >
                                Modules
                              </button>
                            )}
                            {selectedModuleIndex != null && (
                              <button
                                type="button"
                                onClick={() => setSelectedSectionIndex(null)}
                                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                              >
                                Sections
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {showModuleGrid && (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {modules.map((module, idx) => (
                            <button
                              key={`${module.title}-${idx}`}
                              type="button"
                              onClick={() => {
                                if (!isModuleUnlocked(idx)) return;
                                setSelectedModuleIndex(idx);
                                setSelectedSectionIndex(null);
                              }}
                              disabled={!isModuleUnlocked(idx)}
                              className="group rounded-2xl border border-white/15 bg-white/10 p-4 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Module {idx + 1}</p>
                              <h4 className="mt-1 line-clamp-2 text-base font-extrabold">{module.title}</h4>
                              <p className="mt-2 text-xs text-white/80">{module.sections.length} sections</p>
                              {!isModuleUnlocked(idx) && (
                                <p className="mt-2 text-[11px] font-semibold text-amber-200">
                                  Valide le quiz du module precedent pour debloquer.
                                </p>
                              )}
                              <div className="mt-3 h-1.5 rounded-full bg-white/10">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{ width: '100%', backgroundColor: module.color }}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {showSectionGrid && currentModule && (
                        <div className="space-y-4">
                          {!moduleUnlocked && (
                            <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
                              Ce module est verrouille. Valide le quiz du module precedent.
                            </div>
                          )}
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {currentModule.sections.map((section, idx) => (
                              <button
                                key={`${section.title}-${section.globalIndex}`}
                                type="button"
                                onClick={() => {
                                  if (!moduleUnlocked) return;
                                  setSelectedSectionIndex(idx);
                                  setActiveSlide(Math.max(0, section.globalIndex));
                                }}
                                disabled={!moduleUnlocked}
                                className="rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: currentModule.color }}>
                                  Section {idx + 1}
                                </p>
                                <h5 className="mt-1 line-clamp-2 text-sm font-black">{section.title}</h5>
                                {section.preview ? (
                                  <p className="mt-2 line-clamp-3 text-xs text-white/75">{section.preview}</p>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {showSectionDetail && currentModule && currentSection && (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: currentModule.color }}>
                              {currentModule.title}
                            </p>
                            <h4 className="mt-2 text-2xl font-black">{currentSection.title}</h4>
                            {currentSection.content ? (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{currentSection.content}</p>
                            ) : null}
                            {currentSection.bullets.length > 0 && (
                              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/90">
                                {currentSection.bullets.map((b, i) => (
                                  <li key={`${b}-${i}`}>{b}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 p-5 text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100">
                              Quiz module
                            </p>
                            {moduleQuizCount <= 0 ? (
                              <p className="mt-2 text-sm text-white/90">Aucun quiz configure pour ce module.</p>
                            ) : (
                              <div className="mt-3 space-y-4">
                                {currentModule.quizzes.map((q, qIdx) => (
                                  <div key={`${q.question}-${qIdx}`} className="rounded-xl border border-white/20 bg-black/10 p-3">
                                    <p className="text-sm font-bold text-white">{qIdx + 1}. {q.question}</p>
                                    <div className="mt-2 grid gap-2">
                                      {q.options.map((opt, oIdx) => (
                                        <button
                                          key={`${opt}-${oIdx}`}
                                          type="button"
                                          onClick={() =>
                                            setQuizAnswersByModule((prev) => ({
                                              ...prev,
                                              [currentModuleIndex]: {
                                                ...(prev[currentModuleIndex] || {}),
                                                [qIdx]: oIdx
                                              }
                                            }))
                                          }
                                          className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                                            moduleQuizAnswers[qIdx] === oIdx
                                              ? 'border-cyan-300 bg-cyan-400/20 text-cyan-50'
                                              : 'border-white/20 bg-white/5 text-white/90 hover:bg-white/10'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void submitModuleQuiz()}
                                className="rounded-xl bg-harx-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-harx-700"
                              >
                                Valider quiz
                              </button>
                              {canOpenNextModule && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedModuleIndex((prev) => (prev == null ? 0 : prev + 1));
                                    setSelectedSectionIndex(null);
                                  }}
                                  className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-100"
                                >
                                  Module suivant
                                </button>
                              )}
                            </div>
                            {quizFeedbackByModule[currentModuleIndex] && (
                              <p className="mt-3 text-xs font-semibold text-white/90">
                                {quizFeedbackByModule[currentModuleIndex]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {Object.values(quizPassedByModule).filter(Boolean).length >= modules.length &&
                        modules.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-harx-100 bg-white p-4 shadow-sm">
                          <div className="text-sm font-black uppercase tracking-widest text-harx-600">Felicitations</div>
                          <p className="mt-1 text-sm text-gray-700">
                            Vous avez termine cette formation. Vous pouvez passer au Session Planning.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const q = selectedJourneyGigId
                                  ? `?gigId=${encodeURIComponent(selectedJourneyGigId)}`
                                  : '';
                                window.location.href = `/repdashboard/session-planning${q}`;
                              }}
                              className="inline-flex items-center justify-center rounded-xl bg-harx-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-harx-700"
                            >
                              Aller a Session Planning
                            </button>
                            {nextIncompleteJourneyForGig && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetId = journeyKey(nextIncompleteJourneyForGig);
                                  if (!targetId) return;
                                  const nextSlideRow = slideSummaryByJourney.get(targetId);
                                  const nextProgress = progressByJourney[targetId];
                                  const engagementPercent = Math.min(
                                    100,
                                    Math.max(0, Number(nextProgress?.engagementScore || 0))
                                  );
                                  const targetSlides = extractSlides(nextIncompleteJourneyForGig);
                                  setSelectedJourneyId(targetId);
                                  setSelectedModuleIndex(null);
                                  setSelectedSectionIndex(null);
                                  setActiveSlide(
                                    initialSlideForContinue(targetSlides.length, nextSlideRow, engagementPercent)
                                  );
                                }}
                                className="inline-flex items-center justify-center rounded-xl border border-harx-200 bg-harx-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-harx-700 transition-colors hover:bg-harx-100"
                              >
                                Continuer les autres trainings
                              </button>
                            )}
                          </div>
                        </div>
                      )}
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
