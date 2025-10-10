import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Globe, Calendar, Heart, User, Mail, Clock } from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { fetchPendingRequests as fetchPendingRequestsUtil, fetchEnrolledGigsFromProfile } from '../utils/gigStatusUtils';

export function GigsMarketplace() {
  const navigate = useNavigate();
  
  // Interface pour les gigs populés
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
      verificationCode?: {
        code?: string;
        expiresAt?: Date;
        otp?: number;
        otpExpiresAt?: Date;
      };
      ipHistory: Array<{
        ip: string;
        timestamp: Date;
        action: 'register' | 'login';
        locationInfo: {
          location?: string;
          region?: string;
          city?: string;
          isp?: string;
          postal?: string;
          coordinates?: string;
        };
      }>;
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
        name: string;
        offset: string;
        abbreviation: string;
        description?: string;
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
      territories: string[];
    };

    // 📖 Documentation
    documentation: {
      product?: Array<{ name: string; url: string }>;
      process?: Array<{ name: string; url: string }>;
      training?: Array<{ name: string; url: string }>;
    };

    // 👥 Agents enrolled/invited/requested
    agents?: Array<{
      agentId: string;
      status: 'enrolled' | 'invited' | 'requested' | 'pending';
      enrollmentDate?: Date | string;
      invitationDate?: Date | string;
      updatedAt?: Date | string;
      _id?: string;
    }>;

    status: 'to_activate' | 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }

  // Interface pour les enrollments invités
  interface InvitedEnrollment {
    id: string;
    gig: PopulatedGig | {
      _id: string;
      title: string;
      description: string;
      category: string;
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
    };
    enrollmentStatus: string;
    invitationSentAt: string;
    invitationExpiresAt: string;
    isExpired: boolean;
    canEnroll: boolean;
    notes?: string;
    matchScore?: number | null;
    matchStatus?: string | null;
  }

  // Interface pour les gigs inscrits
  interface EnrolledGig {
    id: string;
    gig: {
      _id: string;
      title: string;
      description: string;
      category: string;
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
      company: string;
      compensation: string;
      experience: string;
      workHours: string;
    };
    enrollmentStatus: string;
    enrollmentDate: string;
    enrollmentNotes?: string;
    status: string;
    matchScore: number;
    matchStatus: string;
  }

  const [activeTab, setActiveTab] = useState<'available' | 'enrolled' | 'favorite' | 'invited'>('available');
  const [gigs, setGigs] = useState<PopulatedGig[]>([]);
  const [invitedEnrollments, setInvitedEnrollments] = useState<InvitedEnrollment[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<EnrolledGig[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]); // IDs des gigs avec demandes en attente
  const [enrolledGigIds, setEnrolledGigIds] = useState<string[]>([]); // IDs des gigs inscrits depuis le profil
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [gigsPerPage] = useState(9);
  const [sortBy] = useState<'latest' | 'salary' | 'experience'>('latest');
  const [favoriteGigs, setFavoriteGigs] = useState<string[]>([]);

  // Fonction pour obtenir le statut d'un gig pour l'agent connecté
  const getGigStatus = (gigId: string): 'enrolled' | 'invited' | 'pending' | 'none' => {
    const agentId = getAgentId();
    if (!agentId) return 'none';

    // Log pour déboguer
    console.log(`🔍 getGigStatus for gig ${gigId}:`, {
      enrolledGigIds: enrolledGigs.map(eg => eg.gig._id),
      enrolledGigIdsFromProfile: enrolledGigIds,
      invitedGigIds: invitedEnrollments.map(ie => ie.gig._id),
      pendingGigIds: pendingRequests,
      gigId
    });

    // 1. Vérifier d'abord les données du profil (plus fiables)
    if (enrolledGigIds.includes(gigId)) {
      console.log(`✅ Gig ${gigId} is ENROLLED (from profile)`);
      return 'enrolled';
    }

    if (pendingRequests.includes(gigId)) {
      console.log(`⏳ Gig ${gigId} is PENDING (from profile)`);
      return 'pending';
    }

    // 2. Vérifier les données du gig directement (si disponible)
    const currentGig = gigs.find(g => g._id === gigId);
    if (currentGig && currentGig.agents && Array.isArray(currentGig.agents)) {
      const agentInGig = currentGig.agents.find((agent: any) => agent.agentId === agentId);
      if (agentInGig) {
        if (agentInGig.status === 'enrolled') {
          console.log(`✅ Gig ${gigId} is ENROLLED (from gig.agents)`);
          return 'enrolled';
        }
        if (agentInGig.status === 'invited') {
          console.log(`📨 Gig ${gigId} is INVITED (from gig.agents)`);
          return 'invited';
        }
        if (agentInGig.status === 'requested' || agentInGig.status === 'pending') {
          console.log(`⏳ Gig ${gigId} is PENDING/REQUESTED (from gig.agents)`);
          return 'pending';
        }
      }
    }

    // 3. Vérifier les données des API (fallback)
    const enrolledGig = enrolledGigs.find(eg => eg.gig._id === gigId);
    if (enrolledGig) {
      console.log(`✅ Gig ${gigId} is ENROLLED (from API)`);
      return 'enrolled';
    }

    // Vérifier si le gig est dans les invitations
    const invitedGig = invitedEnrollments.find(ie => ie.gig._id === gigId);
    if (invitedGig) {
      console.log(`📨 Gig ${gigId} is INVITED`);
      return 'invited';
    }

    console.log(`❌ Gig ${gigId} has NO STATUS`);
    return 'none';
  };

  // Fonction pour rafraîchir tous les statuts (à exporter pour GigDetails)
  const refreshAllStatuses = async () => {
    const agentId = getAgentId();
    if (agentId) {
      await Promise.all([
        fetchFavorites(),
        fetchInvitedEnrollments(),
        fetchEnrolledGigs(),
        fetchPendingRequests()
      ]);
    }
  };

  // Fonction pour récupérer les favoris
  const fetchFavorites = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/favorites`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch favorites');
      const data = await response.json();
      console.log('Favorites response:', data);

      // Assurons-nous que nous avons un tableau de favoris
      if (Array.isArray(data)) {
        // Si la réponse est un tableau direct
        const favoriteIds = data.map((fav: { _id: string }) => fav._id);
        console.log('Favorite IDs:', favoriteIds);
        setFavoriteGigs(favoriteIds);
      } else if (data.data && Array.isArray(data.data)) {
        // Si la réponse a une propriété data qui est un tableau
        const favoriteIds = data.data.map((fav: { _id: string }) => fav._id);
        console.log('Favorite IDs:', favoriteIds);
        setFavoriteGigs(favoriteIds);
      } else {
        console.error('Unexpected favorites data structure:', data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  // Fonction pour ajouter aux favoris
  const addToFavorites = async (gigId: string) => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    console.log('🔄 Adding to favorites:', gigId);
    console.log('📋 Current favoriteGigs:', favoriteGigs);
    console.log('🔗 API URL:', `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/favorites/${gigId}`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/favorites/${gigId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      console.log('📡 Add to favorites response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to add to favorites:', errorText);
        throw new Error('Failed to add to favorites');
      }
      
      console.log('✅ Successfully added to favorites');
      setFavoriteGigs(prev => [...prev, gigId]);
      console.log('📋 Updated favoriteGigs:', [...favoriteGigs, gigId]);
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  // Fonction pour supprimer des favoris
  const removeFromFavorites = async (gigId: string) => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    console.log('🗑️ Removing from favorites:', gigId);
    console.log('📋 Current favoriteGigs:', favoriteGigs);
    console.log('🔗 API URL:', `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/favorites/${gigId}`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/favorites/${gigId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      console.log('📡 Remove from favorites response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to remove from favorites:', errorText);
        throw new Error('Failed to remove from favorites');
      }
      
      console.log('✅ Successfully removed from favorites');
      setFavoriteGigs(prev => prev.filter(id => id !== gigId));
      console.log('📋 Updated favoriteGigs:', favoriteGigs.filter(id => id !== gigId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  // Fonction pour accepter une invitation
  const acceptInvitation = async (enrollmentId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token not found');
      alert('Authentication required. Please log in again.');
      return;
    }

    console.log('🔄 Accepting invitation:', enrollmentId);
    console.log('🔗 API URL:', `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/accept`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('📡 Accept response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to accept invitation:', errorText);
        alert(`Failed to accept invitation: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to accept invitation: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Invitation accepted successfully:', result);
      alert('Invitation accepted successfully!');
      
      // Retirer l'enrollment de la liste des invitations
      setInvitedEnrollments(prev => prev.filter(enrollment => enrollment.id !== enrollmentId));
      
      // Rafraîchir la liste des gigs inscrits
      fetchEnrolledGigs();
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  // Fonction pour rejeter une invitation
  const rejectInvitation = async (enrollmentId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token not found');
      alert('Authentication required. Please log in again.');
      return;
    }

    console.log('🔄 Rejecting invitation:', enrollmentId);
    console.log('🔗 API URL:', `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/reject`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('📡 Reject response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to reject invitation:', errorText);
        alert(`Failed to reject invitation: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to reject invitation: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Invitation rejected successfully:', result);
      alert('Invitation rejected successfully!');
      
      // Retirer l'enrollment de la liste des invitations
      setInvitedEnrollments((prev: any[]) => prev.filter(enrollment => enrollment.id !== enrollmentId));
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  // Fonction pour récupérer les demandes en attente (pending requests)
  const fetchPendingRequests = async () => {
    console.log('🔍 Starting fetchPendingRequests...');
    try {
      const pendingGigIds = await fetchPendingRequestsUtil();
      console.log('✅ fetchPendingRequests completed, setting pendingRequests:', pendingGigIds);
      setPendingRequests(pendingGigIds);
    } catch (error) {
      console.error('❌ Error in fetchPendingRequests:', error);
      setPendingRequests([]);
    }
  };

  // Fonction pour récupérer les gigs inscrits depuis le profil
  const fetchEnrolledGigIdsFromProfile = async () => {
    console.log('🔍 Starting fetchEnrolledGigIdsFromProfile...');
    try {
      const enrolledIds = await fetchEnrolledGigsFromProfile();
      console.log('✅ fetchEnrolledGigIdsFromProfile completed, setting enrolledGigIds:', enrolledIds);
      setEnrolledGigIds(enrolledIds);
    } catch (error) {
      console.error('❌ Error in fetchEnrolledGigIdsFromProfile:', error);
      setEnrolledGigIds([]);
    }
  };

  // Fonction pour récupérer les gigs inscrits avec données complètes
  const fetchEnrolledGigs = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      console.log('🔍 Fetching enrolled gigs for agent:', agentId);
      // Utiliser le nouvel endpoint /gig-agents/agents/{agentId}/gigs?status=enrolled
      const enrollmentResponse = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=enrolled`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!enrollmentResponse.ok) {
        throw new Error('Failed to fetch enrolled gigs');
      }
      
      const enrollmentData = await enrollmentResponse.json();
      console.log('📝 Enrolled gigs raw response:', enrollmentData);
      console.log('📊 Response count:', enrollmentData.count);
      
      // La réponse contient un objet avec la propriété 'gigs'
      if (enrollmentData.gigs && Array.isArray(enrollmentData.gigs)) {
        console.log('✅ Response has gigs array, processing enrollments...');
        console.log('🔍 First enrollment structure:', enrollmentData.gigs[0]);
        
        // Transformer les données pour correspondre à l'interface EnrolledGig
        const transformedEnrollments = enrollmentData.gigs
          .filter((gigEnrollment: any) => {
            console.log('🔍 Checking enrollment:', gigEnrollment.gig?._id);
            return gigEnrollment.gig; // Filtrer les enrollments sans gig
          })
          .map((gigEnrollment: any) => {
            console.log('🔄 Transforming enrollment:', gigEnrollment.gig._id);
            console.log('📋 Full gigEnrollment structure:', gigEnrollment);
            console.log('🆔 gigEnrollment._id:', gigEnrollment._id);
            console.log('🆔 gigEnrollment.id:', gigEnrollment.id);
            console.log('🆔 gigEnrollment.gigAgentId:', gigEnrollment.gigAgentId);
            
            // Essayer différentes sources pour l'ID
            const enrollmentId = gigEnrollment._id || gigEnrollment.id || gigEnrollment.gigAgentId;
            console.log('✅ Using enrollmentId:', enrollmentId);
            
            return {
              id: enrollmentId, // ✅ Utiliser l'ID du document GigAgent (enrollmentId)
              gig: {
                _id: gigEnrollment.gig._id,
                title: gigEnrollment.gig.title,
                description: gigEnrollment.gig.description,
                category: gigEnrollment.gig.category,
                destination_zone: gigEnrollment.gig.destination_zone,
                // Copier toutes les autres propriétés du gig (déjà populées)
                ...gigEnrollment.gig
              },
              enrollmentStatus: gigEnrollment.status, // 'enrolled'
              enrollmentDate: gigEnrollment.enrollmentDate,
              enrollmentNotes: gigEnrollment.enrollmentNotes,
              status: gigEnrollment.status,
              matchScore: 0, // Pas de match score dans cette réponse
              matchStatus: 'enrolled'
            };
          });
        
        console.log('✅ Transformed enrolled gigs:', transformedEnrollments);
        console.log('📊 Final count:', transformedEnrollments.length);
        setEnrolledGigs(transformedEnrollments);
      } else {
        console.error('❌ Invalid enrolled gigs data structure:', enrollmentData);
        setEnrolledGigs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching enrolled gigs:', error);
      setEnrolledGigs([]);
    }
  };

  // Fonction pour récupérer les enrollments invités avec données complètes des gigs
  const fetchInvitedEnrollments = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      // Utiliser le nouvel endpoint /gig-agents/agents/{agentId}/gigs?status=invited
      const enrollmentResponse = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=invited`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!enrollmentResponse.ok) {
        throw new Error('Failed to fetch invited enrollments');
      }
      
      const enrollmentData = await enrollmentResponse.json();
      console.log('📋 Invited enrollments response:', enrollmentData);
      console.log('📊 Response count:', enrollmentData.count);
      
      // La réponse contient un objet avec la propriété 'gigs'
      if (enrollmentData.gigs && Array.isArray(enrollmentData.gigs)) {
        console.log('✅ Found invited enrollments:', enrollmentData.gigs.length);
        if (enrollmentData.gigs.length > 0) {
          console.log('🔍 First invited enrollment structure:', JSON.stringify(enrollmentData.gigs[0], null, 2));
          console.log('🔍 First gig structure:', enrollmentData.gigs[0].gig);
          console.log('🆔 Checking IDs in first enrollment:');
          console.log('   - _id:', enrollmentData.gigs[0]._id);
          console.log('   - id:', enrollmentData.gigs[0].id);
          console.log('   - gigAgentId:', enrollmentData.gigs[0].gigAgentId);
          console.log('🏢 CompanyId:', enrollmentData.gigs[0].gig?.companyId);
          console.log('🏭 Industries:', enrollmentData.gigs[0].gig?.industries);
          console.log('📊 Activities:', enrollmentData.gigs[0].gig?.activities);
        }
        
        // Transformer les données pour correspondre à l'interface InvitedEnrollment
        const transformedInvitations = enrollmentData.gigs
          .filter((gigInvitation: any) => {
            console.log('🔍 Checking invitation:', gigInvitation.gig?._id);
            return gigInvitation.gig; // Filtrer les invitations sans gig
          })
          .map((gigInvitation: any) => {
            console.log('🔄 Transforming invitation:', gigInvitation.gig._id);
            console.log('📋 Full gigInvitation structure:', gigInvitation);
            console.log('🆔 gigInvitation._id:', gigInvitation._id);
            console.log('🆔 gigInvitation.id:', gigInvitation.id);
            console.log('🆔 gigInvitation.gigAgentId:', gigInvitation.gigAgentId);
            
            // Essayer différentes sources pour l'ID
            const enrollmentId = gigInvitation._id || gigInvitation.id || gigInvitation.gigAgentId;
            console.log('✅ Using enrollmentId:', enrollmentId);
            
            // Calculer l'expiration basée sur invitationDate + 7 jours (par exemple)
            const invitationDate = new Date(gigInvitation.invitationDate || gigInvitation.updatedAt);
            const expirationDate = new Date(invitationDate);
            expirationDate.setDate(expirationDate.getDate() + 7); // 7 jours pour répondre
            
            return {
              id: enrollmentId, // ✅ Utiliser l'ID du document GigAgent (enrollmentId)
                gig: {
                _id: gigInvitation.gig._id,
                title: gigInvitation.gig.title,
                description: gigInvitation.gig.description,
                category: gigInvitation.gig.category,
                destination_zone: gigInvitation.gig.destination_zone,
                // Copier toutes les autres propriétés du gig (déjà populées)
                ...gigInvitation.gig
              },
              enrollmentStatus: gigInvitation.status, // 'invited'
              invitationSentAt: gigInvitation.invitationDate || gigInvitation.updatedAt,
              invitationExpiresAt: expirationDate.toISOString(),
              isExpired: new Date() > expirationDate,
              canEnroll: gigInvitation.status === 'invited',
              notes: gigInvitation.notes,
              matchScore: 0, // Pas de match score dans cette réponse
              matchStatus: 'invited'
            };
          });
        
        console.log('✅ Transformed invited enrollments:', transformedInvitations);
        setInvitedEnrollments(transformedInvitations);
      } else {
        console.error('Invalid invited enrollments data structure:', enrollmentData);
        setInvitedEnrollments([]);
      }
    } catch (error) {
      console.error('Error fetching invited enrollments:', error);
      setInvitedEnrollments([]);
    }
  };

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    const fetchGigs = async () => {
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/active`;
        console.log('🌐 Fetching active gigs from:', url);
        console.log('🔧 Environment variables:', {
          VITE_BACKEND_URL_GIGS: import.meta.env.VITE_BACKEND_URL_GIGS,
          NODE_ENV: import.meta.env.NODE_ENV
        });
        
        const response = await fetch(url);
        
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: url
          });
          
          // Si l'endpoint /gigs/active ne fonctionne pas, essayer l'ancien endpoint
          console.log('⚠️ Trying fallback to /gigs endpoint...');
          const fallbackResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs`);
          
          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            console.error('❌ Fallback API Error:', {
              status: fallbackResponse.status,
              statusText: fallbackResponse.statusText,
              body: fallbackErrorText
            });
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          console.log('✅ Fallback endpoint working, using /gigs');
          const fallbackData = await fallbackResponse.json();
          console.log('🔍 Received gigs data from fallback:', fallbackData);
          
          if (!fallbackData.data || !Array.isArray(fallbackData.data)) {
            console.error('❌ Invalid fallback data structure:', fallbackData);
            throw new Error('Invalid data structure received from fallback API');
          }

          // Filtrer pour ne garder que les gigs actifs
          const activeGigs = fallbackData.data.filter((gig: PopulatedGig) => gig.status === 'active');
          console.log('🎯 Filtered active gigs:', activeGigs.length, 'out of', fallbackData.data.length);
          
          // Log de la structure comme avant
          if (activeGigs.length > 0) {
            const firstGig = activeGigs[0];
            console.log('📊 STRUCTURE DU PREMIER GIG (FALLBACK):', {
              id: firstGig._id,
              title: firstGig.title,
              companyId: firstGig.companyId,
              industries: firstGig.industries,
              skills: firstGig.skills,
              availability: firstGig.availability,
              status: firstGig.status,
              fullGig: firstGig
            });
          }
          
          setGigs(activeGigs);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Invalid content type:', contentType);
          console.error('Response body:', text);
          throw new Error('Invalid response format: Expected JSON but got ' + contentType);
        }

        const data = await response.json();
        console.log('🔍 Received active gigs data:', data);
        
        if (!data.data || !Array.isArray(data.data)) {
          console.error('❌ Invalid data structure:', data);
          throw new Error('Invalid data structure received from API');
        }

        // Log détaillé de la structure des gigs
        if (data.data.length > 0) {
          const firstGig = data.data[0];
          console.log('📊 STRUCTURE DU PREMIER GIG:', {
            id: firstGig._id,
            title: firstGig.title,
            companyId: firstGig.companyId,
            industries: firstGig.industries,
            skills: firstGig.skills,
            availability: firstGig.availability,
            fullGig: firstGig
          });

          // Log spécifique pour les skills
          if (firstGig.skills) {
            console.log('🛠️ SKILLS STRUCTURE:', {
              technical: firstGig.skills.technical,
              professional: firstGig.skills.professional,
              soft: firstGig.skills.soft,
              languages: firstGig.skills.languages
            });
            
            // Log d'un skill technique si disponible
            if (firstGig.skills.technical && firstGig.skills.technical.length > 0) {
              console.log('🔧 PREMIER SKILL TECHNIQUE:', firstGig.skills.technical[0]);
            }
            
            // Log d'une langue si disponible
            if (firstGig.skills.languages && firstGig.skills.languages.length > 0) {
              console.log('🗣️ PREMIÈRE LANGUE:', firstGig.skills.languages[0]);
            }
          }

          // Log spécifique pour les industries
          if (firstGig.industries) {
            console.log('🏭 INDUSTRIES STRUCTURE:', firstGig.industries);
            if (firstGig.industries.length > 0) {
              console.log('🏢 PREMIÈRE INDUSTRIE:', firstGig.industries[0]);
            }
          }

          // Log de la company
          if (firstGig.companyId) {
            console.log('🏬 COMPANY STRUCTURE:', firstGig.companyId);
          }
        }

        setGigs(data.data);
      } catch (error) {
        console.error('Error fetching gigs:', error);
        setError(error instanceof Error ? error.message : "Impossible de récupérer les gigs.");
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
    
    // Fetch favorites, invited enrollments and enrolled gigs when component mounts
    const agentId = getAgentId();
    if (agentId) {
      fetchFavorites();
      fetchInvitedEnrollments();
      fetchEnrolledGigs();
      fetchPendingRequests();
      fetchEnrolledGigIdsFromProfile(); // Nouveau : récupérer les statuts depuis le profil
    }

    // Écouter les événements de rafraîchissement des statuts
    const handleRefreshStatuses = () => {
      console.log('🔄 Refreshing gig statuses...');
      if (agentId) {
        fetchFavorites();
        fetchInvitedEnrollments();
        fetchEnrolledGigs();
        fetchPendingRequests();
        fetchEnrolledGigIdsFromProfile(); // Nouveau : rafraîchir aussi les statuts du profil
      }
    };

    window.addEventListener('refreshGigStatuses', handleRefreshStatuses);

    // Cleanup
    return () => {
      window.removeEventListener('refreshGigStatuses', handleRefreshStatuses);
    };
  }, []);

  // Filter and sort gigs based on active tab
  const getFilteredAndSortedGigs = () => {
    switch (activeTab) {
      case 'available':
        return gigs
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                return parseInt(b.commission.baseAmount) - parseInt(a.commission.baseAmount);
              case 'experience':
                return parseInt(b.seniority.yearsExperience) - parseInt(a.seniority.yearsExperience);
              case 'latest':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          });
      
      case 'enrolled':
        return enrolledGigs
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                // Pour les gigs inscrits, utiliser les données de base
                return 0; // Pas de tri par salaire pour les gigs inscrits
              case 'experience':
                return 0; // Pas de tri par expérience pour les gigs inscrits
              case 'latest':
              default:
                return new Date(a.enrollmentDate).getTime() - new Date(b.enrollmentDate).getTime();
            }
          });
      
      case 'favorite':
        return gigs
          .filter(gig => favoriteGigs.includes(gig._id))
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                return parseInt(b.commission.baseAmount) - parseInt(a.commission.baseAmount);
              case 'experience':
                return parseInt(b.seniority.yearsExperience) - parseInt(a.seniority.yearsExperience);
              case 'latest':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          });
      
      case 'invited':
        return invitedEnrollments
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                return 0; // Pas de tri par salaire pour les gigs invités
              case 'experience':
                return 0; // Pas de tri par expérience pour les gigs invités
              case 'latest':
              default:
                return new Date(a.invitationSentAt).getTime() - new Date(b.invitationSentAt).getTime();
            }
          });
      
      default:
        return [];
    }
  };

  const filteredAndSortedGigs = getFilteredAndSortedGigs();

  // Pagination logic
  const indexOfLastGig = currentPage * gigsPerPage;
  const indexOfFirstGig = indexOfLastGig - gigsPerPage;
  const currentGigs = filteredAndSortedGigs.slice(indexOfFirstGig, indexOfLastGig);
  const totalPages = Math.ceil(filteredAndSortedGigs.length / gigsPerPage);

  // Log les gigs actuellement affichés pour debug
  console.log('🎯 GIGS ACTUELLEMENT AFFICHÉS:', {
    activeTab,
    totalGigs: gigs.length,
    totalEnrolledGigs: enrolledGigs.length,
    totalInvitedEnrollments: invitedEnrollments.length,
    filteredGigs: filteredAndSortedGigs.length,
    currentGigs: currentGigs.length,
    currentPage,
    totalPages,
    enrolledGigsData: enrolledGigs
  });



  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            Explore exciting opportunities posted by companies worldwide. Find projects that match your skills and interests, and take control of your professional journey. Browse through available gigs and bookmark your favorites for future reference.
          </p>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'available'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Available Gigs
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'enrolled'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Enrolled Gigs
        </button>
        <button
          onClick={() => setActiveTab('favorite')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'favorite'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Favorite Gigs
        </button>
        <button
          onClick={() => setActiveTab('invited')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'invited'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Invited Gigs
        </button>
      </div>

      {activeTab === 'available' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentGigs.map((gig) => {
            const gigStatus = getGigStatus(gig._id);
            return (
          <div key={gig._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{gig.title}</h3>
                <p className="text-xs text-gray-500">{gig.category}</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Status Badge */}
                {gigStatus !== 'none' && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    gigStatus === 'enrolled' ? 'bg-green-100 text-green-700' :
                    gigStatus === 'invited' ? 'bg-blue-100 text-blue-700' :
                    gigStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {gigStatus === 'enrolled' ? '✓ Enrolled' :
                     gigStatus === 'invited' ? '✉ Invited' :
                     gigStatus === 'pending' ? '⏳ Pending' :
                     gigStatus}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {gig.seniority.level}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    favoriteGigs.includes(gig._id)
                      ? removeFromFavorites(gig._id)
                      : addToFavorites(gig._id);
                  }}
                  className={`p-1 rounded-full transition-colors ${
                    favoriteGigs.includes(gig._id)
                      ? 'hover:bg-red-50'
                      : 'hover:bg-gray-100'
                  }`}
                  title={favoriteGigs.includes(gig._id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart 
                    className={`w-5 h-5 ${
                      favoriteGigs.includes(gig._id)
                        ? 'text-red-500 fill-current'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{gig.description}</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center text-sm text-gray-500">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>{gig.commission.baseAmount} {typeof gig.commission.currency === 'object' ? gig.commission.currency?.symbol || gig.commission.currency?.code || 'USD' : gig.commission.currency}/yr base</span>
                {gig.commission.bonus && (
                  <span className="ml-1 text-xs text-green-600">+ bonus</span>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-2" />
                <span>{gig.seniority.yearsExperience} years experience</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Globe className="w-4 h-4 mr-2" />
                <span>{typeof gig.destination_zone === 'object' ? gig.destination_zone?.name?.common || gig.destination_zone?.cca2 || 'Unknown' : gig.destination_zone} ({gig.availability?.time_zone?.zoneName || gig.availability?.time_zone?.countryName || gig.availability?.time_zone?.abbreviation || gig.availability?.time_zone?.name || 'N/A'})</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{gig.availability?.minimumHours?.weekly || 'N/A'}h/week</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <User className="w-4 h-4 mr-2" />
                <span>{gig.companyId?.name || 'Unknown'}</span>
              </div>
            </div>

            <div className="mt-4 flex-grow">
              {/* Industries */}
              {gig.industries && gig.industries.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                  <div className="flex flex-wrap gap-1">
                    {gig.industries.slice(0, 3).map((industry) => (
                      <span key={industry._id} className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                        {industry.name}
                      </span>
                    ))}
                    {gig.industries.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        +{gig.industries.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Activities */}
              {gig.activities && gig.activities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                  <div className="flex flex-wrap gap-1">
                    {gig.activities.slice(0, 3).map((activity) => (
                      <span key={activity._id} className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                        {activity.name}
                      </span>
                    ))}
                    {gig.activities.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        +{gig.activities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons section - conditional based on status */}
            <div className="mt-6">
              {gigStatus === 'enrolled' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.location.href = '/copilot'}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    🚀 Start
                  </button>
                  <button 
                    onClick={() => navigate(`/gig/${gig._id}`)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate(`/gig/${gig._id}`)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        );
        })}
        </div>
      ) : activeTab === 'favorite' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAndSortedGigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-blue-50 rounded-xl p-8 max-w-md w-full text-center">
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  No Favorite Gigs Yet
                </h3>
                <p className="text-blue-600">
                  Browse available gigs and click the heart icon to add them to your favorites.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentGigs.map((gig) => (
                  <div key={gig._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{gig.title}</h3>
                        <p className="text-xs text-gray-500">{gig.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {gig.seniority.level}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeFromFavorites(gig._id);
                          }}
                          className="p-1 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove from favorites"
                        >
                          <Heart className="w-5 h-5 text-red-500 fill-current" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{gig.description}</p>

                                        <div className="mt-4 space-y-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>{gig.commission.baseAmount} {typeof gig.commission.currency === 'object' ? gig.commission.currency?.symbol || gig.commission.currency?.code || 'USD' : gig.commission.currency}/yr base</span>
                        {gig.commission.bonus && (
                          <span className="ml-1 text-xs text-green-600">+ bonus</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{gig.seniority.yearsExperience} years experience</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Globe className="w-4 h-4 mr-2" />
                        <span>{typeof gig.destination_zone === 'object' ? gig.destination_zone?.name?.common || gig.destination_zone?.cca2 || 'Unknown' : gig.destination_zone} ({gig.availability?.time_zone?.zoneName || gig.availability?.time_zone?.countryName || gig.availability?.time_zone?.abbreviation || gig.availability?.time_zone?.name || 'N/A'})</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{gig.availability?.minimumHours?.weekly || 'N/A'}h/week</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-2" />
                        <span>{gig.companyId?.name || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex-grow">
                      {/* Industries */}
                      {gig.industries && gig.industries.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                          <div className="flex flex-wrap gap-1">
                            {gig.industries.slice(0, 3).map((industry) => (
                              <span key={industry._id} className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                                {industry.name}
                              </span>
                            ))}
                            {gig.industries.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{gig.industries.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activities */}
                      {gig.activities && gig.activities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-1">
                            {gig.activities.slice(0, 3).map((activity) => (
                              <span key={activity._id} className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                                {activity.name}
                              </span>
                            ))}
                            {gig.activities.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{gig.activities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => navigate(`/gig/${gig._id}`)}
                      className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'invited' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invitedEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-blue-50 rounded-xl p-8 max-w-md w-full text-center">
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  No Invitations Yet
                </h3>
                <p className="text-blue-600">
                  You haven't received any gig invitations yet. Keep your profile updated to increase your chances of being invited to exciting opportunities.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {invitedEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{enrollment.gig.title}</h3>
                        <p className="text-xs text-gray-500">{enrollment.gig.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Invited
                        </span>
                        {('seniority' in enrollment.gig && enrollment.gig.seniority?.level) && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {enrollment.gig.seniority.level}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            favoriteGigs.includes(enrollment.gig._id)
                              ? removeFromFavorites(enrollment.gig._id)
                              : addToFavorites(enrollment.gig._id);
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            favoriteGigs.includes(enrollment.gig._id)
                              ? 'hover:bg-red-50'
                              : 'hover:bg-gray-100'
                          }`}
                          title={favoriteGigs.includes(enrollment.gig._id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart 
                            className={`w-5 h-5 ${
                              favoriteGigs.includes(enrollment.gig._id)
                                ? 'text-red-500 fill-current'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{enrollment.gig.description}</p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>{('commission' in enrollment.gig && enrollment.gig.commission?.baseAmount) ? `${enrollment.gig.commission.baseAmount} ${typeof enrollment.gig.commission.currency === 'object' ? enrollment.gig.commission.currency?.symbol || enrollment.gig.commission.currency?.code || 'EUR' : enrollment.gig.commission.currency || 'EUR'}/yr base` : 'N/A EUR/yr base'}</span>
                        {('commission' in enrollment.gig && enrollment.gig.commission?.bonus) && (
                          <span className="ml-1 text-xs text-green-600">+ bonus</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{('seniority' in enrollment.gig && enrollment.gig.seniority?.yearsExperience) ? `${enrollment.gig.seniority.yearsExperience} years experience` : 'N/A years experience'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Globe className="w-4 h-4 mr-2" />
                        <span>{typeof enrollment.gig.destination_zone === 'object' ? enrollment.gig.destination_zone?.name?.common || enrollment.gig.destination_zone?.cca2 || 'Unknown' : enrollment.gig.destination_zone} ({('availability' in enrollment.gig && enrollment.gig.availability?.time_zone?.zoneName) ? enrollment.gig.availability.time_zone.zoneName : ('availability' in enrollment.gig && enrollment.gig.availability?.time_zone?.countryName) ? enrollment.gig.availability.time_zone.countryName : ('availability' in enrollment.gig && enrollment.gig.availability?.time_zone?.abbreviation) ? enrollment.gig.availability.time_zone.abbreviation : 'N/A'})</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{('availability' in enrollment.gig && enrollment.gig.availability?.minimumHours?.weekly) ? `${enrollment.gig.availability.minimumHours.weekly}h/week` : 'N/A h/week'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-2" />
                        <span>{('companyId' in enrollment.gig && enrollment.gig.companyId?.name) ? enrollment.gig.companyId.name : 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex-grow">
                      {/* Industries */}
                      {('industries' in enrollment.gig && enrollment.gig.industries && enrollment.gig.industries.length > 0) ? (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                          <div className="flex flex-wrap gap-1">
                            {enrollment.gig.industries.slice(0, 3).map((industry) => (
                              <span key={industry._id} className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                                {industry.name}
                              </span>
                            ))}
                            {enrollment.gig.industries.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{enrollment.gig.industries.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                              N/A
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Activities */}
                      {('activities' in enrollment.gig && enrollment.gig.activities && enrollment.gig.activities.length > 0) ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-1">
                            {enrollment.gig.activities.slice(0, 3).map((activity) => (
                              <span key={activity._id} className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                                {activity.name}
                              </span>
                            ))}
                            {enrollment.gig.activities.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{enrollment.gig.activities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                              N/A
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <button 
                        onClick={() => acceptInvitation(enrollment.id)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      
                      <button 
                        onClick={() => rejectInvitation(enrollment.id)}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                      
                      <button 
                        onClick={() => navigate(`/gig/${enrollment.gig._id}`)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'enrolled' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : enrolledGigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="bg-blue-50 rounded-xl p-8 max-w-md w-full text-center">
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  No Enrolled Gigs Yet
                </h3>
                <p className="text-blue-600">
                  You haven't enrolled in any gigs yet. Accept invitations from the "Invited Gigs" tab to get started!
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {enrolledGigs.map((enrolledGig) => (
                  <div key={enrolledGig.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{enrolledGig.gig.title}</h3>
                        <p className="text-xs text-gray-500">{enrolledGig.gig.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Enrolled
                        </span>
                        {('seniority' in enrolledGig.gig && enrolledGig.gig.seniority?.level) && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {enrolledGig.gig.seniority.level}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            favoriteGigs.includes(enrolledGig.gig._id)
                              ? removeFromFavorites(enrolledGig.gig._id)
                              : addToFavorites(enrolledGig.gig._id);
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            favoriteGigs.includes(enrolledGig.gig._id)
                              ? 'hover:bg-red-50'
                              : 'hover:bg-gray-100'
                          }`}
                          title={favoriteGigs.includes(enrolledGig.gig._id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart 
                            className={`w-5 h-5 ${
                              favoriteGigs.includes(enrolledGig.gig._id)
                                ? 'text-red-500 fill-current'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{enrolledGig.gig.description}</p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>{('commission' in enrolledGig.gig && enrolledGig.gig.commission?.baseAmount) ? `${enrolledGig.gig.commission.baseAmount} ${typeof enrolledGig.gig.commission.currency === 'object' ? enrolledGig.gig.commission.currency?.symbol || enrolledGig.gig.commission.currency?.code || 'EUR' : enrolledGig.gig.commission.currency || 'EUR'}/yr base` : 'N/A EUR/yr base'}</span>
                        {('commission' in enrolledGig.gig && enrolledGig.gig.commission?.bonus) && (
                          <span className="ml-1 text-xs text-green-600">+ bonus</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{('seniority' in enrolledGig.gig && enrolledGig.gig.seniority?.yearsExperience) ? `${enrolledGig.gig.seniority.yearsExperience} years experience` : 'N/A years experience'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Globe className="w-4 h-4 mr-2" />
                        <span>{typeof enrolledGig.gig.destination_zone === 'object' ? enrolledGig.gig.destination_zone?.name?.common || enrolledGig.gig.destination_zone?.cca2 || 'Unknown' : enrolledGig.gig.destination_zone} ({('availability' in enrolledGig.gig && enrolledGig.gig.availability?.time_zone?.zoneName) ? enrolledGig.gig.availability.time_zone.zoneName : ('availability' in enrolledGig.gig && enrolledGig.gig.availability?.time_zone?.countryName) ? enrolledGig.gig.availability.time_zone.countryName : ('availability' in enrolledGig.gig && enrolledGig.gig.availability?.time_zone?.abbreviation) ? enrolledGig.gig.availability.time_zone.abbreviation : 'N/A'})</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{('availability' in enrolledGig.gig && enrolledGig.gig.availability?.minimumHours?.weekly) ? `${enrolledGig.gig.availability.minimumHours.weekly}h/week` : 'N/A h/week'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-2" />
                        <span>{('companyId' in enrolledGig.gig && enrolledGig.gig.companyId?.name) ? enrolledGig.gig.companyId.name : 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex-grow">
                      {/* Industries */}
                      {('industries' in enrolledGig.gig && enrolledGig.gig.industries && enrolledGig.gig.industries.length > 0) ? (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                          <div className="flex flex-wrap gap-1">
                            {enrolledGig.gig.industries.slice(0, 3).map((industry) => (
                              <span key={industry._id} className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                                {industry.name}
                              </span>
                            ))}
                            {enrolledGig.gig.industries.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{enrolledGig.gig.industries.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                              N/A
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Activities */}
                      {('activities' in enrolledGig.gig && enrolledGig.gig.activities && enrolledGig.gig.activities.length > 0) ? (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-1">
                            {enrolledGig.gig.activities.slice(0, 3).map((activity) => (
                              <span key={activity._id} className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                                {activity.name}
                              </span>
                            ))}
                            {enrolledGig.gig.activities.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                +{enrolledGig.gig.activities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-green-100 rounded-full text-xs text-green-700">
                              N/A
                            </span>
                          </div>
                        </div>
                      )}


                    </div>

                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => navigate('/copilot')}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        🚀 Start
                      </button>
                      <button 
                        onClick={() => navigate(`/gig/${enrolledGig.gig._id}`)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="bg-blue-50 rounded-xl p-8 max-w-md w-full text-center">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Enrolled Gigs Coming Soon!
            </h3>
            <p className="text-blue-600">
              We're working on bringing you a dedicated space to manage your enrolled gigs. Stay tuned for updates!
            </p>
          </div>
        </div>
      )}

      {/* Pagination Controls - Only show for Available Gigs */}
      {activeTab === 'available' && (
        <div className="flex justify-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Previous
          </button>
          <div className="flex items-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}