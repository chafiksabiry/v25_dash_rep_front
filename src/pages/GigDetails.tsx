import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, Globe, Calendar, User, Building, MapPin, Clock, Target, Star } from 'lucide-react';
import { getAgentId, getAuthToken } from '../utils/authUtils';

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

export function GigDetails() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<PopulatedGig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!gigId) {
        setError('Gig ID not provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching gig details for ID:', gigId);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${gigId}`);
        
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
          setGig(data.data);
        } else if (data.data) {
          setGig(data.data);
        } else {
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
      <div className="max-w-4xl mx-auto px-6">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/gigs-marketplace')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Marketplace
          </button>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{gig.title}</h1>
                <p className="text-lg text-gray-600">{gig.category}</p>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 mt-2">
                  {gig.seniority.level}
                </span>
              </div>
              {gig.companyId?.logo && (
                <img 
                  src={gig.companyId.logo} 
                  alt={gig.companyId.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{gig.commission.baseAmount} {gig.commission.currency}/yr</p>
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
                  <p className="text-sm font-medium">{gig.destination_zone}</p>
                  <p className="text-xs">{gig.availability?.time_zone?.abbreviation || 'Timezone'}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                      {gig.skills.technical.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-800">
                          {skill.skill?.name || skill.details} {skill.level > 0 && `(Level ${skill.level})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {gig.skills.professional?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Professional Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.professional.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 rounded-full text-sm text-green-800">
                          {skill.skill?.name || skill.details} {skill.level > 0 && `(Level ${skill.level})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {gig.skills.soft?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.soft.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 rounded-full text-sm text-purple-800">
                          {skill.skill?.name || skill.details} {skill.level > 0 && `(Level ${skill.level})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {gig.skills.languages?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.languages.map((lang, i) => (
                        <span key={i} className="px-3 py-1 bg-yellow-100 rounded-full text-sm text-yellow-800">
                          {lang.language?.name || lang.iso639_1?.toUpperCase()} ({lang.proficiency})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activities */}
            {gig.activities?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.activities.map((activity) => (
                    <span key={activity._id} className="px-3 py-1 bg-orange-100 rounded-full text-sm text-orange-800">
                      {activity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Commission Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Compensation</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Salary:</span>
                  <span className="font-medium">{gig.commission.baseAmount} {gig.commission.currency}/year</span>
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
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Building className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="font-medium">{gig.companyId?.name || 'Unknown'}</span>
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
                {gig.companyId?.founded && (
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                    <span>Founded {gig.companyId.founded}</span>
                  </div>
                )}
              </div>
              
              {gig.companyId?.overview && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">About</h3>
                  <p className="text-sm text-gray-600">{gig.companyId.overview}</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            {gig.availability?.schedule?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule</h2>
                <div className="space-y-2">
                  {gig.availability.schedule.map((schedule, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-medium">{schedule.day}</span>
                      <span className="text-gray-600">{schedule.hours.start} - {schedule.hours.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Apply Now
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Click to submit your application for this position
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}