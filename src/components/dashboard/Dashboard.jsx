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

  // Track collapsed state for sidebar (240 expanded, 72 collapsed)
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-canvas)', display: 'flex', position: 'relative' }}>
      {/* Sidebar — in-flow sticky flex item */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        currentUser={currentUser}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
        onCollapseChange={setCollapsed}
      />

      {/* Main content area — naturally positioned adjacent to sidebar, never overlapping */}
      <main style={{
        flex: 1,
        minWidth: 0,
        minHeight: '100vh',
        padding: activeTab === 'matrix' ? '0' : (activeTab === 'ai-chat' ? '20px 28px' : '32px 28px 60px 28px'),
        backgroundColor: 'var(--bg-canvas)',
        boxSizing: 'border-box',
        overflowX: 'hidden'
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
