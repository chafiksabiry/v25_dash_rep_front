import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, Globe, Calendar, Building, MapPin, Target, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { fetchEnrolledGigsFromProfile, fetchPendingRequests, refreshGigStatuses } from '../utils/gigStatusUtils';

// Interface pour les gigs populés (même que dans GigsMarketplace)
interface PopulatedGig {
  _id: string;
  title: string;
  description: string;
  category: string;
  
  // 👤 User populé
  userId: {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    linkedInId?: string;
    isVerified: boolean;
    createdAt: Date;
    typeUser?: string;
    firstTime: boolean;
  };

  // 🏢 Company populé
  companyId: {
    _id: string;
    userId?: string;
    name: string;
    logo?: string;
    industry?: string;
    founded?: string;
    headquarters?: string;
    overview: string;
    companyIntro?: string;
    mission?: string;
    subscription: 'free' | 'standard' | 'premium';
    culture: {
      values: string[];
      benefits: string[];
      workEnvironment?: string;
    };
    opportunities: {
      roles: string[];
      growthPotential?: string;
      training?: string;
    };
    technology: {
      stack: string[];
      innovation?: string;
    };
    contact: {
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    socialMedia: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      instagram?: string;
    };
    createdAt: Date;
    updatedAt: Date;
  };

  destination_zone: {
    name: {
      common: string;
      official: string;
      nativeName?: {
        [key: string]: {
          official: string;
          common: string;
          _id: string;
        };
      };
    };
    flags: {
      png: string;
      svg: string;
      alt: string;
    };
    _id: string;
    cca2: string;
    __v: number;
    createdAt: string;
    updatedAt: string;
  };
  
  // 🎯 Activities populées
  activities: Array<{
    _id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // 🏭 Industries populées
  industries: Array<{
    _id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  seniority: {
    level: string;
    yearsExperience: string;
  };

  // 🎓 Skills populées
  skills: {
    professional: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    technical: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    soft: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    languages: Array<{
      language: {
        _id: string;
        name: string;
        iso639_1: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      proficiency: string;
      iso639_1: string;
    }>;
  };

  // ⏰ Availability avec timezone populé
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    time_zone: {
      _id: string;
      name?: string;
      offset?: string;
      abbreviation?: string;
      description?: string;
      countryCode?: string;
      countryName?: string;
      zoneName?: string;
      gmtOffset?: number;
      lastUpdated?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };

  // 💰 Commission
  commission: {
    base: string;
    baseAmount: string;
    bonus?: string;
    bonusAmount?: string;
    structure?: string;
    currency: string;
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
    transactionCommission?: {
      type: string;
      amount: string;
    };
    additionalDetails?: string;
  };

  // 🎯 Leads
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
  };

  // 👥 Team
  team: {
    size: string;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: string;
      };
    }>;
    territories: (string | {
      _id: string;
      name: {
        common: string;
        official: string;
      };
      flags: {
        png: string;
        svg: string;
      };
      cca2: string;
    })[];
  };

  // 📖 Documentation
  documentation: {
    product?: Array<{ name: string; url: string }>;
    process?: Array<{ name: string; url: string }>;
    training?: Array<{ name: string; url: string }>;
  };

  status: 'to_activate' | 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  enrolledAgents?: string[]; // Added for enrollment status
  
  // 👥 Agents enrolled/invited to this gig
  agents?: Array<{
    agentId: string;
    status: 'invited' | 'enrolled' | 'rejected' | 'requested' | 'pending';
    enrollmentDate?: string;
    invitationDate?: string;
    updatedAt?: string;
    _id: string;
  }>;
}

// Interface pour les leads
interface Lead {
  _id: string;
  userId?: string;
  companyId?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  gigId?: string;
  refreshToken?: string;
  id?: string;
  Last_Activity_Time?: Date;
  Activity_Tag?: string;
  Deal_Name?: string;
  Stage?: string;
  Email_1?: string;
  Phone?: string;
  Telephony?: string;
  Pipeline?: string;
  updatedAt: Date;
}

// Interface pour la réponse de l'API des leads
interface LeadsResponse {
  success: boolean;
  count: number;  // Number of leads in current page
  total: number;  // Total number of leads for this gig
  totalPages: number;  
  currentPage: number;  // Current page number
  data: Lead[];
}

export function GigDetails() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<PopulatedGig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const limit = 50; // Nombre de leads par page (maximum supporté par le backend)
  
  // États pour la vérification de complétion de la formation
  const [trainingCompleted, setTrainingCompleted] = useState<boolean | null>(null);
  const [checkingTraining, setCheckingTraining] = useState(false);
  const [trainingStarted, setTrainingStarted] = useState<boolean | null>(null);
  const [hasTraining, setHasTraining] = useState<boolean>(false);
  
  // État pour le score d'engagement
  const [engagementScore, setEngagementScore] = useState<number | null>(null);
  
  // États pour les trainings disponibles
  const [availableTrainings, setAvailableTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  
  // État pour la progression des trainings
  const [trainingsProgress, setTrainingsProgress] = useState<Record<string, any>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  // Fonction pour vérifier si l'agent est enrolled dans ce gig
  const isAgentEnrolled = () => {
    const agentId = getAgentId();
    if (!agentId || !gig) return false;
    
    // Vérifier si le gig a un champ agents avec le statut de l'agent
    if (gig.agents && Array.isArray(gig.agents)) {
      const agentStatus = gig.agents.find((agent: any) => agent.agentId === agentId);
      return agentStatus?.status === 'enrolled';
    }
    
    return false;
  };
  
  // Fonction pour obtenir le statut de l'agent dans ce gig
  const getAgentStatus = (): 'enrolled' | 'invited' | 'pending' | 'none' => {
    const agentId = getAgentId();
    if (!agentId || !gig) return 'none';
    
    // 1. Vérifier d'abord les données du profil (plus fiables)
    if (enrolledGigIds.includes(gigId!)) {
      console.log(`✅ Agent is ENROLLED in gig ${gigId} (from profile)`);
      return 'enrolled';
    }
    
    if (pendingGigIds.includes(gigId!)) {
      console.log(`⏳ Agent has PENDING request for gig ${gigId} (from profile)`);
      return 'pending';
    }
    
    // 2. Vérifier les données du gig (fallback)
    if (gig.agents && Array.isArray(gig.agents)) {
      const agentStatus = gig.agents.find((agent: any) => agent.agentId === agentId);
      if (agentStatus?.status === 'enrolled') {
        console.log(`✅ Agent is ENROLLED in gig ${gigId} (from gig data)`);
        return 'enrolled';
      }
      if (agentStatus?.status === 'invited') {
        console.log(`📨 Agent is INVITED to gig ${gigId} (from gig data)`);
        return 'invited';
      }
      if (agentStatus?.status === 'requested' || agentStatus?.status === 'pending') {
        console.log(`⏳ Agent has PENDING request for gig ${gigId} (from gig data)`);
        return 'pending';
      }
    }
    
    console.log(`❌ Agent has NO STATUS for gig ${gigId}`);
    return 'none';
  };

  // États pour l'application
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [applicationMessage, setApplicationMessage] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<'none' | 'requested' | 'enrolled' | 'invited'>('none');
  
  // États pour les statuts depuis le profil
  const [pendingGigIds, setPendingGigIds] = useState<string[]>([]);
  const [enrolledGigIds, setEnrolledGigIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!gigId) {
        setError('Gig ID not provided');
        setLoading(false);
        return;
      }

      // Mettre à jour le cookie gigId dès qu'on charge les détails d'un gig
      console.log('🍪 Setting gigId cookie:', gigId);
      Cookies.set('currentGigId', gigId, { expires: 7 }); // Expire dans 7 jours

      try {
        console.log('🔍 Fetching gig details for ID:', gigId);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${gigId}/details`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch gig details: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Received gig details:', data);
        
        if (data.success && data.data) {
          console.log('🔍 Gig data structure:', {
            skills: data.data.skills,
            activities: data.data.activities,
            industries: data.data.industries,
            companyId: data.data.companyId,
            fullData: data.data
          });
          setGig(data.data);
        } else if (data.data) {
          console.log('🔍 Gig data structure (no success flag):', {
            skills: data.data.skills,
            activities: data.data.activities,
            industries: data.data.industries,
            companyId: data.data.companyId,
            fullData: data.data
          });
          setGig(data.data);
        } else if (data._id) {
          // Sometimes the API returns the gig data directly without wrapping
          console.log('🔍 Direct gig data structure:', {
            skills: data.skills,
            activities: data.activities,
            industries: data.industries,
            companyId: data.companyId,
            fullData: data
          });
          setGig(data);
        } else {
          console.error('❌ Unexpected data structure:', data);
          throw new Error('Invalid response structure');
        }
      } catch (err) {
        console.error('❌ Error fetching gig details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load gig details');
      } finally {
        setLoading(false);
      }
    };

    fetchGigDetails();
  }, [gigId]);

  // Récupérer les statuts depuis le profil de l'agent
  useEffect(() => {
    const fetchStatusesFromProfile = async () => {
      try {
        console.log('🔍 Fetching statuses from agent profile...');
        const [pendingIds, enrolledIds] = await Promise.all([
          fetchPendingRequests(),
          fetchEnrolledGigsFromProfile()
        ]);
        
        console.log('📝 Profile statuses fetched:', { pendingIds, enrolledIds });
        setPendingGigIds(pendingIds);
        setEnrolledGigIds(enrolledIds);
      } catch (error) {
        console.error('❌ Error fetching statuses from profile:', error);
      }
    };

    fetchStatusesFromProfile();
  }, []);

  // Vérifier le statut d'enrollment de l'agent
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      const agentId = getAgentId();
      const token = getAuthToken();
      
      if (!agentId || !token || !gigId) {
        return;
      }

      try {
        console.log('🔍 Checking enrollment status for agent:', agentId, 'gig:', gigId);
        
        // Vérifier d'abord si l'agent est dans la liste des agents inscrits du gig
        if (gig && gig.enrolledAgents) {
          const isEnrolled = gig.enrolledAgents.some((agent: any) => 
            agent.$oid === agentId || agent === agentId
          );
          
          if (isEnrolled) {
            console.log('✅ Agent is enrolled in this gig');
            setEnrollmentStatus('enrolled');
            return;
          }
        }

        // Vérifier si l'agent est invité à ce gig
        try {
          console.log('🔍 Checking if agent is invited to this gig');
          const invitedResponse = await fetch(
            `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invited/agent/${agentId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            console.log('📧 Invited gigs data:', invitedData);
            
            // Vérifier si ce gig est dans la liste des gigs invités
            const isInvited = invitedData.some((invitation: any) => 
              invitation.gigId === gigId || invitation.gigId?._id === gigId
            );
            
            if (isInvited) {
              console.log('📨 Agent is invited to this gig');
              setEnrollmentStatus('invited');
              return;
            }
          }
        } catch (invitedErr) {
          console.log('ℹ️ Could not check invitation status:', invitedErr);
        }

        // Vérifier si l'agent a déjà fait une demande d'enrollment en regardant les gigs enrolled
        try {
          console.log('🔍 Checking if agent has pending enrollment request');
          
          // Utiliser l'endpoint des enrollments de l'agent pour vérifier le statut
          const enrolledResponse = await fetch(
            `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/enrolled/agent/${agentId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (enrolledResponse.ok) {
            const enrolledData = await enrolledResponse.json();
            console.log('📝 Enrolled gigs data:', enrolledData);
            
            // Vérifier si il y a une demande en attente pour ce gig (status pending)
            const hasPendingRequest = enrolledData.some((enrollment: any) => 
              (enrollment.gigId === gigId || enrollment.gigId?._id === gigId) && 
              enrollment.status === 'pending'
            );
            
            if (hasPendingRequest) {
              console.log('⏳ Agent has pending enrollment request for this gig');
              setEnrollmentStatus('requested');
              return;
            }

            // Vérifier aussi si l'agent est déjà accepté/enrolled
            const hasAcceptedRequest = enrolledData.some((enrollment: any) => 
              (enrollment.gigId === gigId || enrollment.gigId?._id === gigId) && 
              (enrollment.status === 'accepted' || enrollment.status === 'enrolled')
            );
            
            if (hasAcceptedRequest) {
              console.log('✅ Agent is enrolled in this gig');
              setEnrollmentStatus('enrolled');
              return;
            }
          } else {
            console.log('⚠️ Enrolled gigs check failed:', enrolledResponse.status);
          }
        } catch (enrolledErr) {
          console.log('ℹ️ Could not check enrolled gigs:', enrolledErr);
        }

        // Si aucune des vérifications n'a trouvé de statut, l'agent n'a pas de relation avec ce gig
        console.log('ℹ️ Agent has no relationship with this gig');
        setEnrollmentStatus('none');
        
      } catch (err) {
        console.error('❌ Error checking enrollment status:', err);
        setEnrollmentStatus('none');
      }
    };

    if (gig && !loading) {
      checkEnrollmentStatus();
    }
  }, [gig, gigId, loading]);

  // Fonction helper pour extraire l'ID d'un objet MongoDB (gère les formats $oid et string)
  const extractId = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) {
      if (typeof id._id === 'string') return id._id;
      if (id._id.$oid) return id._id.$oid;
    }
    return String(id);
  };

  // Fonction pour récupérer la progression des trainings pour ce gig
  const fetchTrainingsProgress = async () => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return;
    
    setLoadingProgress(true);
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      const url = `${trainingBackendUrl}/training_journeys/rep/${agentId}/progress/gig/${gigId}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Progress data received:', data);
        if (data.success && data.data && data.data.trainings) {
          // Créer un map de progression par journeyId
          const progressMap: Record<string, any> = {};
          data.data.trainings.forEach((training: any) => {
            const journeyId = extractId(training.journeyId);
            progressMap[journeyId] = training;
            console.log('📈 Mapped progress for journeyId:', journeyId, training);
          });
          console.log('📊 Progress map:', progressMap);
          setTrainingsProgress(progressMap);
        }
      } else {
        console.warn('⚠️ Could not fetch progress:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching trainings progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Fonction pour récupérer les trainings disponibles pour ce gig
  const fetchAvailableTrainings = async () => {
    if (!gigId) {
      console.log('⚠️ No gigId provided, skipping training fetch');
      return;
    }
    
    console.log('🔍 Fetching trainings for gigId:', gigId);
    setLoadingTrainings(true);
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      console.log('🌐 Training backend URL:', trainingBackendUrl);
      
      const url = `${trainingBackendUrl}/training_journeys/gig/${gigId}`;
      console.log('📡 Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('📥 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success && data.data) {
          console.log('✅ Found', data.data.length, 'trainings');
          setAvailableTrainings(data.data);
        } else {
          console.warn('⚠️ Response format issue:', { success: data.success, hasData: !!data.data });
          setAvailableTrainings([]);
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Could not fetch trainings:', response.status, errorText);
        setAvailableTrainings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching trainings:', error);
      setAvailableTrainings([]);
    } finally {
      setLoadingTrainings(false);
    }
  };

  // Charger les trainings disponibles pour ce gig
  useEffect(() => {
    if (gigId) {
      fetchAvailableTrainings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigId]);
  
  // Charger la progression des trainings quand les trainings sont chargés
  useEffect(() => {
    if (availableTrainings.length > 0 && gigId && isAgentEnrolled()) {
      fetchTrainingsProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTrainings, gigId]);

  // Fonction pour initialiser la progression avant de démarrer le training
  const initializeTrainingProgress = async (trainingId: string) => {
    const agentId = getAgentId();
    if (!agentId) {
      console.error('❌ No agentId found');
      return false;
    }
    
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      const url = `${trainingBackendUrl}/training_journeys/rep-progress/start`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repId: agentId,
          journeyId: trainingId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Training progress initialized:', data);
        return true;
      } else {
        const errorData = await response.json();
        console.warn('⚠️ Could not initialize progress:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing training progress:', error);
      return false;
    }
  };

  // Fonction pour rediriger vers le training
  const handleTrainingClick = async (trainingId: string) => {
    // Initialiser la progression avant de rediriger
    await initializeTrainingProgress(trainingId);
    
    // Rafraîchir la progression après initialisation
    setTimeout(() => {
      fetchTrainingsProgress();
    }, 500);
    const trainingUrl = `https://v25.harx.ai/training/repdashboard/${trainingId}`;
    window.open(trainingUrl, '_blank');
  };

  // Fonction pour récupérer le score d'engagement
  const getEngagementScore = async (): Promise<number | null> => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return null;
    
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      
      // Récupérer les journeys pour ce gig
      const journeysResponse = await fetch(
        `${trainingBackendUrl}/training_journeys/gig/${gigId}`
      );
      
      if (!journeysResponse.ok) {
        console.warn('⚠️ Could not fetch training journeys for score:', journeysResponse.status);
        return null;
      }
      
      const journeysData = await journeysResponse.json();
      const journeys = journeysData.success ? journeysData.data : [];
      if (!journeys || journeys.length === 0) {
        console.log('ℹ️ No training journeys found for this gig');
        return null;
      }
      
      // Récupérer le score d'engagement pour chaque journey du gig
      let maxScore = 0;
      let hasScore = false;
      
      for (const journey of journeys) {
        const journeyId = journey.id || journey._id;
        if (!journeyId) continue;
        
        // Vérifier si le rep est enrollé dans ce journey
        if (!journey.enrolledRepIds || !journey.enrolledRepIds.includes(agentId)) {
          continue;
        }
        
        // Récupérer le progrès avec le score d'engagement
        const progressResponse = await fetch(
          `${trainingBackendUrl}/training_journeys/rep-progress?repId=${agentId}&journeyId=${journeyId}`
        );
        
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          const progress = progressData.success 
            ? (Array.isArray(progressData.data) ? progressData.data[0] : progressData.data)
            : null;
          
          if (progress && progress.engagementScore !== undefined && progress.engagementScore !== null) {
            hasScore = true;
            if (progress.engagementScore > maxScore) {
              maxScore = progress.engagementScore;
            }
          }
        }
      }
      
      return hasScore ? maxScore : null;
    } catch (err) {
      console.error('❌ Error fetching engagement score:', err);
      return null;
    }
  };

  // Fonction pour vérifier si le gig a des formations et si le rep a commencé
  const checkTrainingStarted = async (): Promise<{ hasTraining: boolean; started: boolean }> => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return { hasTraining: false, started: false };
    
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      
      // Récupérer les journeys pour ce gig
      const journeysResponse = await fetch(
        `${trainingBackendUrl}/training_journeys/gig/${gigId}`
      );
      
      if (!journeysResponse.ok) {
        console.warn('⚠️ Could not fetch training journeys:', journeysResponse.status);
        return { hasTraining: false, started: false };
      }
      
      const journeysData = await journeysResponse.json();
      const journeys = journeysData.success ? journeysData.data : [];
      
      if (!journeys || journeys.length === 0) {
        // Pas de formation pour ce gig
        return { hasTraining: false, started: false };
      }
      
      // Vérifier si le rep a commencé au moins une formation
      let hasStarted = false;
      for (const journey of journeys) {
        const journeyId = journey.id || journey._id;
        if (!journeyId) continue;
        
        // Vérifier si le rep est enrollé dans ce journey
        if (!journey.enrolledRepIds || !journey.enrolledRepIds.includes(agentId)) {
          continue;
        }
        
        // Vérifier si le rep a un progrès pour ce journey
        const progressResponse = await fetch(
          `${trainingBackendUrl}/training_journeys/rep-progress?repId=${agentId}&journeyId=${journeyId}`
        );
        
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          const progress = progressData.success 
            ? (Array.isArray(progressData.data) ? progressData.data[0] : progressData.data)
            : null;
          
          if (progress && progress.id) {
            // Le rep a commencé cette formation
            hasStarted = true;
            break;
          }
        }
      }
      
      return { hasTraining: true, started: hasStarted };
    } catch (err) {
      console.error('❌ Error checking training started:', err);
      return { hasTraining: false, started: false };
    }
  };

  // Fonction pour vérifier si la formation est complétée
  const checkTrainingCompletion = async (): Promise<boolean> => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return false;
    
    setCheckingTraining(true);
    try {
      // Récupérer les training journeys pour ce gig
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://api-training.harx.ai';
      
      // Récupérer les journeys pour ce gig
      const journeysResponse = await fetch(
        `${trainingBackendUrl}/training_journeys/gig/${gigId}`
      );
      
      if (!journeysResponse.ok) {
        console.warn('⚠️ Could not fetch training journeys:', journeysResponse.status);
        // Si on ne peut pas vérifier, considérer comme non complété pour la sécurité
        return false;
      }
      
      const journeysData = await journeysResponse.json();
      const journeys = journeysData.success ? journeysData.data : [];
      if (!journeys || journeys.length === 0) {
        console.log('ℹ️ No training journeys found for this gig');
        // Si pas de formation, considérer comme complété (pas de formation = pas de prérequis)
        return true;
      }
      
      // Récupérer les journeys du rep pour vérifier le progrès
      const repJourneysResponse = await fetch(
        `${trainingBackendUrl}/training_journeys/rep/${agentId}`
      );
      
      if (!repJourneysResponse.ok) {
        console.warn('⚠️ Could not fetch rep journeys:', repJourneysResponse.status);
        return false;
      }
      
      const repJourneys = await repJourneysResponse.json();
      const repJourneyIds = repJourneys.map((j: any) => j.id || j._id).filter(Boolean);
      
      // Vérifier la complétion pour chaque journey du gig
      for (const journey of journeys) {
        const journeyId = journey.id || journey._id;
        if (!journeyId) continue;
        
        // Vérifier si le rep est enrollé dans ce journey
        if (!journey.enrolledRepIds || !journey.enrolledRepIds.includes(agentId)) {
          console.log(`ℹ️ Rep not enrolled in journey ${journeyId}`);
          continue; // Skip si pas enrollé
        }
        
        // Vérifier si tous les modules sont complétés
        if (journey.modules && Array.isArray(journey.modules)) {
          for (const module of journey.modules) {
            const moduleId = module.id || module._id;
            if (!moduleId) continue;
            
            // Vérifier le progrès via l'API de progrès
            const progressResponse = await fetch(
              `${trainingBackendUrl}/rep-progress?repId=${agentId}&journeyId=${journeyId}&moduleId=${moduleId}`
            );
            
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              const progress = Array.isArray(progressData) ? progressData[0] : progressData;
              
              // Vérifier si le module est complété
              if (!progress || progress.status !== 'completed' || progress.progress < 100) {
                console.log(`❌ Module ${moduleId} not completed (status: ${progress?.status}, progress: ${progress?.progress})`);
                return false;
              }
            } else {
              console.warn(`⚠️ Could not fetch progress for module ${moduleId}`);
              return false; // Si on ne peut pas vérifier, considérer comme non complété
            }
            
            // Vérifier si tous les quizzes sont complétés
            if (module.quizzes && Array.isArray(module.quizzes) && module.quizzes.length > 0) {
              for (const quiz of module.quizzes) {
                const quizId = quiz.id || quiz._id;
                if (!quizId) continue;
                
                // Vérifier les tentatives de quiz
                const quizAttemptsResponse = await fetch(
                  `${trainingBackendUrl}/module-quizzes/${quizId}/attempts?repId=${agentId}`
                );
                
                if (quizAttemptsResponse.ok) {
                  const quizAttempts = await quizAttemptsResponse.json();
                  const passedAttempt = Array.isArray(quizAttempts) 
                    ? quizAttempts.find((attempt: any) => attempt.status === 'passed' || attempt.passed === true)
                    : (quizAttempts.status === 'passed' || quizAttempts.passed === true ? quizAttempts : null);
                  
                  if (!passedAttempt) {
                    console.log(`❌ Quiz ${quizId} not passed`);
                    return false;
                  }
                } else {
                  console.warn(`⚠️ Could not fetch quiz attempts for quiz ${quizId}`);
                  return false; // Si on ne peut pas vérifier, considérer comme non complété
                }
              }
            }
          }
        }
      }
      
      console.log('✅ All training modules and quizzes completed');
      return true;
    } catch (err) {
      console.error('❌ Error checking training completion:', err);
      return false; // En cas d'erreur, considérer comme non complété pour la sécurité
    } finally {
      setCheckingTraining(false);
    }
  };

  // Fonction pour récupérer les leads
  const fetchLeads = async (page: number = 1) => {
    if (!gigId) return;
    
    setLeadsLoading(true);
    setLeadsError(null);
    
    try {
      console.log('🔍 Fetching leads for gig ID:', gigId, 'page:', page);
      const response = await fetch(
        `${import.meta.env.VITE_DASH_COMPANY_BACKEND}/leads/gig/${gigId}?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Leads API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to fetch leads: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      console.log('✅ Received leads data:', data);
      
      if (data.success) {
        setLeads(data.data);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalLeads(data.total);
      } else {
        throw new Error('Failed to fetch leads');
      }
    } catch (err) {
      console.error('❌ Error fetching leads:', err);
      setLeadsError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  // Vérifier la complétion de la formation quand l'agent est enrolled
  useEffect(() => {
    const verifyTrainingAndLoadLeads = async () => {
    if (gigId && isAgentEnrolled()) {
        // Vérifier d'abord si le gig a des formations et si le rep a commencé
        const trainingStatus = await checkTrainingStarted();
        setHasTraining(trainingStatus.hasTraining);
        setTrainingStarted(trainingStatus.started);
        
        // Si le gig a des formations mais le rep n'a pas commencé, ne pas afficher les leads
        if (trainingStatus.hasTraining && !trainingStatus.started) {
          console.log('⚠️ Le gig a des formations mais le rep n\'a pas commencé, les leads ne seront pas affichés');
          setTrainingCompleted(false);
          setLeads([]);
          setTotalLeads(0);
          setTotalPages(0);
          return;
        }
        
        // Si le rep a commencé, vérifier la complétion
        const completed = await checkTrainingCompletion();
        setTrainingCompleted(completed);
        
        // Vérifier le score d'engagement
        const score = await getEngagementScore();
        setEngagementScore(score);
        
        // Charger les leads uniquement si la formation est complétée ET le score > 100
        // Si le score est <= 100, ne pas afficher les leads
        // Note: Si le score est null (pas encore défini), on affiche les leads si la formation est complétée
        if (completed) {
          // Si le score n'est pas défini ou est > 100, afficher les leads
          if (score === null || score > 100) {
            console.log(`✅ Formation complétée, score: ${score}, affichage des leads`);
            fetchLeads(1);
          } else {
            // Score <= 100 : ne pas afficher les leads selon la demande
            console.log(`⚠️ Score d'engagement (${score}) <= 100, les leads ne seront pas affichés`);
            setLeads([]);
            setTotalLeads(0);
            setTotalPages(0);
          }
        } else {
          // Formation non complétée : ne pas afficher les leads
          console.log('⚠️ Formation non complétée, les leads ne seront pas affichés');
          setLeads([]);
          setTotalLeads(0);
          setTotalPages(0);
        }
      } else {
        setTrainingCompleted(null);
        setHasTraining(false);
        setTrainingStarted(null);
      }
    };
    
    verifyTrainingAndLoadLeads();
  }, [gigId, gig]);

  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchLeads(newPage);
    }
  };

  // Fonction pour postuler au gig
  const handleApply = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    
    if (!agentId || !token) {
      setApplicationStatus('error');
             setApplicationMessage('You must be logged in to apply');
      return;
    }

    if (!gigId) {
      setApplicationStatus('error');
             setApplicationMessage('Gig ID not found');
      return;
    }

    setApplying(true);
    setApplicationStatus('idle');
    setApplicationMessage('');

    try {
      console.log('🚀 Applying to gig:', gigId);
      console.log('👤 Agent ID:', agentId);
      
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/enrollment-request/${agentId}/${gigId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: "I am very interested in this project and have relevant experience in frontend development."
          }),
        }
      );

      console.log('📡 Application response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Application failed:', errorText);
        
        // Si l'erreur indique que le gig est déjà en attente, rafraîchir le statut
        if (response.status === 400 && errorText.includes('Cannot request enrollment for this gig at this time')) {
          console.log('⏳ Gig is already pending, refreshing enrollment status...');
          setApplicationStatus('idle');
          setApplicationMessage('This gig is already pending. Refreshing status...');
          
          // Rafraîchir le statut d'enrollment après un court délai
          setTimeout(() => {
            // Appeler la fonction de vérification du statut
            const checkStatus = async () => {
              const agentId = getAgentId();
              const token = getAuthToken();
              
              if (!agentId || !token || !gigId) return;
              
              try {
                console.log('🔄 Refreshing enrollment status...');
                const enrolledResponse = await fetch(
                  `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/enrolled/agent/${agentId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  }
                );

                if (enrolledResponse.ok) {
                  const enrolledData = await enrolledResponse.json();
                  console.log('📝 Refreshed enrolled data:', enrolledData);
                  
                  // Vérifier le statut de l'enrollment pour ce gig spécifique
                  const enrollmentForThisGig = enrolledData.find((enrollment: any) => 
                    enrollment.gigId === gigId || enrollment.gigId?._id === gigId
                  );
                  
                  if (enrollmentForThisGig) {
                    if (enrollmentForThisGig.status === 'pending') {
                      console.log('⏳ Found pending enrollment, updating status');
                      setEnrollmentStatus('requested');
                      setApplicationStatus('success');
                      setApplicationMessage('Status updated: This gig is already pending');
                    } else if (enrollmentForThisGig.status === 'accepted' || enrollmentForThisGig.status === 'enrolled') {
                      console.log('✅ Found accepted enrollment, updating status');
                      setEnrollmentStatus('enrolled');
                      setApplicationStatus('success');
                      setApplicationMessage('Status updated: You are now enrolled in this gig');
                    }
                  } else {
                    console.log('ℹ️ No enrollment found for this gig');
                  }
                } else {
                  console.log('⚠️ Failed to refresh enrollment status:', enrolledResponse.status);
                }
              } catch (err) {
                console.error('❌ Error refreshing enrollment status:', err);
              }
            };
            
            checkStatus();
          }, 1000);
          
          return;
        }
        
        throw new Error(`Échec de la candidature: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Application successful:', data);
      
      setApplicationStatus('success');
      setApplicationMessage(data.message || 'Application sent successfully!');
      setEnrollmentStatus('requested');
      
      // Déclencher le rafraîchissement des statuts dans toutes les pages
      await refreshGigStatuses();
      
      // Ne pas rediriger, juste mettre à jour le statut local
      
    } catch (err) {
      console.error('❌ Error applying to gig:', err);
      setApplicationStatus('error');
             setApplicationMessage(err instanceof Error ? err.message : 'Error during application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gig Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested gig could not be found.'}</p>
          <button
            onClick={() => navigate('/gigs-marketplace')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/gigs-marketplace')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Marketplace
          </button>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{gig.title}</h1>
                  {/* Badge de statut */}
                  {getAgentStatus() === 'enrolled' && (
                    <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-300">
                      ✓ Enrolled
                    </span>
                  )}
                  {getAgentStatus() === 'invited' && (
                    <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300">
                      ✉ Invited
                    </span>
                  )}
                  {getAgentStatus() === 'pending' && (
                    <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
                      ⏳ Pending
                    </span>
                  )}
                </div>
                <p className="text-lg text-gray-600 mb-2">{gig.category}</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    {gig.seniority.level}
                  </span>
                  <span className="text-sm text-gray-600">
                    at <span className="font-medium text-gray-900">{gig.companyId?.name || 'Unknown Company'}</span>
                  </span>
                </div>
              </div>
              <div className="ml-6">
                {/* Status message */}
                {applicationStatus === 'error' && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ❌ {applicationMessage}
                    </p>
                  </div>
                )}

                {/* Bouton selon le statut d'enrollment */}
                {getAgentStatus() === 'enrolled' ? (
                  <div className="text-center">
                    <button 
                      onClick={() => window.location.href = '/copilot'}
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-md"
                    >
                      🚀 Start
                    </button>
                  </div>
                ) : getAgentStatus() === 'pending' ? (
                  <div className="text-center">
                    <span className="inline-block px-5 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium text-sm">
                      ⏳ Pending
                    </span>
                  </div>
                ) : getAgentStatus() === 'invited' ? (
                  <div className="text-center">
                    <span className="inline-block px-5 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                      📨 Invited
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={handleApply}
                    disabled={applying}
                    className={`px-5 py-2 rounded-lg transition-colors font-medium text-sm shadow-md ${
                      applying
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {applying ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : (
                      'Apply Now'
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-6">
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{gig.commission.baseAmount} {typeof gig.commission.currency === 'object' ? gig.commission.currency?.symbol || gig.commission.currency?.code || 'USD' : gig.commission.currency}/yr</p>
                  <p className="text-xs">Base Salary</p>
                </div>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{gig.seniority.yearsExperience} years</p>
                  <p className="text-xs">Experience</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <Globe className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{typeof gig.destination_zone === 'object' ? gig.destination_zone?.name?.common || gig.destination_zone?.cca2 || 'Unknown' : gig.destination_zone}</p>
                  <p className="text-xs">
                    {gig.availability?.time_zone?.countryCode || gig.availability?.time_zone?.abbreviation || 'Timezone'}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{gig.availability?.minimumHours?.weekly || 'N/A'}h/week</p>
                  <p className="text-xs">Hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Colonne principale */}
          <div className="xl:col-span-3 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{gig.description}</p>
            </div>

            {/* Skills */}
            {(gig.skills?.technical?.length > 0 || gig.skills?.professional?.length > 0 || gig.skills?.soft?.length > 0) && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
                
                {gig.skills.technical?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Technical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.technical.map((skill, i) => {
                        console.log('Technical skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-800">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.professional?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Professional Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.professional.map((skill, i) => {
                        console.log('Professional skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1 bg-green-100 rounded-full text-sm text-green-800">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.soft?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.soft.map((skill, i) => {
                        console.log('Soft skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1 bg-purple-100 rounded-full text-sm text-purple-800">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.languages?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.languages.map((lang, i) => {
                        console.log('Language item:', lang);
                        const langName = lang.language?.name || lang.iso639_1?.toUpperCase() || 'Language';
                        const proficiency = lang.proficiency || 'N/A';
                        return (
                          <span key={i} className="px-3 py-1 bg-yellow-100 rounded-full text-sm text-yellow-800">
                            {langName} ({proficiency})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Industries */}
            {gig.industries?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Industries</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.industries.map((industry, index) => {
                    console.log('Industry item:', industry);
                    const industryName = industry.name || 'Industry';
                    const industryId = industry._id || index;
                    return (
                      <span key={industryId} className="px-3 py-1 bg-purple-100 rounded-full text-sm text-purple-800">
                        {industryName}
                      </span>
                    );
                  })}
                </div>
                {gig.industries.length > 3 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Working across {gig.industries.length} different industries
                  </p>
                )}
              </div>
            )}

            {/* Activities */}
            {gig.activities?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.activities.map((activity, index) => {
                    console.log('Activity item:', activity);
                    const activityName = activity.name || 'Activity';
                    const activityId = activity._id || index;
                    return (
                      <span key={activityId} className="px-3 py-1 bg-green-100 rounded-full text-sm text-green-800">
                        {activityName}
                      </span>
                    );
                  })}
                </div>
                {gig.activities.some(activity => activity.description) && (
                  <div className="mt-4 space-y-2">
                    {gig.activities.filter(activity => activity.description).map((activity, index) => {
                      const activityId = activity._id || index;
                      const activityName = activity.name || 'Activity';
                      return (
                        <div key={`desc-${activityId}`} className="text-sm">
                          <span className="font-medium text-gray-700">{activityName}:</span>
                          <span className="text-gray-600 ml-1">{activity.description}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Commission Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Compensation</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Salary:</span>
                  <span className="font-medium">{gig.commission.baseAmount} {typeof gig.commission.currency === 'object' ? gig.commission.currency?.symbol || gig.commission.currency?.code || 'USD' : gig.commission.currency}/year</span>
                </div>
                {gig.commission.bonus && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bonus:</span>
                    <span className="font-medium text-green-600">{gig.commission.bonusAmount || 'Available'}</span>
                  </div>
                )}
                {gig.commission.structure && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Structure:</span>
                    <span className="font-medium">{gig.commission.structure}</span>
                  </div>
                )}
                {gig.commission.minimumVolume && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Volume:</span>
                    <span className="font-medium">{gig.commission.minimumVolume.amount} {gig.commission.minimumVolume.unit}/{gig.commission.minimumVolume.period}</span>
                  </div>
                )}
                {gig.commission.transactionCommission && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Commission:</span>
                    <span className="font-medium">{gig.commission.transactionCommission.amount} ({gig.commission.transactionCommission.type})</span>
                  </div>
                )}
                {gig.commission.additionalDetails && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{gig.commission.additionalDetails}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leads Information - Only for enrolled agents */}
            {isAgentEnrolled() && gig.leads?.types?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Types</h2>
                <div className="space-y-3">
                  {gig.leads.types.map((leadType, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          leadType.type === 'hot' ? 'bg-red-100 text-red-700' :
                          leadType.type === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {leadType.type.charAt(0).toUpperCase() + leadType.type.slice(1)}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">{leadType.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{leadType.percentage}%</p>
                        {leadType.conversionRate && (
                          <p className="text-xs text-gray-500">{leadType.conversionRate}% conversion</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {gig.leads.sources?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-800 mb-2">Lead Sources:</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.leads.sources.map((source, index) => (
                        <span key={index} className="px-2 py-1 bg-indigo-100 rounded-full text-xs text-indigo-700">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Structure */}
            {gig.team && (gig.team.size || gig.team.territories?.length > 0 || gig.team.structure?.length > 0) && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Structure</h2>
                <div className="space-y-3">
                  {gig.team.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Size:</span>
                      <span className="font-medium">{gig.team.size}</span>
                    </div>
                  )}
                  {gig.team.territories?.length > 0 && (
                    <div>
                      <span className="text-gray-600">Territories:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gig.team.territories.map((territory, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 rounded-full text-xs text-blue-700">
                            {typeof territory === 'object' ? territory?.name?.common || territory?.cca2 || 'Unknown' : territory}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {gig.team.structure?.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-800 mb-2">Team Composition:</h3>
                      <div className="space-y-2">
                        {gig.team.structure.map((role, index) => (
                          <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                            <span>{role.count}x {role.seniority.level}</span>
                            <span className="text-gray-600">{role.seniority.yearsExperience} years exp.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Career Growth & Benefits */}
            {((gig.companyId?.opportunities && (gig.companyId.opportunities.roles?.length > 0 || gig.companyId.opportunities.growthPotential || gig.companyId.opportunities.training)) || 
             (gig.companyId?.culture && (gig.companyId.culture.benefits?.length > 0 || gig.companyId.culture.workEnvironment))) && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Career Growth & Benefits</h2>
                
                {gig.companyId?.opportunities?.roles?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-800 mb-2">Career Progression:</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.companyId.opportunities.roles.map((role, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 rounded-full text-sm text-green-800">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {gig.companyId?.opportunities?.growthPotential && (
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-800 mb-1">Growth Potential:</h3>
                    <p className="text-sm text-gray-600">{gig.companyId.opportunities.growthPotential}</p>
                  </div>
                )}

                {gig.companyId?.opportunities?.training && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-800 mb-1">Training & Development:</h3>
                    <p className="text-sm text-gray-600">{gig.companyId.opportunities.training}</p>
                  </div>
                )}

                {gig.companyId?.culture?.benefits?.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-800 mb-2">Benefits Package:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {gig.companyId.culture.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {gig.companyId?.culture?.workEnvironment && (
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Work Environment:</h3>
                    <p className="text-sm text-gray-600">{gig.companyId.culture.workEnvironment}</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="xl:col-span-2 space-y-8">
            {/* Company Info */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Building className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="font-medium">{(() => {
                    console.log('Company data:', gig.companyId);
                    return gig.companyId?.name || 'Unknown';
                  })()}</span>
                </div>
                {gig.companyId?.industry && (
                  <div className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-gray-400" />
                    <span>{gig.companyId.industry}</span>
                  </div>
                )}
                {gig.companyId?.headquarters && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    <span>{gig.companyId.headquarters}</span>
                  </div>
                )}
              </div>
              
              {gig.companyId?.overview && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">About</h3>
                  <p className="text-sm text-gray-600">{gig.companyId.overview}</p>
                </div>
              )}



              {/* Contact Information */}
              {(gig.companyId?.contact?.website || gig.companyId?.contact?.email || gig.companyId?.contact?.phone || gig.companyId?.contact?.address) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Contact</h3>
                  <div className="space-y-1">
                    {gig.companyId.contact.website && (
                      <p className="text-xs">
                        <span className="text-gray-600">Website:</span>
                        <a href={gig.companyId.contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          {gig.companyId.contact.website}
                        </a>
                      </p>
                    )}
                    {gig.companyId.contact.email && (
                      <p className="text-xs">
                        <span className="text-gray-600">Email:</span>
                        <a href={`mailto:${gig.companyId.contact.email}`} className="text-blue-600 hover:underline ml-1">
                          {gig.companyId.contact.email}
                        </a>
                      </p>
                    )}
                    {gig.companyId.contact.phone && (
                      <p className="text-xs">
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-1">{gig.companyId.contact.phone}</span>
                      </p>
                    )}
                    {gig.companyId.contact.address && (
                      <p className="text-xs">
                        <span className="text-gray-600">Address:</span>
                        <span className="ml-1">{gig.companyId.contact.address}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}


            </div>

            {/* Schedule & Availability */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Availability</h2>
              
              {/* Timezone */}
              {gig.availability?.time_zone && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">
                      {gig.availability.time_zone.zoneName || gig.availability.time_zone.name}
                    </span>
                    <span className="text-sm text-blue-700">
                      {gig.availability.time_zone.countryCode || gig.availability.time_zone.abbreviation}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    GMT{gig.availability.time_zone.gmtOffset 
                      ? (gig.availability.time_zone.gmtOffset >= 0 ? '+' : '') + (gig.availability.time_zone.gmtOffset / 3600)
                      : gig.availability.time_zone.offset}
                  </p>
                </div>
              )}

              {/* Minimum Hours */}
              {gig.availability?.minimumHours && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Minimum Hours:</h3>
                  <div className="space-y-1 text-sm">
                    {gig.availability.minimumHours.daily && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily:</span>
                        <span>{gig.availability.minimumHours.daily}h</span>
                      </div>
                    )}
                    {gig.availability.minimumHours.weekly && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weekly:</span>
                        <span>{gig.availability.minimumHours.weekly}h</span>
                      </div>
                    )}
                    {gig.availability.minimumHours.monthly && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span>{gig.availability.minimumHours.monthly}h</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {gig.availability?.schedule?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Schedule:</h3>
                  <div className="space-y-2">
                    {gig.availability.schedule.map((schedule, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{schedule.day}</span>
                        <span className="text-gray-600">{schedule.hours.start} - {schedule.hours.end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flexibility */}
              {gig.availability?.flexibility?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Flexibility:</h3>
                  <div className="flex flex-wrap gap-1">
                    {gig.availability.flexibility.map((flex, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                        {flex}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documentation */}
            {((gig.documentation?.product?.length ?? 0) > 0 || (gig.documentation?.process?.length ?? 0) > 0 || (gig.documentation?.training?.length ?? 0) > 0) && (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Documentation & Resources</h2>
                
                {(gig.documentation?.product?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-800 mb-2">Product Documentation:</h3>
                    <div className="space-y-1">
                      {gig.documentation?.product?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" 
                           className="block text-sm text-blue-600 hover:underline">
                          📄 {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(gig.documentation?.process?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-800 mb-2">Process Documentation:</h3>
                    <div className="space-y-1">
                      {gig.documentation?.process?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" 
                           className="block text-sm text-blue-600 hover:underline">
                          📋 {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(gig.documentation?.training?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-800 mb-2">Training Materials:</h3>
                    <div className="space-y-1">
                      {gig.documentation?.training?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" 
                           className="block text-sm text-blue-600 hover:underline">
                          🎓 {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Available Trainings Section - Before Leads */}
        {isAgentEnrolled() && (
        <div className="mt-8">
          <div id="available-trainings-section" className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Trainings</h2>
            {loadingTrainings ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading trainings...</span>
              </div>
            ) : availableTrainings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {availableTrainings.map((training) => {
                  const trainingId = extractId(training.id || training._id);
                  // Chercher la progression par journeyId (qui correspond au trainingId)
                  // L'API retourne journeyId dans les données de progression
                  const progress = trainingsProgress[trainingId] || trainingsProgress[extractId(training.id || training._id)];
                  const progressPercent = progress?.progress || 0;
                  const progressStatus = progress?.status || 'not-started';
                  
                  return (
                    <div
                      key={trainingId}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
                      onClick={() => handleTrainingClick(trainingId)}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {training.title || 'Untitled Training'}
                        </h3>
                        {training.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                            {training.description}
                          </p>
                        )}
                        
                        {/* Progress Bar */}
                        {progress && progressStatus !== 'not-started' && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">Progress</span>
                              <span className="text-xs font-medium text-gray-900">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  progressStatus === 'completed'
                                    ? 'bg-green-600'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          {training.status && (
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              training.status === 'active' || training.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : training.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {training.status}
                            </span>
                          )}
                          {progressStatus && progressStatus !== 'not-started' && (
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              progressStatus === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : progressStatus === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {progressStatus === 'completed' ? 'Completed' : 'In Progress'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className={`w-full mt-auto px-4 py-2 rounded-lg transition-colors ${
                          progressStatus === 'completed'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrainingClick(trainingId);
                        }}
                      >
                        {progressStatus === 'completed' ? 'Review Training' : progressStatus === 'in-progress' ? 'Continue Training' : 'Start Training'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No trainings available for this gig.</p>
                <p className="text-sm mt-2">Trainings will appear here once they are assigned to this gig.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Leads Section - Full Width - Only for enrolled agents who completed training */}
        {isAgentEnrolled() && (
        <div className="mt-8">
          {checkingTraining || trainingCompleted === null ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Checking training completion...</span>
              </div>
            </div>
          ) : hasTraining && trainingStarted === false ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-center py-8">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <p className="text-orange-800 font-medium mb-2 text-lg">📚 Training Required!</p>
                  <p className="text-orange-700 text-sm mb-4">
                    This gig requires training. You must start the training before accessing leads.
                  </p>
                  <p className="text-orange-600 text-xs mb-4">
                    Please start the required training to unlock access to leads.
                  </p>
                  <button
                    onClick={() => {
                      // Scroll to trainings section
                      const trainingsSection = document.getElementById('available-trainings-section');
                      if (trainingsSection) {
                        trainingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Go to Training
                  </button>
                </div>
              </div>
            </div>
          ) : trainingCompleted === false ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <p className="text-yellow-800 font-medium mb-2 text-lg">⚠️ Training Not Completed</p>
                  <p className="text-yellow-700 text-sm mb-4">
                    You must complete all training modules, quizzes, and final exam before accessing leads.
                  </p>
                  <p className="text-yellow-600 text-xs mb-4">
                    Please complete all required trainings and assessments to unlock access to leads.
                  </p>
                  <button
                    onClick={() => {
                      // Scroll to trainings section
                      const trainingsSection = document.getElementById('available-trainings-section');
                      if (trainingsSection) {
                        trainingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Go to Training
                  </button>
                </div>
              </div>
            </div>
          ) : trainingCompleted === true ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Available Leads</h2>
                <div className="flex items-center gap-4">
                  {engagementScore !== null && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Score:</span>
                      <span className="text-sm font-bold text-blue-600">{engagementScore}/100</span>
                    </div>
                  )}
                  {totalLeads > 0 && (
                    <span className="text-sm text-gray-600">
                      Total: {totalLeads} leads
                    </span>
                  )}
                </div>
              </div>
              {leadsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : leadsError ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-2">❌ {leadsError}</p>
                  <button
                    onClick={() => fetchLeads(currentPage)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No leads available for this gig yet.</p>
                </div>
              ) : (
                <>
                  {/* Leads Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Table Header - Fixed */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Lead Name</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Phone</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    
                    {/* Table Body - Scrollable */}
                    <div className="overflow-y-auto overflow-x-auto max-h-96" style={{ maxHeight: '480px' }}>
                      <table className="w-full border-collapse">
                        <tbody>
                          {leads.map((lead, index) => (
                            <tr
                              key={lead._id || index}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              {/* Lead Name */}
                              <td className="py-3 px-4" style={{ width: '25%' }}>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {lead.Deal_Name || lead.assignedTo?.name || `Lead #${index + 1}`}
                                  </div>
                                  {lead.Activity_Tag && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {lead.Activity_Tag}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Email */}
                              <td className="py-3 px-4" style={{ width: '35%' }}>
                                {lead.Email_1 ? (
                                  <div className="flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                    <a
                                      href={`mailto:${lead.Email_1}`}
                                      className="text-blue-600 hover:text-blue-700 hover:underline text-sm truncate"
                                      title={lead.Email_1}
                                    >
                                      {lead.Email_1.length > 25 ? `${lead.Email_1.substring(0, 25)}...` : lead.Email_1}
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>

                              {/* Phone */}
                              <td className="py-3 px-4" style={{ width: '25%' }}>
                                {lead.Phone ? (
                                  <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-900 text-sm">
                                      {lead.Phone}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4" style={{ width: '15%' }}>
                                <button
                                  onClick={() => {
                                    console.log('Redirecting to copilot for lead:', lead);
                                    const copilotUrl = import.meta.env.VITE_COPILOT_URL;
                                    if (copilotUrl) {
                                      // Construire l'URL avec l'ID du lead comme paramètre
                                      const leadId = lead._id || lead.id;
                                      const fullUrl = leadId 
                                        ? `${copilotUrl}?leadId=${leadId}`
                                        : copilotUrl;
                                      
                                      // Le cookie gigId est déjà mis à jour lors du chargement de la page
                                      // La page copilot peut maintenant récupérer à la fois le leadId (URL) et le gigId (cookie)
                                      console.log('Navigating to copilot with lead ID:', leadId);
                                      console.log('Current gigId available in cookie:', Cookies.get('currentGigId'));
                                      window.location.href = fullUrl;
                                    } else {
                                      console.error('VITE_COPILOT_URL not configured');
                                    }
                                  }}
                                  className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                                  title="Call this lead"
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  Call
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`flex items-center px-3 py-1 rounded-md text-sm ${
                            currentPage === 1
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </button>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`flex items-center px-3 py-1 rounded-md text-sm ${
                            currentPage === totalPages
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
        )}
      </div>
    </div>
  );
}