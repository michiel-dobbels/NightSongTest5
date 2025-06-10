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
  return <PostCard post={reply} {...props} />;
}

export default React.memo(ReplyCard);
