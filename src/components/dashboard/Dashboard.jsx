import React, { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardNavbar';
import DashboardOverview from './DashboardOverview';
import AnalyticsView from './AnalyticsView';
import TransactionsView from './TransactionsView';
import AIChatWidget from './AIChatWidget';
import SettingsView from './SettingsView';
import AddTransactionModal from './AddTransactionModal';
import MatrixExplanation from './MatrixExplanation';
import { saveUserCredentialsToFirebase } from '../../firebase';

export default function Dashboard({ currentUser, onLogout, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(240);

  const handleNavigateToChat = (queryText) => {
    if (queryText) setChatInitialQuery(queryText);
    setActiveTab('ai-chat');
  };

  const activeUserId = currentUser?.user_id || currentUser?.id || 'usr-001';
  const [transactions, setTransactions] = useState([]);

  const fetchLiveTransactions = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/transactions?user_id=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.warn('Could not fetch live transactions:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      saveUserCredentialsToFirebase(currentUser);
      fetch('http://localhost:8000/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: activeUserId,
          name: currentUser.full_name || currentUser.name || ('User ' + activeUserId)
        })
      }).catch(err => console.warn('Could not sync user to Neon DB:', err));
    }
    fetchLiveTransactions();
  }, [currentUser, activeUserId]);

  const handleAddTransaction = (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTimeout(fetchLiveTransactions, 500);
  };

  // Track collapsed state for sidebar offset (240 expanded, 72 collapsed)
  // We pass a callback down to sidebar to track width changes
  const [collapsed, setCollapsed] = useState(false);
  const contentOffset = collapsed ? '72px' : '240px';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex' }}>
      {/* Sidebar — fixed position, takes no flow space */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        currentUser={currentUser}
        onLogout={onLogout}
        onCollapseChange={setCollapsed}
      />

      {/* Main content area — offset by sidebar width */}
      <main style={{
        flex: 1,
        marginLeft: contentOffset,
        minHeight: '100vh',
        transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        padding: activeTab === 'matrix' ? '0' : (activeTab === 'ai-chat' ? '20px 24px 20px 24px' : '32px 28px 60px 28px'),
        backgroundColor: 'var(--bg-canvas)',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'overview' && (
          <DashboardOverview
            currentUser={currentUser}
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
            currentUser={currentUser}
            transactions={transactions}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        )}
        {activeTab === 'ai-chat' && (
          <AIChatWidget initialQuery={chatInitialQuery} currentUser={currentUser} />
        )}
        {activeTab === 'matrix' && (
          <MatrixExplanation />
        )}
        {activeTab === 'settings' && (
          <SettingsView currentUser={currentUser} onLogout={onLogout} />
        )}
      </main>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        currentUser={currentUser}
      />
    </div>
  );
}
