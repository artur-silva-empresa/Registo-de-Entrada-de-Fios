import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as db from './lib/database';

export type RequestItem = {
  id: string;
  requestId: string;
  section: string;
  quantity: number;
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
  addRequest: (request: Omit<Request, 'id' | 'uploadDate'>, items: Omit<RequestItem, 'id' | 'requestId'>[]) => Promise<void>;
  addDelivery: (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isConnected: boolean;
  connectToDb: () => Promise<void>;
  refreshData: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ requests: [], items: [], deliveries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const fetchData = useCallback(async () => {
    if (!db.isConnected()) return;

    try {
      const requests = db.query('SELECT * FROM requests ORDER BY uploadDate DESC') as Request[];
      const items = db.query('SELECT * FROM items') as RequestItem[];
      const deliveries = db.query('SELECT * FROM deliveries') as Delivery[];

      setState({ requests, items, deliveries });
    } catch (e) {
      console.error('Failed to fetch data from SQLite', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const connected = await db.initDatabase();
        setIsConnected(connected);
        if (connected) {
          await fetchData();
        }
      } catch (e) {
        console.error('Failed to init database', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchData]);

  // Polling for real-time (every 10 seconds)
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(async () => {
      try {
        const reloaded = await db.reloadDatabase();
        if (reloaded) {
          await fetchData();
        }
      } catch (e) {
        console.error('Polling failed', e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, fetchData]);

  const connectToDb = async () => {
    try {
      const success = await db.selectFile();
      setIsConnected(success);
      if (success) {
        await fetchData();
      }
    } catch (e) {
      console.error('Failed to select file', e);
    }
  };

  const addRequest = async (req: Omit<Request, 'id' | 'uploadDate'>, newItems: Omit<RequestItem, 'id' | 'requestId'>[]) => {
    const requestId = crypto.randomUUID();
    const uploadDate = new Date().toISOString();

    await db.execute(
      'INSERT INTO requests (id, date, number, uploadDate) VALUES (?, ?, ?, ?)',
      [requestId, req.date, req.number, uploadDate]
    );

    for (const item of newItems) {
      const itemId = crypto.randomUUID();
      await db.execute(
        'INSERT INTO items (id, requestId, section, quantity, description, coneColor, observations) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, requestId, item.section, item.quantity, item.description, item.coneColor, item.observations]
      );
    }

    await fetchData();
  };

  const addDelivery = async (itemId: string, quantity: number, deliveryNote: string, deliveryDate: string, observations: string) => {
    const id = crypto.randomUUID();
    const date = new Date().toISOString();

    await db.execute(
      'INSERT INTO deliveries (id, itemId, quantity, date, deliveryNote, deliveryDate, observations) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, itemId, quantity, date, deliveryNote, deliveryDate, observations]
    );

    await fetchData();
  };

  const deleteRequest = async (id: string) => {
    await db.execute('DELETE FROM requests WHERE id = ?', [id]);
    await fetchData();
  };

  const clearAll = async () => {
    await db.execute('DELETE FROM deliveries');
    await db.execute('DELETE FROM items');
    await db.execute('DELETE FROM requests');
    await fetchData();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500 text-lg">A inicializar sistema...</div>;
  }

  return (
    <AppContext.Provider value={{
      state,
      addRequest,
      addDelivery,
      deleteRequest,
      clearAll,
      isConnected,
      connectToDb,
      refreshData: fetchData
    }}>
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
