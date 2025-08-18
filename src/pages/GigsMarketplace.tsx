import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Star, Users, MessageSquare, CheckCircle, XCircle, Globe, Calendar, Mail, Heart, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { enrollmentApi, Enrollment } from '../services/api/enrollment';
import { EnrollmentCard } from '../components/EnrollmentCard';

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

  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All Industries');
  const [sortBy, setSortBy] = useState<string>('Sort by: Latest');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [acceptNotes, setAcceptNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch gigs
        const gigsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs`);
        if (!gigsResponse.ok) {
          throw new Error(`API Error: ${gigsResponse.status} ${gigsResponse.statusText}`);
        }
        const gigsData = await gigsResponse.json();
        setGigs(gigsData.data || []);

        // Fetch enrollments if user is authenticated
        if (currentUser?.id) {
          try {
            const enrollmentsData = await enrollmentApi.getAgentEnrollments(currentUser.id);
            setEnrollments(enrollmentsData.enrollments || []);
          } catch (enrollmentError) {
            console.warn('Could not fetch enrollments:', enrollmentError);
            setEnrollments([]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : "Impossible de récupérer les données.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  // Get unique industries from gigs
  const industries = ['All Industries', ...new Set(gigs.map(gig => gig.industry))];

  // Filter and sort gigs based on active tab
  const getFilteredAndSortedGigs = () => {
    let filteredGigs: Gig[] = [];

    switch (activeTab) {
      case 'available':
        filteredGigs = gigs.filter(gig => gig.status === 'open');
        break;
      case 'enrolled':
        // Get gigs from accepted enrollments
        const enrolledGigIds = enrollments
          .filter(e => e.enrollmentStatus === 'accepted')
          .map(e => e.gig._id);
        filteredGigs = gigs.filter(gig => enrolledGigIds.includes(gig._id));
        break;
      case 'favorites':
        // For now, show empty state - favorites functionality can be added later
        filteredGigs = [];
        break;
      case 'invited':
        // Get gigs from invited enrollments
        const invitedGigIds = enrollments
          .filter(e => e.enrollmentStatus === 'invited')
          .map(e => e.gig._id);
        filteredGigs = gigs.filter(gig => invitedGigIds.includes(gig._id));
        break;
      default:
        filteredGigs = gigs;
    }

    // Apply industry filter
    if (selectedIndustry !== 'All Industries') {
      filteredGigs = filteredGigs.filter(gig => gig.industry === selectedIndustry);
    }

    // Apply sorting
    return filteredGigs.sort((a, b) => {
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
  };

  const filteredAndSortedGigs = getFilteredAndSortedGigs();

  // Handle enrollment actions
  const handleAcceptEnrollment = async () => {
    if (!selectedEnrollment) return;
    
    try {
      await enrollmentApi.acceptEnrollment(selectedEnrollment.id, acceptNotes);
      
      // Update local state
      setEnrollments(prev => prev.map(e => 
        e.id === selectedEnrollment.id 
          ? { ...e, enrollmentStatus: 'accepted' as const }
          : e
      ));
      
      setShowAcceptModal(false);
      setSelectedEnrollment(null);
      setAcceptNotes('');
    } catch (error) {
      console.error('Error accepting enrollment:', error);
      alert('Erreur lors de l\'acceptation de l\'invitation');
    }
  };

  const handleRejectEnrollment = async () => {
    if (!selectedEnrollment) return;
    
    try {
      await enrollmentApi.rejectEnrollment(selectedEnrollment.id, rejectNotes);
      
      // Update local state
      setEnrollments(prev => prev.map(e => 
        e.id === selectedEnrollment.id 
          ? { ...e, enrollmentStatus: 'rejected' as const }
          : e
      ));
      
      setShowRejectModal(false);
      setSelectedEnrollment(null);
      setRejectNotes('');
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      alert('Erreur lors du refus de l\'invitation');
    }
  };

  const openAcceptModal = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowAcceptModal(true);
  };

  const openRejectModal = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowRejectModal(true);
  };

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
          onClick={() => setActiveTab('enrolled')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'enrolled'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          Enrolled Gigs
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'favorites'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-2" />
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
          <Mail className="w-4 h-4 inline mr-2" />
          Invited Gigs
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'invited' ? (
        // Invited Gigs Section
        <div className="space-y-4">
          {enrollments.filter(e => e.enrollmentStatus === 'invited').length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune invitation en attente</h3>
              <p className="text-gray-500">Vous n'avez pas encore reçu d'invitations pour des gigs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {enrollments
                .filter(e => e.enrollmentStatus === 'invited')
                .map((enrollment) => (
                  <EnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onAccept={openAcceptModal}
                    onReject={openRejectModal}
                  />
                ))}
            </div>
          )}
        </div>
      ) : activeTab === 'enrolled' ? (
        // Enrolled Gigs Section
        <div className="space-y-4">
          {enrollments.filter(e => e.enrollmentStatus === 'accepted').length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun gig enrôlé</h3>
              <p className="text-gray-500">Vous n'avez pas encore accepté d'invitations pour des gigs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {enrollments
                .filter(e => e.enrollmentStatus === 'accepted')
                .map((enrollment) => (
                  <EnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    onAccept={() => {}} // No action needed for accepted enrollments
                    onReject={() => {}} // No action needed for accepted enrollments
                  />
                ))}
            </div>
          )}
        </div>
      ) : activeTab === 'favorites' ? (
        // Favorite Gigs Section (placeholder)
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fonctionnalité des favoris à venir</h3>
          <p className="text-gray-500">Vous pourrez bientôt marquer vos gigs préférés et les retrouver ici.</p>
        </div>
      ) : (
        // Default gigs display
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedGigs.map((gig) => (
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
          ))}
        </div>
      )}

      {/* Accept Enrollment Modal */}
      {showAcceptModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Accepter l'invitation</h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir accepter l'invitation pour "{selectedEnrollment.gig.title}" ?
            </p>
            <textarea
              placeholder="Notes optionnelles..."
              value={acceptNotes}
              onChange={(e) => setAcceptNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 resize-none"
              rows={3}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleAcceptEnrollment}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              >
                Accepter
              </button>
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setSelectedEnrollment(null);
                  setAcceptNotes('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Enrollment Modal */}
      {showRejectModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Refuser l'invitation</h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir refuser l'invitation pour "{selectedEnrollment.gig.title}" ?
            </p>
            <textarea
              placeholder="Raison du refus (optionnel)..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 resize-none"
              rows={3}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleRejectEnrollment}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Refuser
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedEnrollment(null);
                  setRejectNotes('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}