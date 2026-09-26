import React, { useState, useEffect } from 'react';
import DashboardNavbar from './DashboardNavbar';
import DashboardOverview from './DashboardOverview';
import AnalyticsView from './AnalyticsView';
import TransactionsView from './TransactionsView';
import AIChatWidget from './AIChatWidget';
import SettingsView from './SettingsView';
import AddTransactionModal from './AddTransactionModal';
import { saveUserCredentialsToFirebase } from '../../firebase';

export default function Dashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'analytics' | 'transactions' | 'ai-chat' | 'settings'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState('');

  const handleNavigateToChat = (queryText) => {
    if (queryText) {
      setChatInitialQuery(queryText);
    }
    setActiveTab('ai-chat');
  };

  const [transactions, setTransactions] = useState([]);

  // Sync user credentials with Firebase & fetch live transactions from Neon DB
  const fetchLiveTransactions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/transactions?user_id=usr-001');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setTransactions(data.transactions || []);
        }
      }
    } catch (err) {
      console.warn('Could not fetch live transactions in Dashboard parent component:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      saveUserCredentialsToFirebase(currentUser);
    }
    fetchLiveTransactions();
  }, [currentUser]);

  const handleAddTransaction = (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);
    // Refresh live list from Neon DB
    setTimeout(fetchLiveTransactions, 500);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <DashboardNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <main className="container" style={{ flex: 1, padding: '32px 24px 60px 24px' }}>
        {activeTab === 'overview' && (
          <DashboardOverview
            transactions={transactions}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onNavigateToChat={handleNavigateToChat}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView currentUser={currentUser} transactions={transactions} />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        )}

        {activeTab === 'ai-chat' && (
          <AIChatWidget initialQuery={chatInitialQuery} currentUser={currentUser} />
        )}

        {activeTab === 'settings' && (
          <SettingsView currentUser={currentUser} onLogout={onLogout} />
        )}
      </main>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
      />
    </div>
  );
}
