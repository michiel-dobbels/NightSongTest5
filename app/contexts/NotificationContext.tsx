import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';

export interface Notification {
  id: string;
  
  sender_id?: string | null;
  recipient_id?: string | null;
  type?: string | null;
  entity_id?: string | null;
  message: string;
  created_at: string;
  read?: boolean | null;
  sender?: {
    id: string;
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    userId: string,
    message: string,
    opts?: { type?: string; entity_id?: string }
  ) => Promise<void>;
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
      .select(
        'id,sender_id,recipient_id,type,entity_id,message,created_at,read, sender:profiles!sender_id(id,username,name,image_url)'
      )
      .eq('recipient_id', user.id)
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
      .from(`notifications:recipient_id=eq.${user.id}`)
      .on('INSERT', payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const addNotification = useCallback(
    async (
      userId: string,
      message: string,
      opts: { type?: string; entity_id?: string } = {},
    ) => {
      const payload = {
        
        sender_id: user?.id ?? null,
        recipient_id: userId,
        message,
        ...opts,
      };
      const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
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
