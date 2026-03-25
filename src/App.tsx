import React, { useState } from 'react';
import { AppProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Pedidos } from './pages/Pedidos';
import { Entradas } from './pages/Entradas';
import { Stock } from './pages/Stock';
import { Faltas } from './pages/Faltas';
import { Settings } from './pages/Settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pedidos':
        return <Pedidos />;
      case 'entradas':
        return <Entradas />;
      case 'stock':
        return <Stock />;
      case 'faltas':
        return <Faltas />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto p-8">
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}
