export type MediaType = 'image' | 'text' | 'music' | 'video' | 'presentation';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface ImageItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
}

export interface TextItem {
  id: string;
  title: string;
  content: string; // Markdown or HTML
  author: string;
  createdAt: number;
  rating: number; // 0-5
  ratingCount: number;
  comments: Comment[];
}

export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  url: string; // URL to audio file
  coverUrl?: string;
  duration: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  sourceType: 'youtube' | 'vimeo' | 'native';
  url: string; // ID or URL
}

export interface Slide {
  id: string;
  title: string;
  content: string[];
  imageUrl?: string;
}

export interface PresentationItem {
  id: string;
  title: string;
  author: string;
  slides: Slide[];
  pdfUrl?: string; // Added to support PDF format
}

export interface StoreState {
  images: ImageItem[];
  texts: TextItem[];
  music: MusicItem[];
  videos: VideoItem[];
  presentations: PresentationItem[];
}