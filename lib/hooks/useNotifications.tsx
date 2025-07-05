import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../AuthContext';
import { fetchNotifications, markNotificationRead, Notification } from '../supabase/notifications';

interface ContextValue {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<ContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()!;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await fetchNotifications(user.id);
    if (!error && data) {
      const list = data as Notification[];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } else if (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          const n = payload.new as Notification;
          setNotifications(prev => [n, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await markNotificationRead(id);
    if (!error) {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const value: ContextValue = {
    notifications,
    unreadCount,
    refresh: load,
    markAsRead,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export function useNotifications(): ContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
