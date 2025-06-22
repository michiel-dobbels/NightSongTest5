import { usePostStore } from '../contexts/PostStoreContext';
import { likeEvents } from '../likeEvents';
import { useEffect, useState, useCallback } from 'react';

export default function useLike(id: string, isReply: boolean = false) {
  const { getState, toggleLike } = usePostStore();
  const initial = getState(id) || { likeCount: 0, liked: false };
  const [state, setState] = useState(initial);

  useEffect(() => {
    const handler = ({ id: changedId, count, liked }: any) => {
      if (changedId === id) {
        setState({ likeCount: count, liked });
      }
    };
    likeEvents.on('likeChanged', handler);
    return () => {
      likeEvents.off('likeChanged', handler);
    };
  }, [id]);

  useEffect(() => {
    const current = getState(id);
    if (current) setState(current);
  }, [getState, id]);

  const toggle = useCallback(() => toggleLike(id, isReply), [toggleLike, id, isReply]);

  return { likeCount: state.likeCount, liked: state.liked, toggleLike: toggle };
}

