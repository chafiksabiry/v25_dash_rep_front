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

import { CallRecords } from '../components/CallRecords';
import api from '../utils/client';
import { useAuth } from '../contexts/AuthContext';

export function WalletPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const agentId = user?.agentId;
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedDateRange, setSelectedDateRange] = useState('this-month');
  const [selectedGigId, setSelectedGigId] = useState('all');
  const [callValidationFilter, setCallValidationFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [transactionValidationFilter, setTransactionValidationFilter] = useState<'all' | 'approved' | 'refused' | 'pending'>('all');

  // Dynamic state metrics for real payouts
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);

  // Filter and Call Records for "Liste des Appels"
  const [realCalls, setRealCalls] = useState<any[]>([]);
  const [backendWithdrawals, setBackendWithdrawals] = useState<any[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Dynamic balance calculations based on call records
  const calculateBalances = (callsList: any[]) => {
    let available = 0; 
    let pending = 0;   
    let lifetime = 0;

    callsList.forEach(call => {
      const recordGig = call.lead?.gigId;
      const gigData = typeof recordGig === 'object' ? recordGig : null;
      
      // Priority: Gig-defined commission > Default fallback (4€/30€)
      // Note: We ignore call.price as it often represents the provider cost (e.g. 0.12€)
      let callRate = gigData?.commission?.commission_per_call || (gigData?.rewardPerCall) || 4.00; 
      let txRate = gigData?.commission?.transactionCommission || (gigData?.rewardPerSale) || 30.00;

      // 1. Call Validation commission
      if (call.companyValidation === 'approved') {
        available += callRate;
        lifetime += callRate;
      } else if (call.companyValidation === 'pending' || !call.companyValidation) {
        pending += callRate;
      }

      // 2. Transaction Validation commission
      const hasTransaction = call.transaction?.validByReps === true || call.transactionOccurred === true;
      if (hasTransaction) {
        if (call.transaction?.validByCompany === true) {
          available += txRate;
          lifetime += txRate;
        } else if (call.transaction?.validByCompany === null || call.transaction?.validByCompany === undefined) {
          pending += txRate;
        }
      }
    });

    return { available, pending, lifetime };
  };

  const generateTransactionsFromCalls = (callsList: any[]) => {
    const dynamicTxs: any[] = [];
    callsList.forEach(call => {
      const gigData = typeof call.lead?.gigId === 'object' ? call.lead.gigId : null;
      const gigTitle = gigData?.title || "Projet";
      const gigId = typeof call.lead?.gigId === 'object' ? call.lead.gigId?._id : call.lead?.gigId;

      // Call Commission
      if (call.companyValidation === 'approved') {
        const callRate = gigData?.commission?.commission_per_call || gigData?.rewardPerCall || 4.00;
        dynamicTxs.push({
          id: `call-${call._id}`,
          type: 'Commission',
          amount: callRate,
          status: 'Completed',
          date: call.createdAt || call.startTime,
          method: 'Wallet',
          reference: call._id,
          description: `Com. Appel Validé - ${gigTitle}`,
          gigId: gigId
        });
      }

      // Transaction Commission
      const hasTransaction = call.transaction?.validByReps === true || call.transactionOccurred === true;
      if (hasTransaction && call.transaction?.validByCompany === true) {
        const txRate = gigData?.commission?.transactionCommission || gigData?.rewardPerSale || 30.00;
        dynamicTxs.push({
          id: `tx-${call._id}`,
          type: 'Bonus',
          amount: txRate,
          status: 'Completed',
          date: call.transaction?.updatedAt || call.createdAt,
          method: 'Wallet',
          reference: call._id,
          description: `Com. Vente Validée - ${gigTitle}`,
          gigId: gigId
        });
      }
    });
    
    // Sort by date descending
    return dynamicTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const fetchRealCalls = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      if (!agentId) return;
      const response = await api.calls.getByAgentId(agentId);
      if (response && response.success && Array.isArray(response.data)) {
        setRealCalls(response.data);
        const { available, pending, lifetime } = calculateBalances(response.data);
        setAvailableBalance(available);
        setPendingEarnings(pending);
        setLifetimeEarnings(lifetime);
        
        // Update transaction history
        const callTxs = generateTransactionsFromCalls(response.data);
        setTransactions(prev => {
          // Keep existing Payouts (withdrawals) from the session
          const payouts = prev.filter(t => t.type === 'Payout');
          return [...payouts, ...callTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      }
    } catch (err) {
      console.error('Error fetching real calls for counts in Wallet:', err);
    }
  };

  useEffect(() => {
    fetchRealCalls();

    // Listen to calls state updates
    window.addEventListener('CALLS_STATE_UPDATED', fetchRealCalls);
    return () => {
      window.removeEventListener('CALLS_STATE_UPDATED', fetchRealCalls);
    };
  }, []);

  const getCallCountForGig = (gigId: string) => {
    if (gigId === 'all') return realCalls.length;
    return realCalls.filter(record => {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object' 
        ? (recordGig?._id || (recordGig as any)?.$oid) 
        : recordGig;
      return idStr === gigId;
    }).length;
  };

  const gigsFilterOptions = [
    { id: 'all', title: `Tous les Gigs (${getCallCountForGig('all')})` },
    ...Array.from(new Set(realCalls.map(c => {
      const gig = c.lead?.gigId;
      return typeof gig === 'object' ? (gig?._id || (gig as any)?.$oid) : gig;
    }).filter(Boolean))).map(id => {
      const call = realCalls.find(c => {
        const gig = c.lead?.gigId;
        const gigId = typeof gig === 'object' ? (gig?._id || (gig as any)?.$oid) : gig;
        return gigId === id;
      });
      const title = call?.lead?.gigId?.title || "Projet Sans Titre";
      return { id, title: `${title} (${getCallCountForGig(id)})` };
    })
  ];

  const gigCommissions: Record<string, { rate: string; rules: string; bonus: string }> = {
    all: {
      rate: 'Taux Variable',
      rules: 'Sélectionnez un Gig spécifique pour consulter son barème de commission exact.',
      bonus: 'Bonus actifs'
    },
    '69df585b6cad0fd23cffc2ae': {
      rate: '4.00 € / appel + 30.00 € / transaction',
      rules: "Une transaction est comptabilisée uniquement si le contrat est signé et non rétracté dans les 14 jours. Les résiliations dans les 3 mois suivant la signature entraînent l'annulation et le remboursement de la commission correspondante.",
      bonus: '+100.00 € prime performance (25 transactions/mois)'
    },
    'insurance-premium': {
      rate: '2.00 € / min d\'appel',
      rules: 'Commissions calculées sur la durée totale des appels validés par la compagnie.',
      bonus: '+5.00 € bonus validation'
    },
    'cpf-booster': {
      rate: '2.00 € / min d\'appel',
      rules: 'Applicable sur les appels d\'une durée supérieure à 1 minute avec CPF valide.',
      bonus: '+10.00 € bonus conversion'
    },
    'telecom-pro': {
      rate: '2.00 € / min d\'appel',
      rules: 'Taux standard appliqué sur tous les appels professionnels validés.',
      bonus: 'Aucun bonus'
    }
  };

  const getSelectedGigCommission = () => {
    if (selectedGigId === 'all') return gigCommissions.all;

    // Find a call from this gig to extract live rates
    const callFromGig = realCalls.find(record => {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object' ? (recordGig?._id || (recordGig as any)?.$oid) : recordGig;
      return idStr === selectedGigId;
    });

    if (callFromGig) {
      const gigData = typeof callFromGig.lead?.gigId === 'object' ? callFromGig.lead.gigId : null;
      const callRate = gigData?.commission?.commission_per_call || gigData?.rewardPerCall || 4.00;
      const txRate = gigData?.commission?.transactionCommission || gigData?.rewardPerSale || 30.00;
      
      return {
        rate: `${callRate.toFixed(2)} € / appel + ${txRate.toFixed(2)} € / transaction`,
        rules: gigData?.description || "Barème de commission standard pour ce projet.",
        bonus: gigData?.bonusInfo || 'Aucun bonus actif'
      };
    }

    return gigCommissions[selectedGigId] || {
      rate: 'Non spécifié',
      rules: 'Aucune donnée de commission disponible pour ce projet.',
      bonus: 'Aucun'
    };
  };

  // Fetch wallet and withdrawals from backend
  const fetchWalletData = async () => {
    if (!agentId) return;
    setIsLoadingWallet(true);
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        api.get(`/agent/wallet/${agentId}`),
        api.get(`/agent/withdrawals/${agentId}`)
      ]);

      if (walletRes.data?.success) {
        setAvailableBalance(walletRes.data.data.availableBalance);
        // Pending Earnings = Pending Withdrawals + Pending Commissions
        const pendingTotal = (walletRes.data.data.pendingWithdrawals || 0) + (walletRes.data.data.pendingCommissions || 0);
        setPendingEarnings(pendingTotal);
        setLifetimeEarnings(walletRes.data.data.lifetimeEarnings);
        // Store pending count for the badge
        setPendingTransactionsCount(walletRes.data.data.pendingCount || 0);
      }

      if (withdrawalsRes.data?.success) {
        const formattedWithdrawals = withdrawalsRes.data.data.map((w: any) => ({
          id: w._id,
          type: 'Payout',
          amount: w.amount,
          status: w.status === 'pending' ? 'Processing' : w.status === 'completed' ? 'Completed' : 'Failed',
          date: w.createdAt,
          method: w.method === 'bank' ? 'Bank Transfer' : 'PayPal',
          reference: w.reference,
          description: w.description
        }));
        setBackendWithdrawals(formattedWithdrawals);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [agentId]);

  // Sync state changes with localStorage and emit sync event
  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  const getWeeklyEarnings = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return realCalls.reduce((total, call) => {
      const callDate = new Date(call.createdAt || call.startTime);
      if (callDate >= oneWeekAgo) {
        const gigData = typeof call.lead?.gigId === 'object' ? call.lead.gigId : null;
        const callRate = gigData?.commission?.commission_per_call || gigData?.rewardPerCall || 4.00;
        const txRate = gigData?.commission?.transactionCommission || gigData?.rewardPerSale || 30.00;
        
        if (call.companyValidation === 'approved') {
          total += callRate;
        }
        if (call.transaction?.validByCompany === true) {
          total += txRate;
        }
      }
      return total;
    }, 0);
  };

  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  // Stateful transaction log
  const [transactions, setTransactions] = useState<any[]>([]);

  // Update transactions list when backend data or calls change
  useEffect(() => {
    const callTxs = generateTransactionsFromCalls(realCalls);
    setTransactions([...backendWithdrawals, ...callTxs]);
  }, [realCalls, backendWithdrawals]);



  // Withdrawal Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1 = Entry, 2 = 2FA, 3 = Success
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [lastWithdrawal, setLastWithdrawal] = useState<any>(null);
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
      setValidationError(`Le montant dépasse votre solde disponible de ${availableBalance.toFixed(2)}€.`);
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
    
    try {
      const res = await api.post('/agent/withdraw', {
        agentId,
        amount: parsedAmount,
        method: selectedMethod,
        methodDetails: selectedMethod === 'bank' ? 'Bank Account (...4567)' : 'PayPal (john.doe@example.com)'
      });

      if (res.data?.success) {
        setLastWithdrawal(res.data.withdrawal);
        showToast(`Demande de retrait de ${parsedAmount.toFixed(2)}€ envoyée avec succès.`, 'success');
        fetchWalletData(); // Refresh wallet data
        setWithdrawStep(3); // Go to Success page
      } else {
        setValidationError(res.data?.error || 'Échec du traitement du retrait.');
      }
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      setValidationError(err.response?.data?.error || 'Une erreur est survenue lors du retrait.');
    }
  };

  const balanceStats = [
    {
      title: t('wallet.availableBalance'),
      amount: `${availableBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
      icon: Wallet,
      change: `+${getWeeklyEarnings().toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ cette semaine`,
      status: 'positive'
    },
    {
      title: t('wallet.pendingEarnings'),
      amount: `${pendingEarnings.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
      icon: Clock,
      change: `${pendingTransactionsCount} transactions en attente`,
      status: 'neutral'
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div>
        <div className="space-y-6">
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historique de Retraits & Commissions</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Gig Filter */}
                      <select
                        value={selectedGigId}
                        onChange={(e) => setSelectedGigId(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        {gigsFilterOptions.map(gig => (
                          <option key={gig.id} value={gig.id}>{gig.title}</option>
                        ))}
                      </select>

                      {/* Transaction Filter */}
                      <select
                        value={transactionValidationFilter}
                        onChange={(e) => setTransactionValidationFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="all">Toutes les Ventes</option>
                        <option value="validated">Ventes Validées</option>
                        <option value="pending">Ventes en Attente</option>
                        <option value="rejected">Ventes Refusées</option>
                        <option value="to_validate">À Valider (Moi)</option>
                      </select>

                      <select
                        value={selectedDateRange}
                        onChange={(e) => setSelectedDateRange(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                        <option value="last-month">Last Month</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {transactions
                    .filter(tx => {
                      // Apply Gig Filter if it's a commission transaction
                      if (selectedGigId !== 'all' && tx.gigId && tx.gigId !== selectedGigId) return false;
                      
                      // Apply Status Filter
                      if (transactionValidationFilter !== 'all') {
                        if (transactionValidationFilter === 'validated' && tx.status !== 'Completed') return false;
                        if (transactionValidationFilter === 'pending' && tx.status !== 'Pending') return false;
                        // Note: current transactions state doesn't have 'Rejected' status, but we can extend it
                      }
                      
                      return true;
                    })
                    .map((transaction) => (
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
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Suivi des Appels éligibles aux commissions
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Total : {getCallCountForGig('all')} appels
                      </span>
                      {selectedGigId !== 'all' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          Ce Gig : {getCallCountForGig(selectedGigId)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase">
                      Chaque appel validé par l'entreprise crédite votre solde de gains.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Filtrer par Gig :</span>
                      <select
                        value={selectedGigId}
                        onChange={(e) => setSelectedGigId(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {gigsFilterOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Appels :</span>
                      <select
                        value={callValidationFilter}
                        onChange={(e) => setCallValidationFilter(e.target.value as any)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Tous les appels</option>
                        <option value="approved">Validés uniquement</option>
                        <option value="pending">En attente / Non validés</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Transactions :</span>
                      <select
                        value={transactionValidationFilter}
                        onChange={(e) => setTransactionValidationFilter(e.target.value as any)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Toutes les transactions</option>
                        <option value="approved">Validées (Signées)</option>
                        <option value="refused">Refusées</option>
                        <option value="pending">À valider (En attente)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Remboursement / Commission de Gig Info Banner */}
                <div className="mx-6 mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-500/15 text-blue-600 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-widest block">Barème de Commission</span>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
                        {getSelectedGigCommission().rules}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Commission</span>
                    <span className="text-sm font-black text-blue-600 block mt-0.5">
                      {getSelectedGigCommission().rate}
                    </span>
                    {getSelectedGigCommission().bonus !== 'Aucun bonus' && (
                      <span className="inline-block text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md mt-1.5">
                        {getSelectedGigCommission().bonus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <CallRecords 
                    gigId={selectedGigId === 'all' ? undefined : selectedGigId} 
                    callValidationFilter={callValidationFilter}
                    transactionValidationFilter={transactionValidationFilter}
                  />
                </div>
              </>
            )}
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
                      Max: {availableBalance.toFixed(2)}€
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-black text-xs">€</span>
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
                        {quick}€
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
                    Félicitations, votre demande de {parseFloat(withdrawAmount).toFixed(2)}€ a été enregistrée.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left max-w-xs mx-auto text-xs font-bold space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Montant</span>
                    <span className="text-slate-800 font-black">{parseFloat(withdrawAmount).toFixed(2)}€</span>
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
                    <span>{lastWithdrawal?.reference || 'WTH-PENDING'}</span>
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