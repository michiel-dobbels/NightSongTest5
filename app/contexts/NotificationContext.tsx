import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

export interface Notification {
  id: string;
  message: string | null;
  actor_id: string | null;
  post_id: string | null;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

const NotificationContext = createContext<NotificationStore | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()!;
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, actor_id, post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data as Notification[]);
    }
  }, [user?.id]);

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, refresh, clear }}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
