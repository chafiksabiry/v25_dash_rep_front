import React from 'react';
import { Mail, Phone, MapPin, Star, Award, Clock, Brain, Trophy, Target, TrendingUp } from 'lucide-react';
import { REPSScore } from '../components/REPSScore';

export function Profile() {
  const repsScores = {
    reliability: 92,
    efficiency: 88,
    professionalism: 95,
    service: 90,
  };

  const improvements = [
    {
      category: 'Response Time Optimization',
      suggestion: 'Implement quick-reply templates for common inquiries to reduce initial response time.',
      impact: 'Could improve efficiency score by 5-7 points',
    },
    {
      category: 'Customer Satisfaction Enhancement',
      suggestion: 'Follow up with customers after resolution to ensure complete satisfaction.',
      impact: 'Potential 4-6 point increase in service score',
    },
    {
      category: 'Knowledge Base Utilization',
      suggestion: 'Increase usage of knowledge base articles during customer interactions.',
      impact: 'Expected 3-5 point boost in efficiency',
    },
  ];

  const achievements = [
    {
      title: 'Speed Demon',
      description: 'Complete 10 gigs with response time under 5 minutes',
      progress: 7,
      total: 10,
      icon: Clock,
    },
    {
      title: 'Customer Favorite',
      description: 'Receive 50 five-star ratings',
      progress: 42,
      total: 50,
      icon: Star,
    },
    {
      title: 'Problem Solver',
      description: 'Successfully resolve 100 customer issues',
      progress: 85,
      total: 100,
      icon: Target,
    },
  ];

  const rewards = [
    {
      title: 'Premium Status',
      description: 'Get early access to high-paying gigs',
      points: 5000,
      claimed: false,
    },
    {
      title: 'Bonus Cash',
      description: '$100 bonus payout',
      points: 3000,
      claimed: true,
    },
    {
      title: 'Priority Support',
      description: 'Direct line to HARX support team',
      points: 2000,
      claimed: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start space-x-6">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="Profile"
            className="w-24 h-24 rounded-full"
          />
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">John Doe</h1>
                <p className="text-gray-500">Senior HARX Representative</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-600 font-medium">4,250 Points</span>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center text-gray-500">
                <Mail className="w-4 h-4 mr-2" />
                <span>john.doe@example.com</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Phone className="w-4 h-4 mr-2" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center text-gray-500">
                <MapPin className="w-4 h-4 mr-2" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">REPS Performance Score</h2>
          <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-medium">AI-Powered Insights</span>
          </div>
        </div>
        <REPSScore scores={repsScores} improvements={improvements} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Rating</h2>
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">4.8</div>
          <p className="text-sm text-gray-500">Based on 156 reviews</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">2+ years</div>
          <p className="text-sm text-gray-500">As HARX Representative</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Response Time</h2>
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">15m</div>
          <p className="text-sm text-gray-500">Average response time</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Active Achievements</h2>
        <div className="space-y-6">
          {achievements.map((achievement, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <achievement.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                    <p className="text-sm text-gray-500">{achievement.description}</p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{achievement.progress} / {achievement.total}</span>
                <span className="text-blue-600 font-medium">
                  {Math.round((achievement.progress / achievement.total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Rewards</h2>
        <div className="space-y-4">
          {rewards.map((reward, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{reward.title}</h3>
                    <p className="text-sm text-gray-500">{reward.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{reward.points} points</p>
                  <button
                    className={`mt-2 px-4 py-1 rounded-lg text-sm font-medium ${
                      reward.claimed
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={reward.claimed}
                  >
                    {reward.claimed ? 'Claimed' : 'Claim'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
        <div className="flex flex-wrap gap-2">
          {[
            'Customer Support',
            'Problem Solving',
            'Communication',
            'Technical Support',
            'Email Support',
            'Chat Support',
            'Phone Support',
            'CRM Software',
            'Conflict Resolution',
            'Time Management',
          ].map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Performance</h2>
        <div className="space-y-4">
          {[
            { label: 'Customer Satisfaction', value: '98%' },
            { label: 'Task Completion Rate', value: '95%' },
            { label: 'On-time Delivery', value: '100%' },
          ].map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-600">{metric.label}</span>
              <span className="font-medium text-gray-900">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}