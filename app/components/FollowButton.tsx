import React, { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../AuthContext';
import { createNotification } from '../../lib/notifications';
import { followEvents } from '../followEvents';

interface FollowButtonProps {
  targetUserId: string;
  onToggle?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, onToggle }: FollowButtonProps) {

  const { user } = useAuth()!;
  const [following, setFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const checkFollow = async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .match({ follower_id: user.id, following_id: targetUserId })
        .single();
      if (isMounted) {
        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch follow state', error);
        }
        setFollowing(!!data);
      }
    };
    checkFollow();
    return () => {
      isMounted = false;
    };
  }, [user?.id, targetUserId]);

  const toggleFollow = async () => {
    if (!user) return;
    if (following) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .match({ follower_id: user.id, following_id: targetUserId });
      if (!error) {
        setFollowing(false);
        onToggle?.(false);
        followEvents.emit('followChanged', { targetUserId, following: false });
      } else {
        console.error('Failed to unfollow', error);
      }

    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      if (!error) {
        setFollowing(true);
        onToggle?.(true);
        followEvents.emit('followChanged', { targetUserId, following: true });
        createNotification(
          targetUserId,
          user.id,
          'follow',
          null,
          `➕ ${user.user_metadata?.username || user.email} followed you`,
        );
      } else {
        console.error('Failed to follow', error);
      }

    }
  };

  if (following === null) {
    // Avoid flashing incorrect state until we know if a follow exists
    return null;
  }

  return (
    <Button title={following ? 'Unfollow' : 'Follow'} onPress={toggleFollow} />
  );
}
