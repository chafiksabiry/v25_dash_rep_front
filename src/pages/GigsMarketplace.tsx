import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Globe, Calendar, Heart, User, Mail, Clock } from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';

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

    destination_zone: string;
    
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

    status: 'to_activate' | 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }

  // Interface pour les enrollments invités
  interface InvitedEnrollment {
    id: string;
    gig: {
      _id: string;
      title: string;
      description: string;
      category: string;
      destination_zone: string;
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

  const [activeTab, setActiveTab] = useState<'available' | 'enrolled' | 'favorite' | 'invited'>('available');
  const [gigs, setGigs] = useState<PopulatedGig[]>([]);
  const [invitedEnrollments, setInvitedEnrollments] = useState<InvitedEnrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [gigsPerPage] = useState(9);
  const [sortBy] = useState<'latest' | 'salary' | 'experience'>('latest');
  const [favoriteGigs, setFavoriteGigs] = useState<string[]>([]);



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
      if (!response.ok) throw new Error('Failed to add to favorites');
      setFavoriteGigs(prev => [...prev, gigId]);
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
      if (!response.ok) throw new Error('Failed to remove from favorites');
      setFavoriteGigs(prev => prev.filter(id => id !== gigId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  // Fonction pour récupérer les enrollments invités
  const fetchInvitedEnrollments = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/enrollment/agent/${agentId}?status=invited`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch invited enrollments');
      }
      
      const data = await response.json();
      console.log('Invited enrollments response:', data);
      
      if (data.enrollments && Array.isArray(data.enrollments)) {
        setInvitedEnrollments(data.enrollments);
      } else {
        console.error('Invalid invited enrollments data structure:', data);
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
    
    // Fetch favorites and invited enrollments when component mounts
    const agentId = getAgentId();
    if (agentId) {
      fetchFavorites();
      fetchInvitedEnrollments();
    }
  }, []);

  // Filter and sort gigs
  const filteredAndSortedGigs = gigs
    .filter(gig => {
      switch (activeTab) {
        case 'available':
          // Tous les gigs sont déjà actifs depuis l'endpoint /gigs/active
          return true;
        case 'enrolled':
          // TODO: Add enrolled gigs logic
          return false;
        case 'favorite':
          console.log('Checking if gig is favorite:', {
            gigId: gig._id,
            favoriteGigs,
            isFavorite: favoriteGigs.includes(gig._id)
          });
          return favoriteGigs.includes(gig._id);
        default:
          return false;
      }
    })
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

  // Pagination logic
  const indexOfLastGig = currentPage * gigsPerPage;
  const indexOfFirstGig = indexOfLastGig - gigsPerPage;
  const currentGigs = filteredAndSortedGigs.slice(indexOfFirstGig, indexOfLastGig);
  const totalPages = Math.ceil(filteredAndSortedGigs.length / gigsPerPage);

  // Log les gigs actuellement affichés pour debug
  console.log('🎯 GIGS ACTUELLEMENT AFFICHÉS:', {
    activeTab,
    totalGigs: gigs.length,
    filteredGigs: filteredAndSortedGigs.length,
    currentGigs: currentGigs.length,
    currentGigsData: currentGigs.map(gig => ({
      id: gig._id,
      title: gig.title,
      company: gig.companyId?.name,
      industries: gig.industries?.map(ind => ind.name || ind),
      technicalSkills: gig.skills?.technical?.map(skill => ({
        name: skill.skill?.name,
        details: skill.details,
        level: skill.level,
        fullSkill: skill
      })),
      languages: gig.skills?.languages?.map(lang => ({
        name: lang.language?.name,
        iso: lang.iso639_1,
        proficiency: lang.proficiency,
        fullLang: lang
      }))
    }))
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
                <span>{gig.commission.baseAmount} {gig.commission.currency}/yr base</span>
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
                <span>{gig.destination_zone} ({gig.availability?.time_zone?.abbreviation || gig.availability?.time_zone?.name || 'N/A'})</span>
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
                        <span>{gig.commission.baseAmount} {gig.commission.currency}/yr base</span>
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
                        <span>{gig.destination_zone} ({gig.availability?.time_zone?.abbreviation || gig.availability?.time_zone?.name || 'N/A'})</span>
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
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Invited
                        </span>
                        {enrollment.isExpired && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{enrollment.gig.description}</p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <Globe className="w-4 h-4 mr-2" />
                        <span>{enrollment.gig.destination_zone}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>Invited on {new Date(enrollment.invitationSentAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Expires on {new Date(enrollment.invitationExpiresAt).toLocaleDateString()}</span>
                      </div>

                      {enrollment.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> {enrollment.notes}
                          </p>
                        </div>
                      )}

                      {enrollment.matchScore && (
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="px-2 py-1 bg-purple-100 rounded-full text-xs text-purple-700">
                            Match Score: {enrollment.matchScore}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                      {enrollment.canEnroll && !enrollment.isExpired ? (
                        <button 
                          onClick={() => navigate(`/gig/${enrollment.gig._id}`)}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Accept Invitation
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/gig/${enrollment.gig._id}`)}
                          className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed"
                          disabled
                        >
                          {enrollment.isExpired ? 'Invitation Expired' : 'Cannot Enroll'}
                        </button>
                      )}
                      
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