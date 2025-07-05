import { supabase } from '../supabase';

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  recipient_id: string | null;
  type: string;
  entity_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export async function fetchNotifications(userId: string) {
  return supabase
    .from('notifications')
    .select(
      'id, user_id, sender_id, recipient_id, type, entity_id, message, read, created_at, sender:profiles!notifications_sender_id_fkey(id, username, name, image_url)'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export interface NewNotification {
  user_id: string;
  sender_id: string | null;
  recipient_id: string | null;
  type: string;
  entity_id: string | null;
  message: string;
}

export async function createNotification(payload: NewNotification) {
  return supabase.from('notifications').insert(payload);
}
