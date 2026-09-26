import React, { useState, useEffect } from 'react';
import { Search, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from 'lucide-react';

export default function TransactionsView({ transactions: propTransactions, onOpenAddModal }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'income' | 'expense' | 'essential'
  const [searchQuery, setSearchQuery] = useState('');
  const [dbTransactions, setDbTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real-time transactions from Neon PostgreSQL backend
  const fetchTransactionsFromDB = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `http://localhost:8000/api/transactions?user_id=usr-001&activity_type=${filterType}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'success') {
        setDbTransactions(data.transactions || []);
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.warn('PostgreSQL fetch fallback to local state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsFromDB();
  }, [filterType, searchQuery]);

  // Use database transactions if available, otherwise fallback to props
  const displayList = dbTransactions.length > 0 || !error ? dbTransactions : propTransactions.map(t => ({
    transaction_id: t.id,
    description: t.description,
    category: t.category,
    activity_type: t.type,
    amount: t.amount,
    transaction_date: t.date,
    transaction_time: t.time || '10:00 AM',
    status: t.status || 'Completed',
    net_balance: t.type === 'income' ? t.amount : -t.amount
  }));

  const filteredTx = displayList.filter((tx) => {
    // If essential filter is selected client-side
    if (filterType === 'essential') {
      return (tx.category.toLowerCase().includes('mess') || 
              tx.category.toLowerCase().includes('hostel') || 
              tx.category.toLowerCase().includes('rent') ||
              tx.category.toLowerCase().includes('utility'));
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Transaction ID,Description,Activity Type,Category,Amount,Net Balance,Date,Time,Status\n'];
    const rows = filteredTx.map(t => 
      `"${t.transaction_id}","${t.description}","${t.activity_type}","${t.category}",${t.amount},${t.net_balance || 0},"${t.transaction_date}","${t.transaction_time}","${t.status}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow_guardian_transactions_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="heading-lg" style={{ fontSize: '28px', marginBottom: '4px' }}>
            Transactions & Account Statements
          </h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time PostgreSQL audit trail of ingested bank and UPI transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchTransactionsFromDB} className="btn btn-secondary btn-sm" title="Refresh Live DB Logs">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh DB</span>
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Search Field */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by merchant, description, or category in PostgreSQL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Pills (Triggers PostgreSQL activity_type Query) */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {['all', 'income', 'expense', 'essential'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filterType === f ? '#FFFFFF' : 'transparent',
                color: filterType === f ? 'var(--brand-blue)' : 'var(--text-secondary)',
                boxShadow: filterType === f ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f === 'essential' ? 'Essential Bills' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--brand-blue)' }} />
            <span>Fetching live transaction records from PostgreSQL...</span>
          </div>
        ) : filteredTx.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <span>No transactions found for filter "{filterType}".</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Transaction / Merchant & ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Category</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Date & Time</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((tx, idx) => {
                const isIncome = tx.activity_type === 'income';
                return (
                  <tr key={tx.transaction_id || idx} style={{ borderBottom: idx === filteredTx.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    {/* Transaction / Merchant & ID */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          backgroundColor: isIncome ? '#ECFDF5' : '#FEF2F2',
                          color: isIncome ? '#10B981' : '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${isIncome ? '#A7F3D0' : '#FCA5A5'}`
                        }}>
                          {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{tx.description}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: #{tx.transaction_id ? String(tx.transaction_id).slice(0, 18) : 'tx-local'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>
                        {tx.category}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {tx.transaction_date} {tx.transaction_time && `• ${tx.transaction_time.slice(0, 5)}`}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge ${tx.status === 'Protected' ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: '11px' }}>
                        {tx.status || 'Completed'}
                      </span>
                    </td>

                    {/* Amount (Incoming Green Arrow for Income/Credit, Outgoing Red Arrow for Expense/Debit) */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontWeight: '800',
                      fontSize: '15px',
                      color: isIncome ? '#10B981' : '#EF4444'
                    }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{isIncome ? '+' : '-'} ₹ {Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </td>

                    {/* Net Balance Column */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontWeight: '700',
                      fontSize: '14px',
                      fontFamily: 'var(--font-mono)',
                      color: (tx.net_balance || 0) >= 0 ? 'var(--text-primary)' : '#EF4444'
                    }}>
                      ₹ {Number(tx.net_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

