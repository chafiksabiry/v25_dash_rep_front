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
    readonly NODE_ENV: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }