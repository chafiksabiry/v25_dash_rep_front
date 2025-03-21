import React, { useState } from 'react';
import { Wallet, Clock, DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Ban as Bank, Shield, AlertCircle, Download, Filter, ChevronRight, Lock, Bell } from 'lucide-react';

export function WalletPage() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedDateRange, setSelectedDateRange] = useState('this-month');

  const balanceStats = [
    {
      title: 'Available Balance',
      amount: '$1,250.00',
      icon: Wallet,
      change: '+$450 this week',
      status: 'positive'
    },
    {
      title: 'Pending Earnings',
      amount: '$325.00',
      icon: Clock,
      change: '2 transactions pending',
      status: 'neutral'
    },
    {
      title: 'Lifetime Earnings',
      amount: '$12,450.00',
      icon: DollarSign,
      change: 'Since joining',
      status: 'positive'
    }
  ];

  const transactions = [
    {
      id: 1,
      type: 'Payout',
      amount: 450.00,
      status: 'Completed',
      date: '2024-03-15',
      method: 'Bank Transfer',
      reference: 'TRX-001234',
      description: 'Weekly earnings payout'
    },
    {
      id: 2,
      type: 'Bonus',
      amount: 100.00,
      status: 'Processing',
      date: '2024-03-14',
      method: 'PayPal',
      reference: 'BNS-005678',
      description: 'Performance bonus'
    },
    {
      id: 3,
      type: 'Reward',
      amount: 75.00,
      status: 'Completed',
      date: '2024-03-10',
      method: 'Bank Transfer',
      reference: 'RWD-009012',
      description: 'Customer satisfaction reward'
    }
  ];

  const paymentMethods = [
    {
      id: 'bank',
      name: 'Bank Account',
      type: 'Primary',
      last4: '4567',
      icon: Bank
    },
    {
      id: 'paypal',
      name: 'PayPal',
      type: 'Secondary',
      email: 'john.doe@example.com',
      icon: CreditCard
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Wallet & Earnings</h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Download className="w-4 h-4" />
            <span>Download Statement</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Withdraw Funds
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balanceStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`text-sm font-medium ${
                stat.status === 'positive' ? 'text-green-600' :
                stat.status === 'negative' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{stat.amount}</p>
            <p className="text-sm text-gray-500">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                <div className="flex items-center space-x-3">
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'Payout' ? 'bg-green-50' :
                        transaction.type === 'Bonus' ? 'bg-blue-50' :
                        'bg-yellow-50'
                      }`}>
                        {transaction.type === 'Payout' ? (
                          <ArrowUpRight className={`w-5 h-5 ${
                            transaction.type === 'Payout' ? 'text-green-600' :
                            transaction.type === 'Bonus' ? 'text-blue-600' :
                            'text-yellow-600'
                          }`} />
                        ) : (
                          <ArrowDownRight className={`w-5 h-5 ${
                            transaction.type === 'Payout' ? 'text-green-600' :
                            transaction.type === 'Bonus' ? 'text-blue-600' :
                            'text-yellow-600'
                          }`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.type}</p>
                        <p className="text-sm text-gray-500">{transaction.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${transaction.amount.toFixed(2)}</p>
                      <p className={`text-sm ${
                        transaction.status === 'Completed' ? 'text-green-600' :
                        'text-yellow-600'
                      }`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Ref: {transaction.reference}</span>
                      <span>Via: {transaction.method}</span>
                    </div>
                    <span>{new Date(transaction.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <method.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500">
                        {method.last4 ? `****${method.last4}` : method.email}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    method.type === 'Primary'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {method.type}
                  </span>
                </div>
              ))}
              <button className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                + Add Payment Method
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Auth</p>
                    <p className="text-sm text-gray-500">Extra security for withdrawals</p>
                  </div>
                </div>
                <div className="relative inline-block w-12 h-6">
                  <input type="checkbox" className="peer sr-only" id="tfa" />
                  <label
                    htmlFor="tfa"
                    className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="absolute inset-y-0 left-0 w-6 h-6 bg-white rounded-full shadow transform peer-checked:translate-x-6 transition-transform" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Payment Alerts</p>
                    <p className="text-sm text-gray-500">Get notified about transactions</p>
                  </div>
                </div>
                <div className="relative inline-block w-12 h-6">
                  <input type="checkbox" className="peer sr-only" id="alerts" defaultChecked />
                  <label
                    htmlFor="alerts"
                    className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="absolute inset-y-0 left-0 w-6 h-6 bg-white rounded-full shadow transform peer-checked:translate-x-6 transition-transform" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-6 h-6" />
              <h2 className="text-lg font-semibold">KYC Status</h2>
            </div>
            <p className="text-blue-100 mb-4">
              Your account is fully verified. You have access to all payment features.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="bg-green-500 px-2 py-1 rounded-full">Verified</span>
              <button className="text-blue-100 hover:text-white">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}