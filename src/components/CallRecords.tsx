import React, { useState, useEffect } from 'react';
import { Phone, Star, Clock, AlertTriangle, CheckCircle, XCircle, BarChart, Download, Filter, ChevronRight, Brain, Info, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/client';

interface CallRecord {
  _id: string;
  call_id?: string;
  agent: string;
  lead?: Lead;
  sid?: string;
  parentCallSid?: string | null;
  direction: 'inbound' | 'outbound-dial';
  provider?: 'twilio' | 'qalqul';
  startTime: Date;
  endTime?: Date | null;
  status: string;
  duration: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  ai_call_score?: {
    'Agent fluency': {
      score: number;
      feedback: string;
    };
    'Sentiment analysis': {
      score: number;
      feedback: string;
    };
    'Fraud detection': {
      score: number;
      feedback: string;
    };
    overall: {
      score: number;
      feedback: string;
    };
  };
  childCalls?: string[];
  createdAt: Date;
  updatedAt: Date;
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
  const navigate = useNavigate();
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
        console.log("calls records retrieved for agent", agentId, response);
        
        if (response.success) {
          setCallRecords(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch call records');
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
              <div key={record._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between">
                  {/* Left side - Call info */}
                  <div className="flex items-start space-x-4">
                    <div className={`relative p-3 rounded-xl ${
                      record.direction === 'inbound' 
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100' 
                        : 'bg-gradient-to-br from-green-50 to-green-100'
                    }`}>
                      <Phone className={`w-6 h-6 ${
                        record.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        record.direction === 'inbound'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {record.direction === 'inbound' ? 'In' : 'Out'}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">
                          {record.lead?.name || 'Unknown Customer'}
                        </h3>
                        {record.lead?.company && (
                          <span className="text-sm text-gray-500">
                            • {record.lead.company}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 space-y-2.5">
                        {record.lead?.phone && (
                          <p className="flex items-center">
                            <Phone className="w-4 h-4 mr-1.5" />
                            {record.lead.phone}
                          </p>
                        )}
                        <p className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {new Date(record.startTime).toLocaleString()}
                          {record.duration && (
                            <span className="ml-2">
                              • {Math.floor(record.duration / 60)}:{String(record.duration % 60).padStart(2, '0')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Status and actions */}
                  <div className="flex items-start space-x-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      record.status === 'completed' ? 'bg-green-100 text-green-700' :
                      record.status === 'missed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                    
                    {record.ai_call_score?.overall?.score !== undefined && record.ai_call_score?.overall?.score !== null && (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full">
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">{record.ai_call_score.overall.score}%</span>
                      </div>
                    )}

                    <button 
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                      onClick={() => {
                        navigate(`/call-report`, { state: { call: record } });
                      }}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Additional info row */}
                <div className="mt-4 flex items-center space-x-3 text-sm text-gray-500">
                  {record.provider && (
                    <span className="px-2 py-1 bg-gray-50 rounded-md">
                      via {record.provider}
                    </span>
                  )}
                </div>
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