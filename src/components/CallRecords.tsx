import React, { useState, useEffect } from 'react';
import { Phone, Star, Clock, AlertTriangle, CheckCircle, XCircle, BarChart, Download, Filter, ChevronRight, Brain } from 'lucide-react';
import api from '../utils/client';

interface CallRecord {
  _id: string;
  lead: Lead;
  startTime: string;
  duration: Number;
  direction: 'inbound' | 'outbound-dial';
  status: string;
}
interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value: number;
  probability: number;
  source?: string;
  assignedTo?: string;
  lastContact?: Date;
  nextAction?: 'call' | 'email' | 'meeting' | 'follow-up';
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface QAMetric {
  category: string;
  score: number;
  target: number;
  improvement: string;
}

export function CallRecords() {
  const [activeTab, setActiveTab] = useState<'recent' | 'qa'>('recent');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallRecords = async () => {
      try {
        const agentId = localStorage.getItem('agentId');
        if (!agentId) {
          throw new Error('Agent ID not found');
        }

        const response = await api.calls.getByAgentId(agentId);
        console.log("calls records retrieved for agent", agentId, response.data);
        
        if (response.data.success) {
          setCallRecords(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch call records');
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching call records:', err);
        setError(err.message || 'Failed to fetch call records');
        setLoading(false);
      }
    };

    fetchCallRecords();
  }, []);

  const qaMetrics: QAMetric[] = [
    {
      category: 'Communication Clarity',
      score: 92,
      target: 90,
      improvement: 'Maintain clear and professional communication style'
    },
    {
      category: 'Problem Resolution',
      score: 85,
      target: 90,
      improvement: 'Focus on first-call resolution rate'
    },
    {
      category: 'Customer Satisfaction',
      score: 94,
      target: 90,
      improvement: 'Continue providing excellent customer service'
    },
    {
      category: 'Call Efficiency',
      score: 88,
      target: 90,
      improvement: 'Work on reducing average handling time while maintaining quality'
    }
  ];

  const improvementSuggestions = [
    {
      area: 'Technical Knowledge',
      suggestion: 'Review latest product documentation',
      impact: 'Improve first-call resolution rate',
      priority: 'high'
    },
    {
      area: 'Soft Skills',
      suggestion: 'Practice active listening techniques',
      impact: 'Enhance customer satisfaction scores',
      priority: 'medium'
    },
    {
      area: 'Process Adherence',
      suggestion: 'Follow call documentation guidelines',
      impact: 'Maintain consistent quality standards',
      priority: 'medium'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading call records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Call Records & Quality Assurance</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'recent'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Recent Calls
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'qa'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          QA Metrics
        </button>
      </div>

      {activeTab === 'recent' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="divide-y divide-gray-200">
            {callRecords.map((record) => (
              <div key={record._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      record.direction === 'inbound' ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                      <Phone className={`w-5 h-5 ${
                        record.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{record.lead.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(record.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'completed' ? 'bg-green-100 text-green-700' :
                      record.status === 'missed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                    {/* <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="font-medium">{record.qaScore}</span>
                    </div> */}
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{record.duration.toString()} seconds</span>
                  </div>
                  {/* <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div> */}
                </div>

               {/*  <p className="text-sm text-gray-600 mb-4">{record.notes}</p> */}

                {/* {record.flags && (
                  <div className="flex flex-wrap gap-2">
                    {record.flags.map((flag, index) => (
                      <span
                        key={index}
                        className={`flex items-center px-2 py-1 rounded-full text-xs ${
                          flag === 'positive-feedback'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {flag === 'positive-feedback' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {flag.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                    ))}
                  </div>
                )} */}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'qa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quality Metrics</h3>
              <div className="space-y-6">
                {qaMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{metric.category}</span>
                      <span className={`text-sm font-medium ${
                        metric.score >= metric.target ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {metric.score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          metric.score >= metric.target ? 'bg-green-600' : 'bg-yellow-600'
                        }`}
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{metric.improvement}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Improvement Plan</h3>
                <div className="flex items-center space-x-2 text-blue-600">
                  <Brain className="w-5 h-5" />
                  <span className="text-sm font-medium">AI-Generated</span>
                </div>
              </div>
              <div className="space-y-4">
                {improvementSuggestions.map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{suggestion.area}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)} Priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.suggestion}</p>
                    <p className="text-xs text-gray-500">Impact: {suggestion.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average QA Score</span>
                  <span className="font-medium text-gray-900">88%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Calls Reviewed</span>
                  <span className="font-medium text-gray-900">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Improvement Areas</span>
                  <span className="font-medium text-gray-900">3</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Trending Up!</h3>
              </div>
              <p className="text-blue-100 mb-4">
                Your QA scores have improved by 12% over the last month.
              </p>
              <button className="w-full bg-white text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                View Detailed Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}