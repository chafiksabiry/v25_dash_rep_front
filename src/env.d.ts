/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_QIANKUN: string;
    readonly VITE_MATCHING_API_URL: string;
    readonly VITE_REP_API_URL: string;
    readonly VITE_BACKEND_URL_GIGS: string;
    readonly VITE_DASH_COMPANY_BACKEND: string;
    readonly VITE_COPILOT_URL: string;
    readonly VITE_BACKEND_KNOWLEDGEBASE_API: string;
    readonly VITE_DASHBOARD_KNOWLEDGEBASE_API_URL: string;
    /** Base URL of v25_platform_training_backend (no trailing slash), e.g. https://xxx.up.railway.app */
    readonly VITE_TRAINING_API_URL?: string;
    /** Alias used by GigDetails.tsx — same as VITE_TRAINING_API_URL (backend root, no trailing slash) */
    readonly VITE_TRAINING_BACKEND_URL?: string;
    /** Optional: trainee UI base path for deep links (no trailing slash), e.g. https://host/training/repdashboard */
    readonly VITE_TRAINING_WEB_BASE_URL?: string;
    readonly NODE_ENV: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }