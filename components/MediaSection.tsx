import React, { useState, useRef, useEffect } from 'react';
import { MusicItem, VideoItem } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Plus, Trash2, X, Music, Video as VideoIcon, Upload, Link as LinkIcon, Disc, Globe, ExternalLink } from 'lucide-react';

// --- Music Component ---

interface MusicSectionProps {
    music: MusicItem[];
    onAdd: (item: MusicItem) => void;
    onDelete: (id: string) => void;
}

export const MusicSection: React.FC<MusicSectionProps> = ({ music, onAdd, onDelete }) => {
    const [currentTrack, setCurrentTrack] = useState<MusicItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Player Controls State
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [url, setUrl] = useState("");
    const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (currentTrack?.url && currentTrack.url.startsWith('blob:')) {
                // Cleanup logic if needed
            }
        };
    }, []);

    const getServiceInfo = (url: string) => {
        if (url.includes('spotify.com')) return { name: 'Spotify', isExternal: true, height: '80px', icon: Disc, color: 'text-green-500', embeddable: true };
        // Udio/Mureka block embedding (X-Frame-Options), so we use a popup player (embeddable: false)
        if (url.includes('udio.com')) return { name: 'Udio', isExternal: true, height: '160px', icon: Disc, color: 'text-purple-500', embeddable: false };
        if (url.includes('musicgpt.com')) return { name: 'MusicGPT', isExternal: true, height: '160px', icon: Disc, color: 'text-blue-500', embeddable: true };
        if (url.includes('mureka.ai')) return { name: 'Mureka', isExternal: true, height: '160px', icon: Disc, color: 'text-orange-500', embeddable: false };
        return { name: 'Local', isExternal: false, height: 'auto', icon: Music, color: 'text-indigo-400', embeddable: false };
    };

    const currentService = currentTrack ? getServiceInfo(currentTrack.url) : null;

    useEffect(() => {
        if (currentTrack && audioRef.current && !currentService?.isExternal) {
            const playAudio = async () => {
                try {
                    audioRef.current!.volume = volume;
                    audioRef.current!.load();
                    await audioRef.current!.play();
                    setIsPlaying(true);
                } catch (e) {
                    console.log("Auto-play prevented", e);
                    setIsPlaying(false);
                }
            };
            playAudio();
        }
    }, [currentTrack]);

    const getAudioSrc = (url: string) => {
        // Convert Google Drive view links to direct download/stream links
        // Covers: drive.google.com/file/d/ID/view and drive.google.com/open?id=ID
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
            if (idMatch && idMatch[1]) {
                return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            }
        }
        return url;
    };

    const getEmbedUrl = (url: string) => {
        // Strip query parameters for cleaner matching
        const cleanUrl = url.split('?')[0];

        if (cleanUrl.includes('spotify.com')) {
            try {
                const urlObj = new URL(url); // Keep params for spotify sometimes? usually not needed for embed
                return `https://open.spotify.com/embed${urlObj.pathname}`;
            } catch (e) { return url; }
        }
        if (cleanUrl.includes('udio.com')) {
            // Udio does not have a public embed API currently, try to embed the page directly
            return cleanUrl;
        }
        // MusicGPT seems to work with direct link or standard iframe
        return url;
    };

    const togglePlay = () => {
        if (!audioRef.current || !currentTrack) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        if (!currentTrack || music.length <= 1) return;
        const idx = music.findIndex(m => m.id === currentTrack.id);
        const nextIdx = (idx + 1) % music.length;
        setCurrentTrack(music[nextIdx]);
    };

    const handlePrev = () => {
        if (!currentTrack || music.length <= 1) return;
        const idx = music.findIndex(m => m.id === currentTrack.id);
        const prevIdx = (idx - 1 + music.length) % music.length;
        setCurrentTrack(music[prevIdx]);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value);
        setVolume(vol);
        if (audioRef.current) {
            audioRef.current.volume = vol;
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Store file object temporarily, we'll upload on submit
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
            // For preview, we still use objectURL but track the file
            const objectUrl = URL.createObjectURL(file);
            setUrl(objectUrl);
            (e.target as any)._file = file; // Hacky way to attach file to event or state? Better to use a ref or state.
        }
    };

    // Need a state to hold size of file to upload
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileToUpload(file);
            setUrl(URL.createObjectURL(file)); // Preview
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalUrl = url;
        setIsUploading(true);

        try {
            if (uploadMode === 'file' && fileToUpload) {
                finalUrl = await supabaseService.uploadFile(fileToUpload, 'music');
            }

            onAdd({
                id: Date.now().toString(),
                title: title || "Unknown Title",
                artist: artist || "Unknown Artist",
                url: finalUrl,
                duration: "Unknown"
            });

            setTitle("");
            setArtist("");
            setUrl("");
            setFileToUpload(null);
            setIsAddModalOpen(false);
            setUploadMode('link');
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Music Library</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                    <Plus className="w-4 h-4" /> Add Track
                </button>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-56">
                {music.map((track) => {
                    const info = getServiceInfo(track.url);
                    const Icon = info.icon;
                    return (
                        <div
                            key={track.id}
                            onClick={() => setCurrentTrack(track)}
                            className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors border relative
                    ${currentTrack?.id === track.id
                                    ? 'bg-indigo-600/20 border-indigo-500/50'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'}`}
                        >
                            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                                <Icon className={`w-6 h-6 ${currentTrack?.id === track.id ? info.color : 'text-slate-500'}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-semibold ${currentTrack?.id === track.id ? 'text-indigo-300' : 'text-slate-200'}`}>{track.title}</h3>
                                <p className="text-sm text-slate-500">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-2 mr-8">
                                {info.isExternal && <span className="text-[10px] uppercase font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{info.name}</span>}
                                <span className="text-sm text-slate-500 font-mono">{track.duration}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
                                className="absolute right-4 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    );
                })}
                {music.length === 0 && (
                    <div className="text-center py-20 text-slate-500">No music tracks available.</div>
                )}
            </div>

            {/* Player Controls */}
            {currentTrack && currentService && (
                <div className="absolute bottom-6 left-6 right-6 lg:left-0 bg-slate-800/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl z-20 flex flex-col gap-3">
                    {/* Service Specific Player */}
                    {currentService.isExternal ? (
                        <div className="w-full relative rounded-lg overflow-hidden bg-black flex items-center justify-center" style={{ height: currentService.height }}>
                            <div className="absolute top-2 right-2 z-20">
                                <button onClick={() => setCurrentTrack(null)} className="p-1 bg-black/50 rounded-full text-white hover:text-red-400"><X className="w-4 h-4" /></button>
                            </div>

                            {currentService.embeddable ? (
                                <iframe
                                    src={getEmbedUrl(currentTrack.url)}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
                                    title={`${currentService.name} Player`}
                                    className="w-full h-full"
                                ></iframe>
                            ) : (
                                <div className="text-center p-6">
                                    <Globe className={`w-8 h-8 mx-auto mb-2 ${currentService.color}`} />
                                    <p className="text-white font-semibold mb-1">External Player</p>
                                    <p className="text-slate-400 text-sm mb-4">{currentService.name} requires a popup player.</p>
                                    <button
                                        onClick={() => window.open(currentTrack.url, 'musicPlayer', 'width=1024,height=768,resizable,scrollbars')}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Launch Player <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {/* Native Player */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                                    <Music className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium truncate">{currentTrack.title}</h4>
                                    <p className="text-sm text-slate-400 truncate">{currentTrack.artist}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button onClick={handlePrev} className="text-slate-400 hover:text-white"><SkipBack className="w-5 h-5" /></button>
                                    <button
                                        onClick={togglePlay}
                                        className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
                                    >
                                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current pl-0.5" />}
                                    </button>
                                    <button onClick={handleNext} className="text-slate-400 hover:text-white"><SkipForward className="w-5 h-5" /></button>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                                <span>{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="flex-1 h-1 bg-slate-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                                <span>{formatTime(duration)}</span>
                            </div>

                            {/* Volume */}
                            <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => {
                                    const newVol = volume === 0 ? 0.8 : 0;
                                    setVolume(newVol);
                                    if (audioRef.current) audioRef.current.volume = newVol;
                                }}>
                                    {volume === 0 ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-24 h-1 bg-slate-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-slate-300 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>

                            <audio
                                ref={audioRef}
                                src={getAudioSrc(currentTrack.url)}
                                onEnded={() => { setIsPlaying(false); handleNext(); }}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onError={() => console.error("Audio playback error for", currentTrack.url)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Add Music Track</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                <input type="text" required={!title} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Artist</label>
                                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-2 bg-slate-900 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('link')}
                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${uploadMode === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Link URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('file')}
                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${uploadMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Upload File
                                </button>
                            </div>

                            {uploadMode === 'link' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Audio URL</label>
                                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                        <LinkIcon className="w-4 h-4 text-slate-500" />
                                        <input type="url" required={uploadMode === 'link'} value={url} onChange={e => setUrl(e.target.value)} className="flex-1 bg-transparent text-white focus:outline-none" placeholder="Spotify, Udio, MusicGPT, Mureka, Drive..." />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Spotify</span>
                                        <span className="text-[10px] bg-purple-900/30 text-purple-400 px-2 py-1 rounded border border-purple-900/50">Udio</span>
                                        <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50">MusicGPT</span>
                                        <span className="text-[10px] bg-orange-900/30 text-orange-400 px-2 py-1 rounded border border-orange-900/50">Mureka</span>
                                        <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded">Direct MP3</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Upload Audio File</label>
                                    <div className="relative group cursor-pointer border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 transition-colors text-center">
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileSelect}
                                            required={uploadMode === 'file' && !url}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
                                            <span className="text-sm text-slate-400 group-hover:text-white">Drop file here or click to upload</span>
                                        </div>
                                    </div>
                                    {url && uploadMode === 'file' && <p className="text-xs text-green-400 mt-2 text-center">File loaded successfully</p>}
                                </div>
                            )}

                            <button type="submit" disabled={!url || isUploading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl">
                                {isUploading ? 'Uploading...' : 'Add Track'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Video Component ---

interface VideoSectionProps {
    videos: VideoItem[];
    onAdd: (item: VideoItem) => void;
    onDelete: (id: string) => void;
}

export const VideoSection: React.FC<VideoSectionProps> = ({ videos, onAdd, onDelete }) => {
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [url, setUrl] = useState("");
    const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
    const [isUploading, setIsUploading] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileToUpload(file);
            setUrl(URL.createObjectURL(file));
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            let sourceType: 'youtube' | 'vimeo' | 'native' = 'native';
            let videoId = url;
            let thumbnail = "https://picsum.photos/400/225?random=" + Date.now();

            if (uploadMode === 'file' && fileToUpload) {
                videoId = await supabaseService.uploadFile(fileToUpload, 'videos');
            } else if (uploadMode === 'link') {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    sourceType = 'youtube';
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                    const match = url.match(regExp);
                    if (match && match[2].length === 11) {
                        videoId = match[2];
                        thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    }
                } else if (url.includes('vimeo.com')) {
                    sourceType = 'vimeo';
                    const regExp = /vimeo\.com\/(\d+)/;
                    const match = url.match(regExp);
                    if (match) videoId = match[1];
                }
            }

            onAdd({
                id: Date.now().toString(),
                title: title || "New Video",
                description: desc || "No description",
                sourceType,
                url: videoId,
                thumbnailUrl: thumbnail
            });

            setTitle("");
            setDesc("");
            setUrl("");
            setFileToUpload(null);
            setIsAddModalOpen(false);
            setUploadMode('link');
        } catch (error) {
            console.error("Upload/Add failed", error);
            alert("Failed to add video");
        } finally {
            setIsUploading(false);
        }
    };

    const getVideoSrc = (video: VideoItem) => {
        if (video.sourceType === 'youtube') {
            // Fix Error 153: STRICT origin policy and enablejsapi are crucial.
            // Also removing autoplay=1 from initial load to avoid permission errors on some browsers
            return `https://www.youtube.com/embed/${video.url}?origin=${window.location.origin}&enablejsapi=1&rel=0`;
        }
        if (video.sourceType === 'vimeo') {
            return `https://player.vimeo.com/video/${video.url}?autoplay=1`;
        }
        return video.url;
    };

    return (
        <div className="h-full relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Video Library</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                    <Plus className="w-4 h-4" /> Add Video
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                    <div
                        key={video.id}
                        className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all cursor-pointer group relative"
                        onClick={() => setSelectedVideo(video)}
                    >
                        <div className="aspect-video bg-slate-900 relative">
                            {video.sourceType === 'native' && !video.thumbnailUrl.includes('picsum') ? (
                                <video src={video.url} className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            )}

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Play className="w-5 h-5 text-white fill-current pl-1" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 pr-10">
                            <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{video.title}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2">{video.description}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
                            className="absolute bottom-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors z-10"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                {videos.length === 0 && (
                    <div className="col-span-full text-center py-20 text-slate-500">No videos available.</div>
                )}
            </div>

            {selectedVideo && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-10" onClick={() => setSelectedVideo(null)}>
                    <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
                        <div className="flex-1 relative">
                            {selectedVideo.sourceType === 'native' ? (
                                <video
                                    src={selectedVideo.url}
                                    className="w-full h-full"
                                    controls
                                    autoPlay
                                />
                            ) : (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={getVideoSrc(selectedVideo)}
                                    title={selectedVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            )}
                        </div>
                        <button
                            className="absolute top-4 right-4 text-white hover:text-indigo-400 z-50 bg-black/50 rounded-full p-2"
                            onClick={(e) => { e.stopPropagation(); setSelectedVideo(null); }}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Add Video</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                <input type="text" required={!title} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-2 bg-slate-900 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('link')}
                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${uploadMode === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Link URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('file')}
                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${uploadMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Upload File
                                </button>
                            </div>

                            {uploadMode === 'link' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Video URL (YouTube/Vimeo)</label>
                                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                        <LinkIcon className="w-4 h-4 text-slate-500" />
                                        <input type="url" required={uploadMode === 'link'} value={url} onChange={e => setUrl(e.target.value)} className="flex-1 bg-transparent text-white focus:outline-none" placeholder="https://youtube.com/watch?v=..." />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Upload Video File</label>
                                    <div className="relative group cursor-pointer border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 transition-colors text-center">
                                        <input
                                            type="file"
                                            accept="video/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileSelect}
                                            required={uploadMode === 'file' && !url}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
                                            <span className="text-sm text-slate-400 group-hover:text-white">Drop video here or click to upload</span>
                                        </div>
                                    </div>
                                    {url && uploadMode === 'file' && <p className="text-xs text-green-400 mt-2 text-center">File loaded successfully</p>}
                                </div>
                            )}

                            <button type="submit" disabled={!url || isUploading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl">
                                {isUploading ? 'Uploading...' : 'Add Video'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};