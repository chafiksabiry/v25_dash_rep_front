import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Star, Users, MessageSquare, CheckCircle, XCircle, Globe, Calendar, Mail } from 'lucide-react';

export function GigsMarketplace() {
  interface Gig {
    _id: string;
    companyId: string;
    companyName: string;
    title: string;
    description: string;
    industry: string;
    requiredSkills: string[];
    preferredLanguages: string[];
    requiredExperience: number;
    expectedConversionRate: number;
    compensation: {
      base: number;
      commission: number;
    };
    duration: {
      startDate: string;
      endDate: string;
    };
    timezone: string;
    targetRegion: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }

  interface InvitedGig extends Gig {
    invitationId: string;
    invitationStatus: 'pending' | 'accepted' | 'declined';
    invitedAt: string;
  }

  const [activeTab, setActiveTab] = useState('available');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [invitedGigs, setInvitedGigs] = useState<InvitedGig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All Industries');
  const [sortBy, setSortBy] = useState<string>('Sort by: Latest');

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

    const fetchInvitedGigs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_MATCH_API_URL}/gig-agents/invitations`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch invited gigs: ${response.status}`);
        }

        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setInvitedGigs(data.data);
        }
      } catch (error) {
        console.error('Error fetching invited gigs:', error);
      }
    };

    fetchGigs();
    fetchInvitedGigs();
  }, []);

  const handleInvitationResponse = async (invitationId: string, status: 'accepted' | 'declined') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_MATCH_API_URL}/gig-agents/invitations/${invitationId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to respond to invitation: ${response.status}`);
      }

      // Update local state
      setInvitedGigs(prev => prev.map(gig => 
        gig.invitationId === invitationId 
          ? { ...gig, invitationStatus: status }
          : gig
      ));

      // If accepted, move to active gigs
      if (status === 'accepted') {
        const acceptedGig = invitedGigs.find(gig => gig.invitationId === invitationId);
        if (acceptedGig) {
          setGigs(prev => [...prev, { ...acceptedGig, status: 'in-progress' }]);
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      setError('Failed to respond to invitation');
    }
  };

  // Get unique industries from gigs
  const industries = ['All Industries', ...new Set(gigs.map(gig => gig.industry))];

  // Filter and sort gigs
  const filteredAndSortedGigs = gigs
    .filter(gig => {
      // Filter by status
      const statusMatch = activeTab === 'available' ? gig.status === 'open' : gig.status === 'in-progress';
      // Filter by industry
      const industryMatch = selectedIndustry === 'All Industries' || gig.industry === selectedIndustry;
      return statusMatch && industryMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Sort by: Base Salary':
          return b.compensation.base - a.compensation.base;
        case 'Sort by: Experience':
          return b.requiredExperience - a.requiredExperience;
        case 'Sort by: Latest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Filter invited gigs
  const filteredInvitedGigs = invitedGigs
    .filter(gig => {
      const industryMatch = selectedIndustry === 'All Industries' || gig.industry === selectedIndustry;
      return industryMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Sort by: Base Salary':
          return b.compensation.base - a.compensation.base;
        case 'Sort by: Experience':
          return b.requiredExperience - a.requiredExperience;
        case 'Sort by: Latest':
        default:
          return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
      }
    });

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
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
          >
            {industries.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          <select 
            className="border border-gray-200 rounded-lg px-4 py-2 bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Sort by: Latest">Sort by: Latest</option>
            <option value="Sort by: Base Salary">Sort by: Base Salary</option>
            <option value="Sort by: Experience">Sort by: Experience</option>
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
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Gigs
        </button>
        <button
          onClick={() => setActiveTab('invited')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'invited'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Invited Gigs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeTab === 'invited' ? (
          // Display invited gigs
          filteredInvitedGigs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invited Gigs</h3>
              <p className="text-gray-500">You haven't received any gig invitations yet.</p>
            </div>
          ) : (
          filteredInvitedGigs.map((gig) => (
            <div key={gig.invitationId} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                  <p className="text-sm text-gray-500">{gig.companyName}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    gig.industry === 'Technology' ? 'bg-blue-100 text-blue-700' :
                    gig.industry === 'Healthcare' ? 'bg-green-100 text-green-700' :
                    gig.industry === 'Finance' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {gig.industry}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gig.invitationStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    gig.invitationStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {gig.invitationStatus === 'pending' ? 'Pending' :
                     gig.invitationStatus === 'accepted' ? 'Accepted' : 'Declined'}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{gig.description}</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>${gig.compensation.base}/hr + {gig.compensation.commission}% commission</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{gig.requiredExperience}+ years experience</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>{gig.targetRegion} ({gig.timezone})</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(gig.duration.startDate).toLocaleDateString()} - {new Date(gig.duration.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>Invited: {new Date(gig.invitedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {gig.requiredSkills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Languages:</p>
                <div className="flex flex-wrap gap-2">
                  {gig.preferredLanguages.map((lang, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 rounded-full text-xs text-blue-600">
                      {lang}
                    </span>
                ))}
              </div>
            </div>

            {gig.invitationStatus === 'pending' && (
              <div className="mt-6 flex space-x-3">
                <button 
                  onClick={() => handleInvitationResponse(gig.invitationId, 'accepted')}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </button>
                <button 
                  onClick={() => handleInvitationResponse(gig.invitationId, 'declined')}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </button>
              </div>
            )}

            {gig.invitationStatus !== 'pending' && (
              <div className="mt-6">
                <div className={`w-full py-2 px-4 rounded-lg text-center font-medium ${
                  gig.invitationStatus === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {gig.invitationStatus === 'accepted' ? 'Invitation Accepted' : 'Invitation Declined'}
                </div>
              </div>
            )}
          </div>
        ))
          )
        ) : (
          // Display regular gigs
          filteredAndSortedGigs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto text-gray-400 mb-4">
                {activeTab === 'available' ? '📋' : '⚡'}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'available' ? 'No Available Gigs' : 'No Active Gigs'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'available' 
                  ? 'There are no gigs available at the moment.' 
                  : 'You don\'t have any active gigs yet.'}
              </p>
            </div>
          ) : (
          filteredAndSortedGigs.map((gig) => (
            <div key={gig._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                  <p className="text-sm text-gray-500">{gig.companyName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  gig.industry === 'Technology' ? 'bg-blue-100 text-blue-700' :
                  gig.industry === 'Healthcare' ? 'bg-green-100 text-green-700' :
                  gig.industry === 'Finance' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {gig.industry}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{gig.description}</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>${gig.compensation.base}/hr + {gig.compensation.commission}% commission</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{gig.requiredExperience}+ years experience</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>{gig.targetRegion} ({gig.timezone})</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(gig.duration.startDate).toLocaleDateString()} - {new Date(gig.duration.endDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {gig.requiredSkills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Languages:</p>
                <div className="flex flex-wrap gap-2">
                  {gig.preferredLanguages.map((lang, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 rounded-full text-xs text-blue-600">
                      {lang}
                  </span>
                ))}
              </div>
            </div>

            <button className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              {activeTab === 'available' ? 'Apply Now' : 'View Details'}
            </button>
          </div>
        ))
          )
        )}
      </div>
    </div>
  );
}