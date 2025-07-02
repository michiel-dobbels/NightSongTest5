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
  sender?: {
    id: string;

    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export async function createNotification(
  recipientId: string,
  type: 'like' | 'reply' | 'follow',
  entityId: string | null,
  message: string,
) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('No user session found for creating notification');
    return;
  }

  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    sender_id: user.id,  // ✅ this ensures it passes RLS
    type,
    entity_id: entityId,
    message,
  });

  if (error) {
    console.error('Failed to create notification', error);
  }
}

// Simplified helper for post likes
export async function createNotificationForLike(
  recipientId: string,
  postId: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('No user session found');
    return;
  }

  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    sender_id: user.id,
    type: 'like',
    entity_id: postId,
    message: 'liked your post',
  });

  if (error) {
    console.error('Failed to create like notification:', error);
  } else {
    console.log('Notification created');
  }
}


export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, sender:profiles!notifications_sender_id_fkey(id, username, name, image_url)')

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
