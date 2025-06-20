import React from 'react';
import PostCard, { PostCardProps, Post } from './PostCard';

export interface Reply extends Post {
  post_id: string;
  parent_id: string | null;
}

export interface ReplyCardProps extends Omit<PostCardProps, 'post'> {
  reply: Reply;
}

function ReplyCard({ reply, ...props }: ReplyCardProps) {
  return (
    <PostCard
      post={reply}
      imageUrl={reply.image_url ?? undefined}
      videoUrl={reply.video_url ?? undefined}
      {...props}
    />
  );
}

export default React.memo(ReplyCard);
