import React from 'react';
import { DollarSign, Users, Globe, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Enrollment } from '../services/api/enrollment';

interface EnrollmentCardProps {
  enrollment: Enrollment;
  onAccept: (enrollment: Enrollment) => void;
  onReject: (enrollment: Enrollment) => void;
}

export const EnrollmentCard: React.FC<EnrollmentCardProps> = ({
  enrollment,
  onAccept,
  onReject
}) => {
  const isExpired = enrollment.isExpired;
  const canEnroll = enrollment.canEnroll;

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border ${
      isExpired ? 'border-red-200 bg-red-50' : 'border-gray-100'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{enrollment.gig.title}</h3>
          <p className="text-sm text-gray-500">{enrollment.gig.companyName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isExpired 
            ? 'bg-red-100 text-red-700' 
            : enrollment.enrollmentStatus === 'invited'
            ? 'bg-yellow-100 text-yellow-700'
            : enrollment.enrollmentStatus === 'accepted'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {isExpired ? 'Expired' : enrollment.enrollmentStatus}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{enrollment.gig.description}</p>

      <div className="mt-4 space-y-3">
        <div className="flex items-center text-sm text-gray-500">
          <DollarSign className="w-4 h-4 mr-2" />
          <span>${enrollment.gig.compensation.base}/hr + {enrollment.gig.compensation.commission}% commission</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Users className="w-4 h-4 mr-2" />
          <span>{enrollment.gig.requiredExperience}+ years experience</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Globe className="w-4 h-4 mr-2" />
          <span>{enrollment.gig.targetRegion} ({enrollment.gig.timezone})</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Expires: {new Date(enrollment.invitationExpiresAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
        <div className="flex flex-wrap gap-2">
          {enrollment.gig.requiredSkills.map((skill, i) => (
            <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Languages:</p>
        <div className="flex flex-wrap gap-2">
          {enrollment.gig.preferredLanguages.map((lang, i) => (
            <span key={i} className="px-2 py-1 bg-blue-50 rounded-full text-xs text-blue-600">
              {lang}
            </span>
          ))}
        </div>
      </div>

      {enrollment.notes && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Notes:</strong> {enrollment.notes}
          </p>
        </div>
      )}

      {enrollment.enrollmentStatus === 'invited' && canEnroll && !isExpired && (
        <div className="mt-6 flex space-x-3">
          <button 
            onClick={() => onAccept(enrollment)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accept
          </button>
          <button 
            onClick={() => onReject(enrollment)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Decline
          </button>
        </div>
      )}

      {isExpired && (
        <div className="mt-6 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800 text-center">
            Cette invitation a expiré le {new Date(enrollment.invitationExpiresAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {enrollment.enrollmentStatus === 'accepted' && (
        <div className="mt-6 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 text-center">
            ✅ Enrôlement accepté le {enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString() : 'récemment'}
          </p>
        </div>
      )}

      {enrollment.enrollmentStatus === 'rejected' && (
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-800 text-center">
            ❌ Enrôlement refusé
          </p>
        </div>
      )}
    </div>
  );
};
