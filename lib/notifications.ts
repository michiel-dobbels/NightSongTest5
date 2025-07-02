import { supabase } from './supabase';

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'like' | 'reply' | 'follow';
  entity_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export async function createNotification(
  recipientId: string,
  senderId: string,
  type: 'like' | 'reply' | 'follow',
  entityId: string | null,
  message: string,
) {
  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    sender_id: senderId,
    type,
    entity_id: entityId,
    message,
  });
  if (error) console.error('Failed to create notification', error);
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, profiles!sender_id(id, username, name, image_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch notifications', error);
    return [] as Notification[];
  }
  return (data as Notification[]) ?? [];
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) console.error('Failed to mark notification as read', error);
}
