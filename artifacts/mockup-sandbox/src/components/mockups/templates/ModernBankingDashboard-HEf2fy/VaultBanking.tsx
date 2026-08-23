import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Search,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Coffee,
  ShoppingBag,
  Zap,
  Home,
  Plane,
  MonitorSmartphone,
  ChevronRight,
  Send,
  User,
  Plus,
  Bell,
  Settings,
  MoreHorizontal,
  Building,
  Film
} from 'lucide-react';
import { cn } from './lib/utils';

// --- DATA ---

type AccountId = 'all' | 'chk' | 'sav' | 'cred';

interface Account {
  id: AccountId;
  name: string;
  balance: number;
  type: string;
  number: string;
  icon: any;
  color: string;
  bgClass: string;
}

interface Transaction {
  id: string;
  accountId: AccountId;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending';
}

const ACCOUNTS: Account[] = [
  { id: 'chk', name: 'Everyday Checking', balance: 4250.75, type: 'Checking', number: '•••• 4092', icon: Wallet, color: 'text-emerald-700', bgClass: 'bg-emerald-50' },
  { id: 'sav', name: 'High-Yield Savings', balance: 18450.00, type: 'Savings', number: '•••• 1184', icon: PiggyBank, color: 'text-blue-700', bgClass: 'bg-blue-50' },
  { id: 'cred', name: 'Rewards Credit', balance: -1240.50, type: 'Credit', number: '•••• 8821', icon: CreditCard, color: 'text-zinc-700', bgClass: 'bg-zinc-100' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 't1', accountId: 'chk', merchant: 'Whole Foods Market', category: 'Groceries', date: '2023-10-24T14:30:00Z', amount: 84.50, type: 'debit', status: 'completed' },
  { id: 't2', accountId: 'cred', merchant: 'Apple Store', category: 'Electronics', date: '2023-10-23T10:15:00Z', amount: 1299.00, type: 'debit', status: 'completed' },
  { id: 't3', accountId: 'chk', merchant: 'Stripe Payout', category: 'Income', date: '2023-10-22T09:00:00Z', amount: 3450.00, type: 'credit', status: 'completed' },
  { id: 't4', accountId: 'chk', merchant: 'Starbucks', category: 'Food & Dining', date: '2023-10-22T08:15:00Z', amount: 5.40, type: 'debit', status: 'completed' },
  { id: 't5', accountId: 'sav', merchant: 'Monthly Transfer', category: 'Transfer', date: '2023-10-20T12:00:00Z', amount: 500.00, type: 'credit', status: 'completed' },
  { id: 't6', accountId: 'cred', merchant: 'Uber', category: 'Transit', date: '2023-10-19T18:45:00Z', amount: 24.50, type: 'debit', status: 'completed' },
  { id: 't7', accountId: 'chk', merchant: 'ConEd Power', category: 'Utilities', date: '2023-10-18T09:30:00Z', amount: 145.20, type: 'debit', status: 'completed' },
  { id: 't8', accountId: 'cred', merchant: 'Netflix', category: 'Entertainment', date: '2023-10-15T10:00:00Z', amount: 15.99, type: 'debit', status: 'completed' },
  { id: 't9', accountId: 'chk', merchant: 'Sweetgreen', category: 'Food & Dining', date: '2023-10-14T08:30:00Z', amount: 12.50, type: 'debit', status: 'completed' },
  { id: 't10', accountId: 'chk', merchant: 'Salary', category: 'Income', date: '2023-10-01T09:00:00Z', amount: 4200.00, type: 'credit', status: 'completed' },
  { id: 't11', accountId: 'cred', merchant: 'Amazon', category: 'Shopping', date: '2023-10-12T14:20:00Z', amount: 45.00, type: 'debit', status: 'completed' },
  { id: 't12', accountId: 'cred', merchant: 'Delta Airlines', category: 'Travel', date: '2023-10-10T16:45:00Z', amount: 450.00, type: 'debit', status: 'completed' },
];

const CATEGORY_ICONS: Record<string, any> = {
  'Groceries': ShoppingBag,
  'Electronics': MonitorSmartphone,
  'Income': ArrowDownLeft,
  'Food & Dining': Coffee,
  'Transfer': ArrowRightLeft,
  'Transit': Plane, // placeholder for car
  'Utilities': Zap,
  'Entertainment': Film,
  'Shopping': ShoppingBag,
  'Travel': Plane
};

const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#10b981', // emerald-500
  'Electronics': '#3b82f6', // blue-500
  'Food & Dining': '#f59e0b', // amber-500
  'Transit': '#8b5cf6', // violet-500
  'Utilities': '#ef4444', // red-500
  'Entertainment': '#ec4899', // pink-500
  'Shopping': '#14b8a6', // teal-500
  'Travel': '#6366f1', // indigo-500
  'Other': '#94a3b8' // zinc-400
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function VaultBanking() {
  const [activeAccountId, setActiveAccountId] = useState<AccountId>('all');
  const [activeTab, setActiveTab] = useState<'transactions' | 'insights'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Right panel states
  const [sendAmount, setSendAmount] = useState('0');
  const [sendRecipient, setSendRecipient] = useState('');

  const filteredTransactions = useMemo(() => {
    return TRANSACTIONS.filter(t => {
      const matchAccount = activeAccountId === 'all' || t.accountId === activeAccountId;
      const matchSearch = t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAccount && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeAccountId, searchQuery]);

  const spendingByCategory = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'debit');
    const totals: Record<string, number> = {};
    let totalSpend = 0;
    
    expenses.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      totalSpend += t.amount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, percentage: (value / totalSpend) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const handleSendMoney = () => {
    if (parseFloat(sendAmount) > 0 && sendRecipient) {
      alert(`Money sent to ${sendRecipient}!`);
      setSendAmount('0');
      setSendRecipient('');
    }
  };

  return (
    <div className="w-full h-full bg-zinc-50 text-zinc-900 font-sans overflow-hidden flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-zinc-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
            V
          </div>
          <span className="font-semibold text-xl tracking-tight">Vault</span>
        </div>
        
        <nav className="flex items-center gap-8 text-sm font-medium text-zinc-500">
          <a href="#" className="text-zinc-900">Dashboard</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Payments</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Cards</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Investments</a>
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <Search size={20} />
          </button>
          <button className="text-zinc-400 hover:text-zinc-600 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-px h-6 bg-zinc-200 mx-2"></div>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1.5 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">
              JS
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 px-8 py-8">
          
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-1">Good morning, Julian.</h1>
            <p className="text-zinc-500">Here's what's happening with your money today.</p>
          </div>

          {/* Account Cards */}
          <div className="flex gap-4 mb-8">
            <div 
              onClick={() => setActiveAccountId('all')}
              className={cn(
                "flex-1 p-5 rounded-2xl border cursor-pointer transition-all duration-200",
                activeAccountId === 'all' 
                  ? "border-emerald-500 ring-1 ring-emerald-500 bg-white shadow-sm" 
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                  <Building size={20} />
                </div>
                <span className="text-xs font-medium text-zinc-500">All Accounts</span>
              </div>
              <div className="text-sm text-zinc-500 font-medium mb-1">Total Balance</div>
              <div className="text-2xl font-semibold">
                {formatCurrency(ACCOUNTS.reduce((sum, a) => sum + a.balance, 0))}
              </div>
            </div>

            {ACCOUNTS.map(acc => {
              const Icon = acc.icon;
              const isActive = activeAccountId === acc.id;
              return (
                <div 
                  key={acc.id}
                  onClick={() => setActiveAccountId(acc.id)}
                  className={cn(
                    "flex-1 p-5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden",
                    isActive 
                      ? "border-emerald-500 ring-1 ring-emerald-500 bg-white shadow-sm" 
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", acc.bgClass, acc.color)}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500">{acc.number}</span>
                  </div>
                  <div className="text-sm text-zinc-500 font-medium mb-1 relative z-10">{acc.name}</div>
                  <div className="text-2xl font-semibold relative z-10">{formatCurrency(acc.balance)}</div>
                </div>
              );
            })}
          </div>

          {/* Tabs and Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex p-1 bg-zinc-100 rounded-lg">
              <button 
                onClick={() => setActiveTab('transactions')}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === 'transactions' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Transactions
              </button>
              <button 
                onClick={() => setActiveTab('insights')}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === 'insights' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Insights
              </button>
            </div>

            {activeTab === 'transactions' && (
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Transactions List */}
          {activeTab === 'transactions' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 shadow-sm">
              <div className="overflow-y-auto p-2 flex-1">
                {filteredTransactions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8">
                    <Search size={32} className="mb-4 text-zinc-300" />
                    <p>No transactions found.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredTransactions.map(tx => {
                      const Icon = CATEGORY_ICONS[tx.category] || ShoppingBag;
                      const isCredit = tx.type === 'credit';
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:bg-white transition-colors">
                              <Icon size={18} />
                            </div>
                            <div>
                              <div className="font-medium text-zinc-900">{tx.merchant}</div>
                              <div className="text-xs text-zinc-500 flex items-center gap-2">
                                <span>{tx.category}</span>
                                <span>•</span>
                                <span>{formatDate(tx.date)}</span>
                                {activeAccountId === 'all' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-400">{ACCOUNTS.find(a => a.id === tx.accountId)?.type}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "font-medium",
                              isCredit ? "text-emerald-600" : "text-zinc-900"
                            )}>
                              {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                            </div>
                            {tx.status === 'pending' && (
                              <div className="text-xs text-zinc-400">Pending</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insights View */}
          {activeTab === 'insights' && (
            <div className="flex-1 flex gap-6 min-h-0">
              <div className="flex-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <h3 className="font-medium mb-6">Spending by Category</h3>
                
                {spendingByCategory.length > 0 ? (
                  <div className="flex items-center gap-12 flex-1">
                    {/* Hand-drawn SVG Donut */}
                    <div className="relative w-48 h-48 flex-shrink-0 mx-auto">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {(() => {
                          let cumulativePercent = 0;
                          return spendingByCategory.map((cat, i) => {
                            const startPercent = cumulativePercent;
                            cumulativePercent += cat.percentage;
                            
                            const startAngle = (startPercent / 100) * Math.PI * 2;
                            const endAngle = (cumulativePercent / 100) * Math.PI * 2;
                            
                            const radius = 40;
                            const cx = 50;
                            const cy = 50;
                            
                            const x1 = cx + radius * Math.cos(startAngle);
                            const y1 = cy + radius * Math.sin(startAngle);
                            const x2 = cx + radius * Math.cos(endAngle);
                            const y2 = cy + radius * Math.sin(endAngle);
                            
                            const largeArcFlag = cat.percentage > 50 ? 1 : 0;
                            
                            const pathData = [
                              `M ${x1} ${y1}`,
                              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
                            ].join(' ');
                            
                            return (
                              <path 
                                key={cat.name}
                                d={pathData}
                                fill="none"
                                stroke={CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['Other']}
                                strokeWidth="12"
                                strokeLinecap="round"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            );
                          });
                        })()}
                        {/* Inner empty circle to ensure donut look */}
                        <circle cx="50" cy="50" r="34" fill="white" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs text-zinc-500 font-medium">Total Spend</span>
                        <span className="font-semibold text-zinc-900">
                          {formatCurrency(spendingByCategory.reduce((sum, c) => sum + c.value, 0))}
                        </span>
                      </div>
                    </div>

                    {/* Legend / List */}
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-4">
                      {spendingByCategory.map(cat => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['Other'] }}
                            />
                            <span className="text-sm font-medium text-zinc-700">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-zinc-900">{formatCurrency(cat.value)}</span>
                            <span className="text-xs text-zinc-400 w-8 text-right">{Math.round(cat.percentage)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400">
                    No spending data for this selection.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Send Money */}
        <aside className="w-[320px] bg-white border-l border-zinc-200 shrink-0 p-6 flex flex-col overflow-y-auto">
          <div className="mb-8">
            <h3 className="font-medium text-lg mb-1">Quick Transfer</h3>
            <p className="text-sm text-zinc-500">Send money instantly.</p>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-zinc-500">Amount</span>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">USD</span>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-semibold text-zinc-400 mb-1">$</span>
              <input 
                type="number" 
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="text-4xl font-semibold bg-transparent w-full focus:outline-none text-zinc-900"
                placeholder="0"
              />
            </div>
            <div className="text-xs text-zinc-500">Available: {formatCurrency(ACCOUNTS[0].balance)}</div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-700 block mb-2">To recipient</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                placeholder="Name, @cashtag, or email"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="text-sm font-medium text-zinc-700 block mb-3">Recent</label>
            <div className="flex gap-4">
              {['Alex', 'Sarah', 'Mom'].map((name, i) => (
                <div key={name} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => setSendRecipient(name)}>
                  <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-colors">
                    {name[0]}
                  </div>
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-900">{name}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 group-hover:border-zinc-400 group-hover:bg-zinc-50 transition-colors">
                  <Search size={16} />
                </div>
                <span className="text-xs text-zinc-500">Find</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSendMoney}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-colors mt-auto"
          >
            <Send size={16} />
            Send money
          </button>
        </aside>
      </div>
    </div>
  );
}
