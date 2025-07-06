import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  DBNotification,
} from '../supabase/notifications';
import { notificationEvents } from '../../app/notificationEvents';

export function useNotifications() {
  const { user } = useAuth()!;
  const [notifications, setNotifications] = useState<DBNotification[]>([]);

  useEffect(() => {
    const onMarkRead = (id: string) => {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    };
    const onMarkAll = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
    notificationEvents.on('markRead', onMarkRead);
    notificationEvents.on('markAllRead', onMarkAll);
    return () => {
      notificationEvents.off('markRead', onMarkRead);
      notificationEvents.off('markAllRead', onMarkAll);
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const data = await fetchNotifications(user.id);
    setNotifications(data);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToNotifications(user.id, n => {
      setNotifications(prev => [n, ...prev]);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [user?.id]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    notificationEvents.emit('markRead', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))); 
    notificationEvents.emit('markAllRead');
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, refresh: load };
}
