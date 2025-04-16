import React from 'react';
import { Mail, Phone, MapPin, Star, Award, Clock, Brain, Trophy, Target, Briefcase, Globe, Book } from 'lucide-react';

interface ProfileViewProps {
  profile: any; // Using any temporarily as we're migrating the interface
}

export function ProfileView({ profile }: ProfileViewProps) {
  if (!profile) {
    return <div>No profile data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl text-blue-600 font-semibold">
                {profile.personalInfo?.name?.split(' ').map((n: string) => n.charAt(0)).join('')}
              </span>
            </div>
            
            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.personalInfo?.name}
                  </h1>
                  <p className="text-gray-500">{profile.professionalSummary?.currentRole || 'HARX Representative'}</p>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center text-gray-500">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>{profile.personalInfo?.email}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{profile.personalInfo?.phone || 'Not specified'}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{profile.personalInfo?.location || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Experience</span>
            </div>
            <p className="text-gray-600">{profile.professionalSummary?.yearsOfExperience} years</p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="w-5 h-5 text-green-600" />
              <span className="font-medium">Industries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.professionalSummary?.industries?.map((industry: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  {industry}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Notable Companies</span>
            </div>
            <div className="space-y-1">
              {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
                <div key={index} className="text-gray-600">{company}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Technical Skills */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Technical Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.technical?.map((skill: any, index: number) => (
                <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {skill.skill} - Level {skill.level}
                </span>
              ))}
            </div>
          </div>

          {/* Professional Skills */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Professional Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.professional?.map((skill: any, index: number) => (
                <span key={index} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  {skill.skill} - Level {skill.level}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Languages Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Languages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.personalInfo?.languages?.map((lang: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-900">{lang.language}</h3>
                <span className="text-sm text-gray-500">{lang.proficiency}</span>
              </div>
              {lang.assessmentResults && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Fluency</span>
                    <span>{lang.assessmentResults.fluency.score}/100</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Proficiency</span>
                    <span>{lang.assessmentResults.proficiency.score}/100</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Overall</span>
                    <span>{lang.assessmentResults.overall.score}/100</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Experience Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h2>
        <div className="space-y-6">
          {profile.experience?.map((exp: any, index: number) => (
            <div key={index} className="border-l-2 border-blue-200 pl-4 py-2">
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900">{exp.title}</h3>
                <span className="text-sm text-gray-500">
                  {new Date(exp.startDate).toLocaleDateString()} - {
                    exp.endDate === 'present' ? 'Present' : 
                    exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'
                  }
                </span>
              </div>
              <p className="text-gray-600 mt-1">{exp.company}</p>
              
              {exp.responsibilities && exp.responsibilities.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700">Responsibilities:</h4>
                  <ul className="mt-1 list-disc list-inside text-gray-600 text-sm">
                    {exp.responsibilities.map((resp: string, idx: number) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {exp.achievements && exp.achievements.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700">Achievements:</h4>
                  <ul className="mt-1 list-disc list-inside text-gray-600 text-sm">
                    {exp.achievements.map((achievement: string, idx: number) => (
                      <li key={idx}>{achievement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Center Skills Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Center Skills</h2>
        <div className="space-y-6">
          {profile.skills?.contactCenter?.map((skill: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{skill.skill}</h3>
                  <p className="text-sm text-gray-500">{skill.category}</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {skill.proficiency}
                </span>
              </div>

              {skill.assessmentResults && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Score</span>
                      <span>{skill.assessmentResults.score}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${skill.assessmentResults.score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Professionalism</div>
                      <div className="font-medium">
                        {skill.assessmentResults.keyMetrics.professionalism}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Effectiveness</div>
                      <div className="font-medium">
                        {skill.assessmentResults.keyMetrics.effectiveness}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Customer Focus</div>
                      <div className="font-medium">
                        {skill.assessmentResults.keyMetrics.customerFocus}/100
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 