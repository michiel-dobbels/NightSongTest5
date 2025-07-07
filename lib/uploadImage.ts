import { supabase, POST_BUCKET } from './supabase';
import * as FileSystem from 'expo-file-system';

export async function uploadImage(uri: string, userId: string): Promise<string | null> {
  try {
    let ext = 'jpg';
    let fileUri = uri;
    const match = uri.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      ext = match[1];
      const base64 = match[2];
      fileUri = `${FileSystem.cacheDirectory}${userId}-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    } else {
      const pathExt = /\.([a-zA-Z0-9]+)$/.exec(uri);
      if (pathExt) ext = pathExt[1];
    }
    const path = `${userId}-${Date.now()}.${ext}`;
    const file = { uri: fileUri, name: path, type: `image/${ext}` } as any;
    const { error } = await supabase.storage
      .from(POST_BUCKET)
      .upload(path, file, { contentType: `image/${ext}` });
    if (match) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
    if (error) {
      console.error('Image upload failed', error.message);
      return null;
    }
    const { publicURL } = supabase.storage.from(POST_BUCKET).getPublicUrl(path);
    return publicURL ?? null;
  } catch (e) {
    console.error('Image upload error', e);
    return null;
  }
}
