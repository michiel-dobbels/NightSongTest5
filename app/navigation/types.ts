import { Post } from '../components/PostCard'; // adjust this path if needed

export type RootStackParamList = {
  PostDetail: { post: Post };
  Profile: undefined;
  OtherUserProfile: { userId: string };
  // Add other screens if needed
};
