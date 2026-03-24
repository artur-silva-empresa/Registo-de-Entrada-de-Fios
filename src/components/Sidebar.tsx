import React from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, BarChart3, Database, DatabaseZap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store';

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { isConnected, connectToDb } = useAppStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos de Fio', icon: FileSpreadsheet },
    { id: 'entradas', label: 'Entradas (Receção)', icon: PackageCheck },
    { id: 'stock', label: 'Stock / Faltas', icon: BarChart3 },
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

      <div className="p-4 border-t border-slate-200 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base de Dados</span>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
          )} />
        </div>

        <button
          onClick={connectToDb}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            isConnected
              ? "bg-slate-50 text-slate-700 hover:bg-slate-100"
              : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-sm"
          )}
        >
          {isConnected ? (
            <>
              <DatabaseZap className="w-4 h-4 text-emerald-600" />
              Alterar SQLite
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-red-600 animate-pulse" />
              Selecionar SQLite
            </>
          )}
        </button>

        {!isConnected && (
          <p className="text-[10px] text-red-500 px-2 leading-tight">
            Selecione o ficheiro na rede para começar.
          </p>
        )}
      </div>
    </div>
  );
}
