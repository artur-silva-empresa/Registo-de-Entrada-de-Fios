import React, { createContext, useContext, useEffect, useState } from 'react';

export type RequestItem = {
  id: string;
  requestId: string;
  section: string;
  quantity: number;
  unit?: string;
  description: string;
  coneColor: string;
  observations: string;
};

export type Request = {
  id: string;
  date: string;
  number: string;
  uploadDate: string;
};

export type Delivery = {
  id: string;
  itemId: string;
  quantity: number;
  date: string;
  deliveryNote?: string;
  deliveryDate?: string;
  observations?: string;
};

type AppState = {
  requests: Request[];
  items: RequestItem[];
  deliveries: Delivery[];
};

type AppContextType = {
  state: AppState;
  addRequest: (request: Omit<Request, 'id' | 'uploadDate'>, items: Omit<RequestItem, 'id' | 'requestId'>[]) => void;
  addDelivery: (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => void;
  deleteRequest: (id: string) => void;
  clearAll: () => void;
  importData: (data: AppState) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'fios_app_data';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setState(data);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load from backend', e);
      }
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setState(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load state from localStorage', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      
      // Sync to backend SQLite
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(err => console.error('Failed to sync to SQLite:', err));
    }
  }, [state, isLoading]);

  const addRequest = async (req: Omit<Request, 'id' | 'uploadDate'>, newItems: Omit<RequestItem, 'id' | 'requestId'>[]) => {
    const requestId = crypto.randomUUID();
    const request: Request = {
      ...req,
      id: requestId,
      uploadDate: new Date().toISOString(),
    };

    const items: RequestItem[] = newItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      requestId,
    }));

    setState(prev => ({
      ...prev,
      requests: [request, ...prev.requests],
      items: [...prev.items, ...items],
    }));
  };

  const addDelivery = async (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => {
    const delivery: Delivery = {
      id: crypto.randomUUID(),
      itemId,
      quantity,
      date: new Date().toISOString(),
      deliveryNote,
      deliveryDate,
      observations,
    };

    setState(prev => ({
      ...prev,
      deliveries: [delivery, ...prev.deliveries],
    }));
  };

  const deleteRequest = async (id: string) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== id),
      items: prev.items.filter(i => i.requestId !== id),
      deliveries: prev.deliveries.filter(d => {
        const item = prev.items.find(i => i.id === d.itemId);
        return item?.requestId !== id;
      }),
    }));
  };

  const clearAll = async () => {
    setState({ requests: [], items: [], deliveries: [] });
  };

  const importData = (data: AppState) => {
    setState(data);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">A carregar dados...</div>;
  }

  return (
    <AppContext.Provider value={{ state, addRequest, addDelivery, deleteRequest, clearAll, importData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
