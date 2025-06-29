import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise provide placeholder values
// In production, these should be set via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging to check environment variables
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Anon Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');
console.log('🔧 Supabase client will be created:', !!(supabaseUrl && supabaseAnonKey));

// Create Supabase client only if we have valid credentials
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Pin = {
  id: string;
  username: string;
  lat: number;
  lng: number;
  description: string;
  images: string[];
  pin_color?: string;
  storage_paths?: string[];
  is_authenticated?: boolean;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  // New location fields
  continent?: string;
  country?: string;
  state?: string;
  locality?: string;
};

export type Like = {
  id: string;
  username: string;
  pin_id: string;
  image_index: number;
  created_at: string;
};

export type Comment = {
  id: string;
  username: string;
  pin_id: string;
  text: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  pin_id: string;
  username: string;
  message: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  role: 'user' | 'admin';
  contact_info?: string;
  about_me?: string;
  profile_picture_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
};

export type MarketplaceItem = {
  id: string;
  seller_username: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  storage_paths: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type BlogPost = {
  id: string;
  author_username: string;
  title: string;
  content: string;
  excerpt?: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  view_count: number;
};

export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  if (!supabase) return null;
  
  try {
    console.log('🔍 Checking for authenticated user...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }

    console.log('✅ User authenticated, fetching profile for:', user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      console.log('❌ No profile found for user:', user.id);
      return null;
    }

    console.log('✅ Profile fetched successfully:', profile);
    return profile;
  } catch (err) {
    console.error('💥 Unexpected error in getCurrentUserProfile:', err);
    return null;
  }
};

export const getProfileByUsername = async (username: string): Promise<Profile | null> => {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username);

    if (error) {
      console.error('❌ Error fetching profile by username:', error);
      return null;
    }

    // Check if we have data and at least one result
    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (err) {
    console.error('💥 Unexpected error in getProfileByUsername:', err);
    return null;
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<Profile>): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating profile:', err);
    return false;
  }
};

export const getUserPins = async (username: string): Promise<Pin[]> => {
  if (!supabase) return [];
  
  const { data: pins } = await supabase
    .from('pins')
    .select('*')
    .eq('username', username)
    .order('created_at', { ascending: false });

  return pins || [];
};

// Tribe colors mapping
export const TRIBE_COLORS = {
  'Reuben': '#FF6B6B',     // Red
  'Simeon': '#4ECDC4',     // Teal
  'Levi': '#45B7D1',       // Blue
  'Judah': '#96CEB4',      // Green
  'Dan': '#FFEAA7',        // Yellow
  'Naphtali': '#DDA0DD',   // Plum
  'Gad': '#98D8C8',        // Mint
  'Asher': '#F7DC6F',      // Gold
  'Issachar': '#BB8FCE',   // Lavender
  'Zebulun': '#85C1E9',    // Sky Blue
  'Joseph': '#F8C471',     // Orange
  'Benjamin': '#82E0AA'    // Light Green
} as const;

export type TribeName = keyof typeof TRIBE_COLORS;

// Upload image to Supabase Storage - now supports multiple buckets
export const uploadImage = async (file: File, userId: string, bucketName: string = 'pin-images'): Promise<string | null> => {
  if (!supabase) return null;
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    return data.path;
  } catch (err) {
    console.error('Failed to upload image:', err);
    return null;
  }
};

// Get public URL for uploaded image - now supports multiple buckets
export const getImageUrl = (path: string, bucketName: string = 'pin-images'): string => {
  if (!supabase) return '';
  
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Delete image from storage - now supports multiple buckets
export const deleteImage = async (path: string, bucketName: string = 'pin-images'): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    return !error;
  } catch (err) {
    console.error('Failed to delete image:', err);
    return false;
  }
};

// Marketplace functions
export const getMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch marketplace items:', err);
    return [];
  }
};

export const createMarketplaceItem = async (
  title: string,
  description: string,
  price: number,
  images: string[],
  storagePaths: string[]
): Promise<MarketplaceItem | null> => {
  if (!supabase) return null;
  
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('marketplace_items')
      .insert([
        {
          seller_username: profile.username,
          title: title.trim(),
          description: description.trim(),
          price,
          images,
          storage_paths: storagePaths,
          is_active: true,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error('Failed to create marketplace item:', err);
    throw err;
  }
};

export const updateMarketplaceItem = async (
  itemId: string,
  updates: Partial<MarketplaceItem>
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    return !error;
  } catch (err) {
    console.error('Failed to update marketplace item:', err);
    return false;
  }
};

export const deleteMarketplaceItem = async (itemId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', itemId);

    return !error;
  } catch (err) {
    console.error('Failed to delete marketplace item:', err);
    return false;
  }
};

export const getUserMarketplaceItems = async (username: string): Promise<MarketplaceItem[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('seller_username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user marketplace items:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch user marketplace items:', err);
    return [];
  }
};

// Blog post functions
export const getBlogPosts = async (publishedOnly: boolean = true): Promise<BlogPost[]> => {
  if (!supabase) return [];
  
  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching blog posts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch blog posts:', err);
    return [];
  }
};

export const getUserBlogPosts = async (username: string): Promise<BlogPost[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('author_username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user blog posts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch user blog posts:', err);
    return [];
  }
};

export const createBlogPost = async (
  title: string,
  content: string,
  isPublished: boolean = false
): Promise<BlogPost | null> => {
  if (!supabase) return null;
  
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([
        {
          author_username: profile.username,
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating blog post:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: any) {
    console.error('Failed to create blog post:', err);
    throw err;
  }
};

export const updateBlogPost = async (
  postId: string,
  updates: Partial<BlogPost>
): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    return !error;
  } catch (err) {
    console.error('Failed to update blog post:', err);
    return false;
  }
};

export const deleteBlogPost = async (postId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', postId);

    return !error;
  } catch (err) {
    console.error('Failed to delete blog post:', err);
    return false;
  }
};

export const getBlogPost = async (postId: string): Promise<BlogPost | null> => {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching blog post:', error);
      return null;
    }

    // Increment view count
    if (data) {
      await supabase
        .from('blog_posts')
        .update({ view_count: data.view_count + 1 })
        .eq('id', postId);
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch blog post:', err);
    return null;
  }
};