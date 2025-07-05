import { supabase } from '../supabase';

export interface DBNotification {
  id: string;
  
  sender_id: string | null;
  recipient_id: string | null;
  type: string | null;
  entity_id: string | null;
  message: string;
  read: boolean | null;
  created_at: string;
  sender?: {
    id: string;
    username: string | null;
    name: string | null;
    image_url: string | null;
  } | null;
}

export async function fetchNotifications(userId: string): Promise<DBNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id,user_id,sender_id,recipient_id,type,entity_id,message,read,created_at, sender:profiles!sender_id(id,username,name,image_url)'
    )
    .eq('recipient_id', userId)

    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch notifications', error);
    return [];
  }
  return (data ?? []) as DBNotification[];
}

export async function insertNotification(payload: {
  
  sender_id: string;
  recipient_id: string;
  type: 'like' | 'reply' | 'follow';
  entity_id: string;
  message: string;
}) {
  console.log('🔔 insertNotification called with:', payload);
  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select();  // Allows returning the new row

  if (error) {
    console.error('❌ insertNotification error:', error);
  } else {
    console.log('✅ insertNotification succeeded. Inserted row:', data);
  }
}


export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) {
    console.error('Failed to mark notification read', error);
  }
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: DBNotification) => void
) {
  return supabase
    .from(`notifications:user_id=eq.${userId}`)
    .on('INSERT', payload => {
      onInsert(payload.new as DBNotification);
    })
    .subscribe();
}
