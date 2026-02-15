import React, { useState, useEffect } from 'react';
import { supabaseService } from './services/supabaseService';
import Navigation from './components/Navigation';
import ImageSection from './components/ImageSection';
import TextSection from './components/TextSection';
import { MusicSection, VideoSection } from './components/MediaSection';
import PresentationSection from './components/PresentationSection';
import Generator from './components/Generator';
import { MediaType, StoreState, ImageItem, TextItem, PresentationItem, MusicItem, VideoItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MediaType | 'generate'>('image');

  // Initial empty state
  const [store, setStore] = useState<StoreState>({
    images: [],
    texts: [],
    music: [],
    videos: [],
    presentations: []
  });
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Check connection first
      await supabaseService.checkConnection();

      try {
        const [images, texts, music, videos, presentations] = await Promise.all([
          supabaseService.getImages(),
          supabaseService.getTexts(),
          supabaseService.getMusic(),
          supabaseService.getVideos(),
          supabaseService.getPresentations()
        ]);

        setStore({ images, texts, music, videos, presentations });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Add Handlers ---
  const addImage = async (img: ImageItem) => {
    // Optimistic or wait for DB? Let's wait for DB to get real ID
    try {
      // We pass the item but service ignores ID/createdAt for insert
      const newImg = await supabaseService.addImage(img);
      setStore(prev => ({ ...prev, images: [newImg, ...prev.images] }));
    } catch (e) {
      console.error("Failed to add image", e);
    }
  };

  const addText = async (txt: TextItem) => {
    try {
      const newText = await supabaseService.addText(txt);
      setStore(prev => ({ ...prev, texts: [newText, ...prev.texts] }));
    } catch (e) {
      console.error("Failed to add text", e);
    }
  };

  const addMusic = async (track: MusicItem) => {
    try {
      const newMusic = await supabaseService.addMusic(track);
      setStore(prev => ({ ...prev, music: [newMusic, ...prev.music] }));
    } catch (e) {
      console.error("Failed to add music", e);
    }
  };

  const addVideo = async (vid: VideoItem) => {
    try {
      const newVideo = await supabaseService.addVideo(vid);
      setStore(prev => ({ ...prev, videos: [newVideo, ...prev.videos] }));
    } catch (e) {
      console.error("Failed to add video", e);
    }
  };

  const addPresentation = async (deck: PresentationItem) => {
    try {
      const newDeck = await supabaseService.addPresentation(deck);
      setStore(prev => ({ ...prev, presentations: [newDeck, ...prev.presentations] }));
    } catch (e) {
      console.error("Failed to add presentation", e);
    }
  };

  // --- Delete Handlers ---
  const deleteImage = async (id: string) => {
    try {
      await supabaseService.deleteImage(id);
      setStore(prev => ({ ...prev, images: prev.images.filter(i => i.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const deleteText = async (id: string) => {
    try {
      await supabaseService.deleteText(id);
      setStore(prev => ({ ...prev, texts: prev.texts.filter(t => t.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const deleteMusic = async (id: string) => {
    try {
      await supabaseService.deleteMusic(id);
      setStore(prev => ({ ...prev, music: prev.music.filter(m => m.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const deleteVideo = async (id: string) => {
    try {
      await supabaseService.deleteVideo(id);
      setStore(prev => ({ ...prev, videos: prev.videos.filter(v => v.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const deletePresentation = async (id: string) => {
    try {
      await supabaseService.deletePresentation(id);
      setStore(prev => ({ ...prev, presentations: prev.presentations.filter(p => p.id !== id) }));
    } catch (e) { console.error(e); }
  };

  // --- Interaction Handlers ---
  const addComment = async (textId: string, comment: any) => {
    try {
      const newComment = await supabaseService.addComment(textId, comment);
      setStore(prev => ({
        ...prev,
        texts: prev.texts.map(t => t.id === textId ? { ...t, comments: [...t.comments, newComment] } : t)
      }));
    } catch (e) { console.error(e); }
  };

  const rateText = async (textId: string, rating: number) => {
    // Calculate new average optimistically or via DB? 
    // DB approach: The backend/SQL should ideally handle this, or we calc here and update.
    // For simplicity, we calculate here based on current state, update DB, then update local.
    const textItem = store.texts.find(t => t.id === textId);
    if (!textItem) return;

    const newCount = textItem.ratingCount + 1;
    const newAvg = ((textItem.rating * textItem.ratingCount) + rating) / newCount;

    try {
      await supabaseService.updateTextRating(textId, newAvg, newCount);
      setStore(prev => ({
        ...prev,
        texts: prev.texts.map(t => t.id === textId ? { ...t, rating: newAvg, ratingCount: newCount } : t)
      }));
    } catch (e) { console.error(e); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'image':
        return <ImageSection images={store.images} onAdd={addImage} onDelete={deleteImage} />;
      case 'text':
        return <TextSection texts={store.texts} onAddComment={addComment} onRate={rateText} onAdd={addText} onDelete={deleteText} />;
      case 'music':
        return <MusicSection music={store.music} onAdd={addMusic} onDelete={deleteMusic} />;
      case 'video':
        return <VideoSection videos={store.videos} onAdd={addVideo} onDelete={deleteVideo} />;
      case 'presentation':
        return <PresentationSection presentations={store.presentations} onAdd={addPresentation} onDelete={deletePresentation} />;
      case 'generate':
        return <Generator onAddImage={addImage} onAddText={addText} onAddPresentation={addPresentation} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 overflow-hidden">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden relative">
        <div className="h-full p-4 lg:p-8 overflow-y-auto scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;