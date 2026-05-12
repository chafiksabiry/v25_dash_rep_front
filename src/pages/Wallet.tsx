import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Ban as Bank, 
  Shield, 
  AlertCircle, 
  Download, 
  Filter, 
  ChevronRight, 
  Lock, 
  Bell,
  Check,
  X,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Phone
} from 'lucide-react';

export function WalletPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedDateRange, setSelectedDateRange] = useState('this-month');

  // Dynamic state metrics for simulating real-time payouts
  const [availableBalance, setAvailableBalance] = useState(() => {
    const saved = localStorage.getItem('rep_available_balance');
    return saved ? parseFloat(saved) : 1250.00;
  });
  const [pendingEarnings, setPendingEarnings] = useState(() => {
    const saved = localStorage.getItem('rep_pending_balance');
    return saved ? parseFloat(saved) : 325.00;
  });
  const [lifetimeEarnings, setLifetimeEarnings] = useState(12450.00);

  // Filter and Call Records for "Liste des Appels"
  const [selectedGigFilter, setSelectedGigFilter] = useState('all');

  const gigsFilterOptions = [
    { id: 'all', title: 'Tous les Gigs' },
    { id: 'insurance-premium', title: 'Assurance Santé Premium' },
    { id: 'cpf-booster', title: 'Formation CPF Booster' },
    { id: 'telecom-pro', title: 'Télécom Fibre Pro' }
  ];

  const callEarnings = [
    {
      id: 'C1',
      gigId: 'insurance-premium',
      gigTitle: 'Assurance Santé Premium',
      customerName: 'Jean Dupont',
      phone: '+33 6 12 34 56 78',
      duration: '08:45',
      date: '2024-03-15 14:32',
      status: 'Validé',
      earnings: 17.50
    },
    {
      id: 'C2',
      gigId: 'cpf-booster',
      gigTitle: 'Formation CPF Booster',
      customerName: 'Marie Curie',
      phone: '+33 6 98 76 54 32',
      duration: '12:10',
      date: '2024-03-15 11:15',
      status: 'Validé',
      earnings: 24.20
    },
    {
      id: 'C3',
      gigId: 'telecom-pro',
      gigTitle: 'Télécom Fibre Pro',
      customerName: 'Pierre Menès',
      phone: '+33 7 45 89 12 36',
      duration: '04:15',
      date: '2024-03-14 16:45',
      status: 'En attente',
      earnings: 8.50
    },
    {
      id: 'C4',
      gigId: 'insurance-premium',
      gigTitle: 'Assurance Santé Premium',
      customerName: 'Sophie Lambert',
      phone: '+33 6 55 44 33 22',
      duration: '15:30',
      date: '2024-03-13 09:20',
      status: 'Validé',
      earnings: 31.00
    },
    {
      id: 'C5',
      gigId: 'cpf-booster',
      gigTitle: 'Formation CPF Booster',
      customerName: 'Lucas Bernard',
      phone: '+33 6 11 22 33 44',
      duration: '02:05',
      date: '2024-03-12 18:10',
      status: 'Refusé',
      earnings: 0.00
    }
  ];

  const filteredCalls = selectedGigFilter === 'all' 
    ? callEarnings 
    : callEarnings.filter(call => call.gigId === selectedGigFilter);

  // Sync state changes with localStorage and emit sync event
  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  // Stateful transaction log
  const [transactions, setTransactions] = useState([
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
  ]);

  // Payment methods
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

  // Withdrawal Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1 = Entry, 2 = 2FA, 3 = Success
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: null }), 3000);
  };

  // Launch Withdrawal Modal
  const handleOpenWithdraw = () => {
    if (availableBalance <= 0) {
      showToast('Votre solde disponible est insuffisant pour un retrait.', 'error');
      return;
    }
    setWithdrawAmount('');
    setSelectedMethod('bank');
    setWithdrawStep(1);
    setVerificationCode('');
    setValidationError('');
    setShowWithdrawModal(true);
  };

  // Handle Step 1 Submit (Amount & Method Verification)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (amount > availableBalance) {
      setValidationError(`Le montant dépasse votre solde disponible de $${availableBalance.toFixed(2)}.`);
      return;
    }
    setValidationError('');
    setWithdrawStep(2); // Advance to 2FA stage
  };

  // Handle Step 2 Submit (2FA Check)
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim() !== '1234') {
      setValidationError('Code de vérification incorrect. Saisissez 1234 pour simuler la validation.');
      return;
    }
    setValidationError('');
    
    // Process withdrawal
    const parsedAmount = parseFloat(withdrawAmount);
    setAvailableBalance(prev => prev - parsedAmount);
    setPendingEarnings(prev => prev + parsedAmount);

    // Add transaction to history list
    const methodDetails = selectedMethod === 'bank' ? 'Bank Account (...4567)' : 'PayPal (john.doe@example.com)';
    const refNum = `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: Date.now(),
      type: 'Payout',
      amount: parsedAmount,
      status: 'Processing',
      date: new Date().toISOString().split('T')[0],
      method: selectedMethod === 'bank' ? 'Bank Transfer' : 'PayPal',
      reference: refNum,
      description: `Withdrawal request via ${methodDetails}`
    };

    setTransactions(prev => [newTx, ...prev]);
    setWithdrawStep(3); // Go to Success page
  };

  const balanceStats = [
    {
      title: t('wallet.availableBalance'),
      amount: `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      change: '+$450 this week',
      status: 'positive'
    },
    {
      title: t('wallet.pendingEarnings'),
      amount: `$${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Clock,
      change: `${transactions.filter(t => t.status === 'Processing').length} transactions en attente`,
      status: 'neutral'
    },
    {
      title: t('wallet.lifetimeEarnings'),
      amount: `$${lifetimeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      change: 'Since joining',
      status: 'positive'
    }
  ];

  return (
    <div className="space-y-6 relative">
      {/* Mini Notification Toast */}
      {toastMessage.text && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl border z-[9999] transition-all flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('wallet.title')}</h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-bold transition-all">
            <Download className="w-4 h-4" />
            <span>{t('wallet.downloadStatement')}</span>
          </button>
          <button 
            onClick={handleOpenWithdraw}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {t('wallet.withdrawFunds')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balanceStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stat.status === 'positive' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-800 tracking-tight">{stat.amount}</p>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === 'transactions' 
                    ? 'border-blue-600 text-blue-600 bg-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                {t('wallet.transactionHistory')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calls')}
                className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === 'calls' 
                    ? 'border-blue-600 text-blue-600 bg-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                Liste des Appels & Gains
              </button>
            </div>

            {activeTab === 'transactions' ? (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historique de Retraits</h2>
                    <div className="flex items-center space-x-3">
                      <select
                        value={selectedDateRange}
                        onChange={(e) => setSelectedDateRange(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 bg-white"
                      >
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                        <option value="last-month">Last Month</option>
                      </select>
                      <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                        <Filter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2.5 rounded-xl ${
                            transaction.type === 'Payout' ? 'bg-orange-50 text-orange-600' :
                            transaction.type === 'Bonus' ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {transaction.type === 'Payout' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm">{transaction.type === 'Payout' ? 'Retrait Demandé' : transaction.type}</p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">${transaction.amount.toFixed(2)}</p>
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            transaction.status === 'Completed' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {transaction.status === 'Completed' ? 'Complété' : 'En cours'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                        <div className="flex items-center space-x-4">
                          <span>Ref: {transaction.reference}</span>
                          <span>•</span>
                          <span>Via: {transaction.method}</span>
                        </div>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Suivi des Appels éligibles aux commissions
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase">
                      Chaque appel validé par l'entreprise crédite votre solde de gains.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Filtrer par Gig :</span>
                    <select
                      value={selectedGigFilter}
                      onChange={(e) => setSelectedGigFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {gigsFilterOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredCalls.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase">
                      Aucun appel trouvé pour ce filtre de Gig.
                    </div>
                  ) : (
                    filteredCalls.map((call) => (
                      <div key={call.id} className="p-6 hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-xl bg-blue-50 text-blue-600`}>
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-extrabold text-slate-800 text-sm">{call.customerName}</p>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                  {call.duration}
                                </span>
                              </div>
                              <p className="text-xs text-blue-600 font-bold mt-1 uppercase tracking-wider">{call.gigTitle}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{call.phone} • {call.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-600 text-base">+{call.earnings > 0 ? `$${call.earnings.toFixed(2)}` : '--'}</p>
                            <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${
                              call.status === 'Validé' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : call.status === 'En attente'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {call.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <method.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{method.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {method.last4 ? `****${method.last4}` : method.email}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    method.type === 'Primary'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {method.type}
                  </span>
                </div>
              ))}
              <button className="w-full py-2.5 border border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-extrabold text-xs transition-colors">
                + Add Payment Method
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-bold text-slate-800 text-xs">Two-Factor Auth</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Extra security for withdrawals</p>
                  </div>
                </div>
                <div className="relative inline-block w-10 h-5">
                  <input type="checkbox" className="peer sr-only" id="tfa" defaultChecked />
                  <label
                    htmlFor="tfa"
                    className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="absolute inset-y-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-bold text-slate-800 text-xs">Payment Alerts</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Get notified about transactions</p>
                  </div>
                </div>
                <div className="relative inline-block w-10 h-5">
                  <input type="checkbox" className="peer sr-only" id="alerts" defaultChecked />
                  <label
                    htmlFor="alerts"
                    className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-blue-600 cursor-pointer transition-colors"
                  >
                    <span className="absolute inset-y-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 blur-xl rounded-full" />
            <div className="flex items-center space-x-3 mb-3">
              <Lock className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-wider">KYC Status</h2>
            </div>
            <p className="text-xs text-blue-100 mb-4 leading-relaxed font-medium">
              Your account is fully verified. You have access to all payment features.
            </p>
            <div className="flex items-center justify-between text-[10px] font-black uppercase">
              <span className="bg-green-500/35 border border-green-400/30 px-2.5 py-1 rounded-full text-green-100">Verified</span>
              <button className="text-blue-100 hover:text-white transition-all">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WINDOW 1: GLASSMORPHIC WITHDRAWAL MODAL */}
      {/* ========================================================================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Design Accents */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none"></div>

            {/* Header Area */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Wallet className="w-5 h-5 animate-bounce-subtle" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Demande de Retrait</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Transférer vers vos comptes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ERROR DISPLAY */}
            {validationError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2 border border-rose-100">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* ==================== STEP 1: FORM DETAILS ==================== */}
            {withdrawStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">
                    Méthode de Paiement
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('bank')}
                      className={`p-4 rounded-2xl border text-left flex flex-col transition-all ${
                        selectedMethod === 'bank' 
                          ? 'border-blue-500 bg-blue-50/25 ring-1 ring-blue-500' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <Bank className={`w-5 h-5 mb-2 ${selectedMethod === 'bank' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-700">Compte Bancaire</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">Transit (...4567)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('paypal')}
                      className={`p-4 rounded-2xl border text-left flex flex-col transition-all ${
                        selectedMethod === 'paypal' 
                          ? 'border-blue-500 bg-blue-50/25 ring-1 ring-blue-500' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'paypal' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-700">PayPal Wallet</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">john.doe@example.com</span>
                    </button>
                  </div>
                </div>

                {/* Amount entry */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Montant à Retirer
                    </label>
                    <span className="text-[10px] text-slate-500 font-black uppercase">
                      Max: ${availableBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <DollarSign className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        setValidationError('');
                      }}
                      className="block w-full pl-9 pr-24 py-3 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-2xl text-sm font-extrabold text-slate-800"
                    />
                    <div className="absolute inset-y-1 right-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                        className="px-3.5 h-full bg-white hover:bg-slate-50 border border-slate-150 text-[10px] font-black text-blue-600 rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-95"
                      >
                        Utiliser Max
                      </button>
                    </div>
                  </div>

                  {/* Fast selection buttons */}
                  <div className="flex gap-2 mt-2">
                    {[100, 250, 500].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => {
                          setWithdrawAmount(quick.toString());
                          setValidationError('');
                        }}
                        className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 text-[10px] font-extrabold text-slate-600 rounded-lg transition-all border border-slate-100"
                      >
                        ${quick}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security hint disclaimer */}
                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0 animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Vos fonds seront transférés sur-le-champ vers la plateforme sélectionnée. Des contrôles de conformité KYC sont actifs sur ce compte.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    Suivant: Vérifier l'identité
                  </button>
                </div>
              </form>
            )}

            {/* ==================== STEP 2: 2FA SECURITY CHECK ==================== */}
            {withdrawStep === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="p-4 bg-amber-50 text-amber-500 border border-amber-100 rounded-3xl mb-3 shadow-inner">
                    <KeyRound className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Double Facteur Activé</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-xs uppercase leading-tight">
                    Nous avons envoyé un code de vérification à votre appareil.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2 text-center">
                    Entrer le code à 4 chiffres
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ''));
                      setValidationError('');
                    }}
                    className="block w-32 mx-auto text-center py-2.5 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-2xl text-lg font-black text-slate-800 tracking-[0.75em]"
                  />
                  <p className="text-center text-[9px] text-blue-500 font-bold mt-2 uppercase tracking-wide">
                    Code de démonstration : Saisissez <span className="underline font-black text-xs">1234</span>
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    Confirmer
                  </button>
                </div>
              </form>
            )}

            {/* ==================== STEP 3: SUCCESS SPLASH ==================== */}
            {withdrawStep === 3 && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full mx-auto flex items-center justify-center shadow-lg relative">
                  <Check className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center text-white text-[8px] font-black animate-ping" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-1">
                    Retrait Soumis ! <Sparkles className="w-4 h-4 text-amber-500" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase max-w-sm mx-auto leading-relaxed">
                    Félicitations, votre demande de ${parseFloat(withdrawAmount).toFixed(2)} a été enregistrée.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left max-w-xs mx-auto text-xs font-bold space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Montant</span>
                    <span className="text-slate-800 font-black">${parseFloat(withdrawAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Frais de réseau</span>
                    <span className="text-emerald-600 font-black">Gratuit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Statut</span>
                    <span className="text-amber-600 font-black uppercase text-[10px]">Traitement en cours...</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-[10px] text-slate-400">
                    <span>TRANSACTION REF</span>
                    <span>TRX-{Math.floor(200000 + Math.random() * 800000)}</span>
                  </div>
                </div>

                <div className="pt-2 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      showToast('Retrait enregistré avec succès !', 'success');
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    Fermer le Guichet
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}