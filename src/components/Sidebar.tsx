import React from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, BarChart3, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos de Fio', icon: FileSpreadsheet },
    { id: 'entradas', label: 'Entradas (Receção)', icon: PackageCheck },
    { id: 'stock', label: 'Stock / Faltas', icon: BarChart3 },
    { id: 'faltas', label: 'Relatório de Faltas', icon: AlertTriangle },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">
            L
          </div>
          Gestão de Fios
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-red-600" : "text-slate-400")} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => onNavigate('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
            currentPage === 'settings'
              ? "bg-slate-100 text-slate-900" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings className={cn("w-5 h-5", currentPage === 'settings' ? "text-red-600" : "text-slate-400")} />
          Configurações
        </button>
      </div>
    </div>
  );
}
