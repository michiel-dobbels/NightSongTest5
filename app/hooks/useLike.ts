import { useEffect, useState, useCallback } from 'react';
import { usePostStore } from '../contexts/PostStoreContext';
import { likeEvents } from '../likeEvents';

export default function useLike(id: string, isReply: boolean = false) {
  const { getState, toggleLike } = usePostStore();
  const initial = getState(id) || { likeCount: 0, liked: false };
  const [likeCount, setLikeCount] = useState(initial.likeCount);
  const [liked, setLiked] = useState(initial.liked);

  useEffect(() => {
    const handler = ({ id: changedId, count, liked: newLiked }: any) => {
      if (changedId === id) {
        setLikeCount(count);
        setLiked(newLiked);
      }
    };
    likeEvents.on('likeChanged', handler);
    return () => {
      likeEvents.off('likeChanged', handler);
    };
  }, [id]);

  useEffect(() => {
    const state = getState(id);
    if (state) {
      setLikeCount(state.likeCount);
      setLiked(state.liked);
    }
  }, [id, getState]);

  const toggle = useCallback(
    () => toggleLike(id, isReply),
    [toggleLike, id, isReply],
  );

  return { likeCount, liked, toggleLike: toggle };
}
