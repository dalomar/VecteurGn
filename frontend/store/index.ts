import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export interface Bus {
  id: string;
  name: string;
  registration: string;
  currency: 'GNF' | 'EUR';
  dailyTarget: number;
  staff: string[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  busId: string;
  type: 'recette' | 'depense';
  category: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface RankingItem {
  id: string;
  name: string;
  registration: string;
  currency: string;
  revenue: number;
  target: number;
  percentage: number;
}

export interface BusBalance {
  id: string;
  name: string;
  currency: string;
  recettes: number;
  depenses: number;
  balance: number;
}

interface AppState {
  buses: Bus[];
  transactions: Transaction[];
  ranking: RankingItem[];
  balance: { GNF: number; EUR: number };
  busBalances: BusBalance[];
  loading: boolean;
  
  // Bus actions
  fetchBuses: () => Promise<void>;
  createBus: (bus: Omit<Bus, 'id' | 'createdAt'>) => Promise<void>;
  updateBus: (id: string, bus: Omit<Bus, 'id' | 'createdAt'>) => Promise<void>;
  deleteBus: (id: string) => Promise<void>;
  
  // Transaction actions
  fetchTransactions: (busId?: string, type?: string) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Stats actions
  fetchRanking: (period: 'day' | 'week' | 'month' | 'year', year?: number, month?: number, week?: number) => Promise<void>;
  fetchBalance: () => Promise<void>;
  fetchBusBalances: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  buses: [],
  transactions: [],
  ranking: [],
  balance: { GNF: 0, EUR: 0 },
  busBalances: [],
  loading: false,
  
  // Bus actions
  fetchBuses: async () => {
    try {
      set({ loading: true });
      const response = await fetch(`${API_URL}/buses`);
      const data = await response.json();
      set({ buses: data, loading: false });
    } catch (error) {
      console.error('Error fetching buses:', error);
      set({ loading: false });
    }
  },
  
  createBus: async (bus) => {
    try {
      const response = await fetch(`${API_URL}/buses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bus),
      });
      const newBus = await response.json();
      set({ buses: [...get().buses, newBus] });
    } catch (error) {
      console.error('Error creating bus:', error);
      throw error;
    }
  },
  
  updateBus: async (id, bus) => {
    try {
      const response = await fetch(`${API_URL}/buses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bus),
      });
      const updatedBus = await response.json();
      set({ buses: get().buses.map(b => b.id === id ? updatedBus : b) });
    } catch (error) {
      console.error('Error updating bus:', error);
      throw error;
    }
  },
  
  deleteBus: async (id) => {
    try {
      await fetch(`${API_URL}/buses/${id}`, { method: 'DELETE' });
      set({ buses: get().buses.filter(b => b.id !== id) });
    } catch (error) {
      console.error('Error deleting bus:', error);
      throw error;
    }
  },
  
  // Transaction actions
  fetchTransactions: async (busId?: string, type?: string) => {
    try {
      set({ loading: true });
      const params = new URLSearchParams();
      if (busId) params.append('busId', busId);
      if (type) params.append('type', type);
      
      const response = await fetch(`${API_URL}/transactions?${params.toString()}`);
      const data = await response.json();
      set({ transactions: data, loading: false });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ loading: false });
    }
  },
  
  createTransaction: async (transaction) => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      const newTransaction = await response.json();
      set({ transactions: [newTransaction, ...get().transactions] });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },
  
  updateTransaction: async (id, transaction) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      const updatedTransaction = await response.json();
      set({ transactions: get().transactions.map(t => t.id === id ? updatedTransaction : t) });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },
  
  deleteTransaction: async (id) => {
    try {
      await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
      set({ transactions: get().transactions.filter(t => t.id !== id) });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },
  
  // Stats actions
  fetchRanking: async (period, year?, month?, week?) => {
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      if (week) params.append('week', week.toString());
      
      const response = await fetch(`${API_URL}/stats/ranking?${params.toString()}`);
      const data = await response.json();
      set({ ranking: data });
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  },
  
  fetchBalance: async () => {
    try {
      const response = await fetch(`${API_URL}/stats/balance`);
      const data = await response.json();
      set({ balance: data });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  },
  
  fetchBusBalances: async () => {
    try {
      const response = await fetch(`${API_URL}/stats/balance-per-bus`);
      const data = await response.json();
      set({ busBalances: data });
    } catch (error) {
      console.error('Error fetching bus balances:', error);
    }
  },
}));
