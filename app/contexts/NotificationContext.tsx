import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import {
  fetchNotifications,
  insertNotification,
  markNotificationRead,
  subscribeToNotifications,
  DBNotification,
} from '../../lib/supabase/notifications';

export type Notification = DBNotification;

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

  const fetchNotificationsCallback = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const data = await fetchNotifications(user.id);
    setNotifications(data as Notification[]);
  }, [user?.id]);

  useEffect(() => {
    fetchNotificationsCallback();
  }, [fetchNotificationsCallback]);

  // Listen for new notifications in realtime so they appear immediately

  useEffect(() => {
    if (!user) return;
    const subscription = subscribeToNotifications(user.id, n => {
      setNotifications(prev => [n as Notification, ...prev]);
    });
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
      user_id: userId,
      sender_id: user?.id ?? null,
      recipient_id: userId,
      type: opts.type ?? null,
      entity_id: opts.entity_id ?? null,
      message,
    };
    await insertNotification(payload as any);
    if (userId === user?.id) {
      fetchNotificationsCallback();
    }
    },
    [user?.id],
  );

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markRead,
    refresh: fetchNotificationsCallback,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
