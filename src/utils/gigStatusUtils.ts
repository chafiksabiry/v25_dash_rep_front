import { getAgentId, getAuthToken } from './authUtils';

// Types pour les statuts de gigs
export type GigStatus = 'enrolled' | 'invited' | 'pending' | 'none';

// Interface pour les données de statut
export interface GigStatusData {
  enrolledGigIds: string[];
  invitedGigIds: string[];
  pendingGigIds: string[];
}

// Fonction pour récupérer les demandes en attente
export const fetchPendingRequests = async (): Promise<string[]> => {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) {
    console.error('Agent ID or token not found');
    return [];
  }

  try {
    console.log('🔍 Fetching pending requests for agent:', agentId);
    
    // Essayer plusieurs endpoints
    const endpoints = [
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=pending`,
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agent/${agentId}/requests`,
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/pending/agent/${agentId}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📝 Pending requests response from ${endpoint}:`, data);
          
          let pendingGigIds: string[] = [];
          
          // Traiter différents formats de réponse
          if (data.gigs && Array.isArray(data.gigs)) {
            pendingGigIds = data.gigs
              .filter((gigRequest: any) => {
                const isPending = gigRequest.status === 'pending' || 
                                gigRequest.enrollmentStatus === 'requested' ||
                                gigRequest.agentResponse === 'pending';
                return isPending;
              })
              .map((gigRequest: any) => {
                return gigRequest.gig?._id || 
                       gigRequest.gig?.$oid || 
                       gigRequest.gigId?.$oid || 
                       gigRequest.gigId;
              })
              .filter(id => id);
          } else if (Array.isArray(data)) {
            pendingGigIds = data
              .filter((request: any) => {
                const isPending = request.status === 'pending' || 
                                request.enrollmentStatus === 'requested' ||
                                request.agentResponse === 'pending';
                return isPending;
              })
              .map((request: any) => request.gigId?.$oid || request.gigId)
              .filter(id => id);
          }
          
          if (pendingGigIds.length > 0) {
            console.log(`⏳ Found ${pendingGigIds.length} pending gig IDs from ${endpoint}:`, pendingGigIds);
            return pendingGigIds;
          }
        }
      } catch (endpointError) {
        console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    console.log('ℹ️ No pending requests found from any endpoint');
    return [];
  } catch (error) {
    console.error('❌ Error fetching pending requests:', error);
    return [];
  }
};

// Fonction pour obtenir le statut d'un gig
export const getGigStatus = (
  gigId: string, 
  statusData: GigStatusData
): GigStatus => {
  if (statusData.enrolledGigIds.includes(gigId)) {
    return 'enrolled';
  }
  
  if (statusData.invitedGigIds.includes(gigId)) {
    return 'invited';
  }
  
  if (statusData.pendingGigIds.includes(gigId)) {
    return 'pending';
  }
  
  return 'none';
};

// Fonction pour rafraîchir les statuts après une action
export const refreshGigStatuses = async (): Promise<void> => {
  // Cette fonction peut être appelée depuis n'importe quelle page
  // pour déclencher un rafraîchissement des statuts
  
  // Émettre un événement personnalisé pour notifier les composants
  const event = new CustomEvent('refreshGigStatuses');
  window.dispatchEvent(event);
};
