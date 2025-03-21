import React, { useState } from 'react';
import { Clock, DollarSign, Star, Users, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export function GigsMarketplace() {
  const [activeTab, setActiveTab] = useState('available');

  const availableGigs = [
    {
      title: 'Customer Support Representative',
      company: 'TechCorp Inc.',
      type: 'Phone Support',
      rate: '$25/hour',
      duration: '4 hours',
      requirements: ['Fluent English', 'Tech Knowledge', '2+ years experience'],
      urgency: 'High',
    },
    {
      title: 'Social Media Manager',
      company: 'Fashion Brand Co.',
      type: 'Social Media',
      rate: '$30/hour',
      duration: '6 hours',
      requirements: ['Content Creation', 'Instagram Expert', 'Copywriting'],
      urgency: 'Medium',
    },
    {
      title: 'Email Support Specialist',
      company: 'E-commerce Solutions',
      type: 'Email Support',
      rate: '$22/hour',
      duration: '8 hours',
      requirements: ['Written Communication', 'Problem Solving', 'Multi-tasking'],
      urgency: 'Low',
    },
  ];

  const activeGigs = [
    {
      id: 1,
      company: 'TechCorp Inc.',
      task: 'Customer Support Call',
      timeLeft: '45 minutes',
      status: 'In Progress',
      customer: 'Sarah Wilson',
      type: 'Voice Call',
    },
    {
      id: 2,
      company: 'E-commerce Solutions',
      task: 'Email Support',
      timeLeft: '2 hours',
      status: 'Scheduled',
      customer: 'Mike Johnson',
      type: 'Email',
    },
    {
      id: 3,
      company: 'Fashion Brand Co.',
      task: 'Social Media Response',
      timeLeft: '30 minutes',
      status: 'In Progress',
      customer: 'Emily Brown',
      type: 'Social Media',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gigs</h1>
        <div className="flex space-x-3">
          <select className="border border-gray-200 rounded-lg px-4 py-2 bg-white">
            <option>All Categories</option>
            <option>Phone Support</option>
            <option>Email Support</option>
            <option>Chat Support</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-4 py-2 bg-white">
            <option>Sort by: Latest</option>
            <option>Sort by: Rate</option>
            <option>Sort by: Duration</option>
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
      </div>

      {activeTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {availableGigs.map((gig, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                  <p className="text-sm text-gray-500">{gig.company}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  gig.urgency === 'High' ? 'bg-red-100 text-red-700' :
                  gig.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {gig.urgency}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{gig.type}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>{gig.rate}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{gig.duration}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                <div className="flex flex-wrap gap-2">
                  {gig.requirements.map((req, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              <button className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Apply Now
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="grid grid-cols-1 gap-6">
          {activeGigs.map((gig) => (
            <div key={gig.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">{gig.task}</h3>
                  <p className="text-sm text-gray-500">{gig.company}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  gig.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {gig.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Time Left: {gig.timeLeft}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{gig.type}</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Customer: {gig.customer}</p>
              </div>

              <div className="mt-6 flex space-x-3">
                <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Gig
                </button>
                <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Report Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}