import { useState, useEffect } from 'react';
import axios from 'axios';

interface ScriptReplica {
  phase: string;
  actor: 'agent' | 'lead';
  replica: string;
}

interface GigScript {
  _id: string | { $oid: string };
  gigId: string | { $oid: string };
  targetClient: string;
  language: string;
  details?: string;
  script: ScriptReplica[];
  isActive: boolean;
  createdAt: string | { $date: string };
}

export function useGigScript(gigId?: string) {
  const [scripts, setScripts] = useState<GigScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gigId) return;

    const fetchScripts = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        };

        // Fallback URLs for Knowledge Base Service
        let apiUrl = import.meta.env.VITE_DASHBOARD_KNOWLEDGEBASE_API_URL || 
                     'https://v25platformknowledgebasebackend-production.up.railway.app/api';
        
        // Local development fallback
        if (import.meta.env.DEV && !import.meta.env.VITE_DASHBOARD_KNOWLEDGEBASE_API_URL) {
          apiUrl = 'http://localhost:3001/api';
        }

        console.log(`[useGigScript] Fetching scripts for gig ${gigId} from ${apiUrl}`);
        
        const response = await axios.get<{ success: boolean; data: GigScript[] }>(
          `${apiUrl}/scripts/gig/${gigId}`,
          { headers }
        );

        if (response.data.success) {
          setScripts(response.data.data);
        } else {
          setError('Failed to fetch scripts');
        }
      } catch (err: any) {
        console.error('[useGigScript] Error:', err);
        setError(err.message || 'Error fetching scripts');
      } finally {
        setLoading(false);
      }
    };

    fetchScripts();
  }, [gigId]);

  const activeScript = scripts.find(s => s.isActive) || scripts[0];

  return { scripts, activeScript, loading, error };
}
