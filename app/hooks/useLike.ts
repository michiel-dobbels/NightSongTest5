import { usePostStore } from '../contexts/PostStoreContext';

export default function useLike(
  id: string,
  isReply: boolean = false,
  ownerId?: string,
) {
  const { posts, toggleLike } = usePostStore();
  const likeCount = posts[id]?.likeCount ?? 0;
  const liked = posts[id]?.liked ?? false;
  return { likeCount, liked, toggleLike: () => toggleLike(id, isReply, ownerId) };
}

