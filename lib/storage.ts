import { supabase } from './supabase';

export async function uploadImageAsync(uri: string, folder: string = 'uploads') {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filePath = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.jpg`;
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, { contentType: 'image/jpeg' });
    if (error) {
      console.error('Failed to upload image:', error.message);
      return null;
    }
    const { publicURL } = supabase.storage.from('images').getPublicUrl(filePath);
    return publicURL;
  } catch (e) {
    console.error('Image upload failed:', e);
    return null;
  }
}
