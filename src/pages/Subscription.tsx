import React from 'react';
import { Check } from 'lucide-react';
import axios from 'axios';

const plans = [
  {
    name: 'STARTER',
    price: '99',
    description: 'Start your campaigns with simplicity and efficiency',
    features: [
      'Active GIGs: 3',
      'Active REPs: 5',
      'AI Powered Gig Engine',
      'AI Powered Script Engine',
      'AI Powered Learning Planner',
      'AI Powered GIGS REPS Matching',
      'Qualified REPs on demand',
      'Dashboard with Standard KPIs',
      'Email support + assisted onboarding'
    ],
    buttonText: 'Start trial',
    popular: false
  },
  {
    name: 'GROWTH',
    price: '249',
    description: 'Drive multi channel efforts with AI automation',
    features: [
      'Active GIGs: 10',
      'Active REPs: 15',
      'Channels: Outbound Calls Only',
      'All Starter Features',
      'AI Powered Lead Management Engine',
      'AI Powered Knowledge Base Engine',
      'AI Powered Call Monitoring & Audit',
      'Call storage - 3 months',
      'Priority support + chat'
    ],
    buttonText: 'Start trial',
    popular: true
  },
  {
    name: 'SCALE',
    price: '499',
    description: 'Activate Intelligence at scale',
    features: [
      'Active GIGs: 25',
      'Active REPs: 50',
      'Channels: Outbound Calls Only',
      'Global Coverage',
      'All Growth Features Included',
      'Priority Support - live chat, email',
      'Customization - Dashboard, Analytics',
      'Full Integrations'
    ],
    buttonText: 'Start trial',
    popular: false
  }
];

export const Subscription: React.FC = () => {
  const handleStartTrial = async (planName: string) => {
    try {
      // In a real app, we'd get the actual planId from the backend
      // and the current user's ID.
      console.log(`Starting trial for ${planName}`);
      // Redirect to Stripe Checkout logic would go here
      // const response = await axios.post('/api/subscriptions/checkout', { planName });
      // window.location.href = response.data.url;
      alert(`Integration with Stripe for ${planName} initiated!`);
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Growth Plan</h1>
        <p className="text-xl text-indigo-100 opacity-80">
          Scale your operations with AI-powered sales orchestration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 transform hover:-translate-y-2 ${
              plan.popular 
                ? 'bg-white text-gray-900 scale-105 shadow-2xl ring-4 ring-indigo-400' 
                : 'bg-indigo-900/40 backdrop-blur-xl text-white border border-white/10'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-wide">{plan.name}</h3>
              <p className={`text-sm ${plan.popular ? 'text-gray-600' : 'text-indigo-200 opacity-80'}`}>
                {plan.description}
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-5xl font-extrabold tracking-tight">€{plan.price}</span>
                <span className={`ml-1 text-xl ${plan.popular ? 'text-gray-500' : 'text-indigo-200 opacity-60'}`}>/month</span>
              </div>
            </div>

            <button
              onClick={() => handleStartTrial(plan.name)}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 mb-8 ${
                plan.popular
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/30'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {plan.buttonText}
            </button>

            <ul className="space-y-4 flex-grow">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                    plan.popular ? 'bg-indigo-100 text-indigo-600' : 'bg-white/10 text-indigo-400'
                  }`}>
                    <Check size={14} />
                  </div>
                  <span className={`text-sm ${plan.popular ? 'text-gray-700' : 'text-indigo-100/90'}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
