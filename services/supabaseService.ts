import { createClient } from '@supabase/supabase-js';
import { ImageItem, TextItem, MusicItem, VideoItem, PresentationItem, Comment } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helpers to map DB snake_case to App camelCase ---

const mapImage = (row: any): ImageItem => ({
    id: row.id,
    url: row.url,
    prompt: row.prompt,
    createdAt: row.created_at,
});

const mapText = (row: any, comments: any[] = []): TextItem => ({
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    rating: row.rating,
    ratingCount: row.rating_count,
    createdAt: row.created_at,
    comments: comments.map(mapComment),
});

const mapComment = (row: any): Comment => ({
    id: row.id,
    author: row.author,
    text: row.content, // mapped from content column in comments table
    timestamp: row.created_at,
});

const mapMusic = (row: any): MusicItem => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    url: row.url,
    coverUrl: row.cover_url,
    duration: row.duration ? row.duration.toString() : "Unknown", // Convert numeric DB duration to string for App
});

const mapVideo = (row: any): VideoItem => ({
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type as any,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
});

const mapPresentation = (row: any): PresentationItem => ({
    id: row.id,
    title: row.title,
    author: row.author,
    slides: row.slides || [],
    pdfUrl: row.pdf_url,
});

// --- Service Methods ---

export const supabaseService = {
    // Storage
    uploadFile: async (file: File, folder: string = 'uploads'): Promise<string> => {
        const timestamp = Date.now();
        // Sanitize filename: remove spaces and special chars
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${folder}/${timestamp}_${sanitizedName}`;

        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    uploadBase64: async (base64Data: string, folder: string = 'generated'): Promise<string> => {
        try {
            // Extract base64 data
            const base64Content = base64Data.split(',')[1] || base64Data;
            const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

            const timestamp = Date.now();
            const filename = `${folder}/gen_${timestamp}.png`;

            const { data, error } = await supabase.storage
                .from('media')
                .upload(filename, buffer, {
                    contentType: 'image/png'
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filename);

            return publicUrl;
        } catch (error) {
            console.error("Base64 upload error:", error);
            throw error;
        }
    },

    // Images
    getImages: async () => {
        const { data, error } = await supabase.from('images').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapImage);
    },
    addImage: async (img: Omit<ImageItem, 'id' | 'createdAt'>) => {
        const { data, error } = await supabase.from('images').insert([{
            url: img.url,
            prompt: img.prompt,
        }]).select().single();
        if (error) throw error;
        return mapImage(data);
    },
    deleteImage: async (id: string) => {
        const { error } = await supabase.from('images').delete().eq('id', id);
        if (error) throw error;
    },

    // Texts
    getTexts: async () => {
        // Fetch texts and their comments
        const { data: texts, error } = await supabase
            .from('texts')
            .select(`*, comments(*)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return texts.map(t => mapText(t, t.comments));
    },
    addText: async (txt: Omit<TextItem, 'id' | 'createdAt' | 'rating' | 'ratingCount' | 'comments'>) => {
        const { data, error } = await supabase.from('texts').insert([{
            title: txt.title,
            content: txt.content,
            author: txt.author,
        }]).select().single();
        if (error) throw error;
        return mapText(data);
    },
    addComment: async (textId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => {
        const { data, error } = await supabase.from('comments').insert([{
            text_id: textId,
            author: comment.author,
            content: comment.text,
        }]).select().single();
        if (error) throw error;
        return mapComment(data);
    },
    updateTextRating: async (id: string, rating: number, ratingCount: number) => {
        const { data, error } = await supabase.from('texts').update({
            rating: rating,
            rating_count: ratingCount
        }).eq('id', id).select().single();
        if (error) throw error;
        return mapText(data);
    },
    deleteText: async (id: string) => {
        const { error } = await supabase.from('texts').delete().eq('id', id);
        if (error) throw error;
    },

    // Music
    getMusic: async () => {
        const { data, error } = await supabase.from('music').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapMusic);
    },
    addMusic: async (music: Omit<MusicItem, 'id'>) => {
        // Validation: Ensure URL is valid and not a blob
        if (music.url.startsWith('blob:')) {
            console.error("Attempted to save blob URL to DB:", music.url);
            throw new Error("Cannot save temporary file URL to database.");
        }

        const { data, error } = await supabase.from('music').insert([{
            title: music.title,
            artist: music.artist,
            url: music.url,
            cover_url: music.coverUrl || null,
            duration: music.duration === "Unknown" ? 0 : parseFloat(music.duration) || 0 // Convert string "Unknown" to 0 for DB
        }]).select().single();

        if (error) {
            console.error("Supabase Add Music Error:", error);
            throw error;
        }
        return mapMusic(data);
    },
    deleteMusic: async (id: string) => {
        const { error } = await supabase.from('music').delete().eq('id', id);
        if (error) throw error;
    },

    // Videos
    getVideos: async () => {
        const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapVideo);
    },
    addVideo: async (video: Omit<VideoItem, 'id'>) => {
        const { data, error } = await supabase.from('videos').insert([{
            title: video.title,
            description: video.description,
            source_type: video.sourceType,
            url: video.url,
            thumbnail_url: video.thumbnailUrl
        }]).select().single();
        if (error) throw error;
        return mapVideo(data);
    },
    deleteVideo: async (id: string) => {
        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) throw error;
    },

    // Presentations
    getPresentations: async () => {
        const { data, error } = await supabase.from('presentations').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapPresentation);
    },
    addPresentation: async (pres: Omit<PresentationItem, 'id'>) => {
        const { data, error } = await supabase.from('presentations').insert([{
            title: pres.title,
            author: pres.author,
            slides: pres.slides,
            pdf_url: pres.pdfUrl
        }]).select().single();
        if (error) throw error;
        return mapPresentation(data);
    },
    deletePresentation: async (id: string) => {
        const { error } = await supabase.from('presentations').delete().eq('id', id);
        if (error) throw error;
    },
    // Health/Debug
    checkConnection: async () => {
        try {
            const { data, error } = await supabase.from('texts').select('count', { count: 'exact', head: true });
            if (error) {
                console.error("Supabase Connection Error:", error);
                return false;
            }
            console.log("Supabase Connection Successful");
            return true;
        } catch (e) {
            console.error("Supabase Connection Exception:", e);
            return false;
        }
    }
};
