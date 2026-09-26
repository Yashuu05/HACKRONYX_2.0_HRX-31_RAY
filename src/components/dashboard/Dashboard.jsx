import React, { useState, useEffect } from 'react';
import DashboardNavbar from './DashboardNavbar';
import DashboardOverview from './DashboardOverview';
import AnalyticsView from './AnalyticsView';
import TransactionsView from './TransactionsView';
import AIChatWidget from './AIChatWidget';
import SettingsView from './SettingsView';
import AddTransactionModal from './AddTransactionModal';
import { INITIAL_FORECAST_DATA } from '../../utils/mockData';
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

  // Initial Mock Transactions for Student Persona (Riya Sharma)
  const [transactions, setTransactions] = useState([
    { id: 'tx-101', description: 'Family Bank Transfer', amount: 4000, type: 'income', category: 'Family Transfer', date: '2026-10-20', time: '10:30 AM', status: 'Completed' },
    { id: 'tx-102', description: 'Mess & Hostel Fee Debit', amount: 2500, type: 'expense', category: 'Mess & Hostel', date: '2026-10-24', time: '09:15 AM', status: 'Protected' },
    { id: 'tx-103', description: 'Laptop Screen Repair (UPI)', amount: 1800, type: 'expense', category: 'UPI Merchant', date: '2026-10-21', time: '04:45 PM', status: 'Completed' },
    { id: 'tx-104', description: 'Swiggy Food Delivery', amount: 350, type: 'expense', category: 'UPI Merchant', date: '2026-10-18', time: '01:20 PM', status: 'Completed' },
    { id: 'tx-105', description: 'College Canteen UPI', amount: 150, type: 'expense', category: 'UPI Merchant', date: '2026-10-17', time: '11:10 AM', status: 'Completed' },
    { id: 'tx-106', description: 'Freelance Design Stipend', amount: 2000, type: 'income', category: 'Stipend / Salary', date: '2026-10-29', time: '05:00 PM', status: 'Scheduled' }
  ]);

  const [forecastData, setForecastData] = useState(INITIAL_FORECAST_DATA);

  // Sync user credentials with Firebase
  useEffect(() => {
    if (currentUser) {
      saveUserCredentialsToFirebase(currentUser);
    }
  }, [currentUser]);

  const handleAddTransaction = (newTx) => {
    setTransactions((prev) => [newTx, ...prev]);

    // Recalculate forecast data dynamically
    setForecastData((prev) => {
      return prev.map((item) => {
        if (newTx.type === 'expense') {
          return {
            ...item,
            expected: Math.max(1000, item.expected - newTx.amount * 0.5),
            best: Math.max(1000, item.best - newTx.amount * 0.4),
            worst: Math.max(1000, item.worst - newTx.amount * 0.6)
          };
        } else {
          return {
            ...item,
            expected: item.expected + newTx.amount * 0.8,
            best: item.best + newTx.amount,
            worst: item.worst + newTx.amount * 0.6
          };
        }
      });
    });
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
            forecastData={forecastData}
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
