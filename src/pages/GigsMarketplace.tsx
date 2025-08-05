import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Globe, Calendar } from 'lucide-react';

export function GigsMarketplace() {
  interface Skill {
    level: number;
    details: string;
    _id: string;
  }

  interface Language {
    proficiency: string;
    iso639_1: string;
    _id: string;
  }

  interface Schedule {
    hours: {
      start: string;
      end: string;
    };
    day: string;
    _id: string;
  }

  interface Commission {
    base: string;
    baseAmount: string;
    currency: string;
    bonus?: string;
    bonusAmount?: string;
    structure?: string;
  }

  interface Gig {
    _id: string;
    title: string;
    description: string;
    category: string;
    userId: string | null;
    companyId: string | null;
    destination_zone: string;
    status: 'to_activate' | 'active' | 'inactive' | 'archived';
    seniority: {
      level: string;
      yearsExperience: string;
    };
    skills: {
      professional: Skill[];
      technical: Skill[];
      soft: Skill[];
      languages: Language[];
    };
    availability: {
      minimumHours: {
        daily: number;
        weekly: number;
        monthly: number;
      };
      schedule: Schedule[];
      timeZone: string;
      flexibility: string[];
    };
    commission: Commission;
    createdAt: string;
    updatedAt: string;
  }

  const [activeTab, setActiveTab] = useState<'available' | 'enrolled' | 'favorite'>('available');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [gigsPerPage] = useState(9);
  const [sortBy, setSortBy] = useState<'latest' | 'salary' | 'experience'>('latest');

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        console.log('Fetching gigs from:', `${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs`);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Invalid content type:', contentType);
          console.error('Response body:', text);
          throw new Error('Invalid response format: Expected JSON but got ' + contentType);
        }

        const data = await response.json();
        console.log('Received gigs data:', data);
        
        if (!data.data || !Array.isArray(data.data)) {
          console.error('Invalid data structure:', data);
          throw new Error('Invalid data structure received from API');
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
  }, []);

  // Filter and sort gigs
  const filteredAndSortedGigs = gigs
    .filter(gig => {
      switch (activeTab) {
        case 'available':
          return gig.status === 'active';
        case 'enrolled':
          // TODO: Add enrolled gigs logic
          return false;
        case 'favorite':
          // TODO: Add favorite gigs logic
          return false;
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gigs</h1>
        <div className="flex space-x-3">
          <select 
            className="border border-gray-200 rounded-lg px-4 py-2 bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'salary' | 'experience')}
          >
            <option value="latest">Sort by: Latest</option>
            <option value="salary">Sort by: Base Salary</option>
            <option value="experience">Sort by: Experience</option>
          </select>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentGigs.map((gig) => (
          <div key={gig._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                <p className="text-sm text-gray-500">{gig.category}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {gig.seniority.level}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{gig.description}</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center text-sm text-gray-500">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>{gig.commission.baseAmount} {gig.commission.currency}/yr base</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-2" />
                <span>{gig.seniority.yearsExperience} experience</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Globe className="w-4 h-4 mr-2" />
                <span>{gig.destination_zone} ({gig.availability.timeZone})</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{gig.availability.minimumHours.weekly}h/week</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Technical Skills:</p>
              <div className="flex flex-wrap gap-2">
                {gig.skills.technical.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    {skill.details} (Level {skill.level})
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Languages:</p>
              <div className="flex flex-wrap gap-2">
                {gig.skills.languages.map((lang, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 rounded-full text-xs text-blue-600">
                    {lang.iso639_1.toUpperCase()} ({lang.proficiency})
                  </span>
                ))}
              </div>
            </div>

            <button className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              {activeTab === 'available' ? 'Apply Now' : 'View Details'}
            </button>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
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
    </div>
  );
}