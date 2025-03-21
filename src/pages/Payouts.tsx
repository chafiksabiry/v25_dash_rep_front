import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Ban as Bank, History, Clock } from 'lucide-react';

export function Payouts() {
  const transactions = [
    {
      id: 1,
      type: 'Payout',
      amount: 450.00,
      status: 'Completed',
      date: '2024-03-15',
      method: 'Bank Transfer'
    },
    {
      id: 2,
      type: 'Bonus',
      amount: 100.00,
      status: 'Processing',
      date: '2024-03-14',
      method: 'PayPal'
    },
    {
      id: 3,
      type: 'Reward',
      amount: 75.00,
      status: 'Completed',
      date: '2024-03-10',
      method: 'Bank Transfer'
    }
  ];

  const stats = [
    {
      title: 'Available Balance',
      amount: '$1,250.00',
      icon: Wallet,
      change: '+$450 this week'
    },
    {
      title: 'Pending Payouts',
      amount: '$325.00',
      icon: Clock,
      change: '2 transactions'
    },
    {
      title: 'Total Earned',
      amount: '$12,450.00',
      icon: CreditCard,
      change: 'Since joining'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payouts & Earnings</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Request Payout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">{stat.amount}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-sm text-gray-600">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <button className="text-blue-600 hover:text-blue-700 flex items-center">
            <History className="w-4 h-4 mr-1" />
            View All
          </button>
        </div>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  transaction.type === 'Payout' ? 'bg-green-50' : 
                  transaction.type === 'Bonus' ? 'bg-blue-50' : 'bg-yellow-50'
                }`}>
                  {transaction.type === 'Payout' ? (
                    <ArrowUpRight className={`w-5 h-5 ${
                      transaction.type === 'Payout' ? 'text-green-600' :
                      transaction.type === 'Bonus' ? 'text-blue-600' : 'text-yellow-600'
                    }`} />
                  ) : (
                    <ArrowDownRight className={`w-5 h-5 ${
                      transaction.type === 'Payout' ? 'text-green-600' :
                      transaction.type === 'Bonus' ? 'text-blue-600' : 'text-yellow-600'
                    }`} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.type}</p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">${transaction.amount.toFixed(2)}</p>
                <p className={`text-sm ${
                  transaction.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {transaction.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}