import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read?: boolean | null;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (userId: string, message: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()!;
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('id,user_id,message,created_at,read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data as Notification[]);
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for new notifications in realtime so they appear immediately
  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .from(`notifications:user_id=eq.${user.id}`)
      .on('INSERT', payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const addNotification = useCallback(
    async (userId: string, message: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({ user_id: userId, message })
        .single();
      if (!error && data && userId === user?.id) {
        setNotifications(prev => [data as Notification, ...prev]);
      }
    },
    [user?.id],
  );

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }
  }, []);

  const value = {
    notifications,
    addNotification,
    markRead,
    refresh: fetchNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
