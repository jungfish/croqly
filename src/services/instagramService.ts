import { toast } from "sonner";

export interface InstagramMedia {
  id: string;
  caption?: string;
  transcription?:string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  postUrl?: string;
}

interface InstagramAPIResponse {
  media_id: string;
  title: string;
  thumbnail_url: string;
}

interface VideoData {
  transcription: string;
  videoUrl: string;
}

async function getIGMediaFromURL(url: string): Promise<InstagramAPIResponse> {
  try {
    // Use a server endpoint to proxy the Instagram API request
    const response = await fetch(`/api/instagram/oembed?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch media ID: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data); // Log the response (remove in production)
    
    if (!data.media_id) {
      throw new Error('No media ID found in response');
    }
    
    return data as InstagramAPIResponse;
  } catch (error) {
    console.error('Error fetching media ID:', error);
    throw error;
  }
}

export async function fetchInstagramPost(url: string): Promise<InstagramMedia | null> {
  try {
    // Get media from our backend API
    const media = await getIGMediaFromURL(url)
    const videoData = await getVideoFromURL(media.media_id);
    
    const mediaData = {
      id: media.media_id,
      caption: media["title"],
      transcription: videoData?.transcription,
      videoUrl: videoData?.videoUrl,
      audioUrl: "",
      thumbnailUrl: media["thumbnail_url"],
      postUrl: url,
    };
    
    return mediaData;

  } catch (error) {
    console.error("Error fetching Instagram post:", error);
    toast.error("Failed to fetch Instagram content");
    return null;
  }
}

async function getVideoFromURL(mediaId: string): Promise<VideoData | null> {
  try {
    // Call our backend API endpoint to get media info
    // const response = await fetch(`/api/instagram/media?url=${url}`);
    const response = await fetch(`/api/instagram/media?mediaId=${mediaId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch media: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching media from ID:', error);
    toast.error("Failed to fetch Instagram media");
    return null;
  }
}

// Export the function
export { getVideoFromURL };



async function getTranscriptionFromURL(videoUrl: string): Promise<string | null> {
  try {
    // Call our backend API endpoint to get media info
    const response = await fetch(`/api/ai/transcribe?videoUrl=${videoUrl}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to transcribe media: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching media from ID:', error);
    toast.error("Failed to fetch Instagram media");
    return null;
  }
}

// Export the function
export { getTranscriptionFromURL };


