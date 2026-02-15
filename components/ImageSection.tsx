import React, { useState } from 'react';
import { ImageItem } from '../types';
import { Maximize2, GitCompare, X, Trash2, Plus, Upload, Link as LinkIcon } from 'lucide-react';

interface ImageSectionProps {
  images: ImageItem[];
  onAdd: (item: ImageItem) => void;
  onDelete: (id: string) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ images, onAdd, onDelete }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [viewImage, setViewImage] = useState<ImageItem | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Add Image Form State
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImagePrompt, setNewImagePrompt] = useState("");

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length < 2) {
        setSelectedIds(prev => [...prev, id]);
      }
    }
  };

  const startComparison = () => {
    if (selectedIds.length === 2) setIsComparing(true);
  };

  const getCompareImages = () => {
    return images.filter(img => selectedIds.includes(img.id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl || !newImagePrompt) return;
    
    onAdd({
        id: Date.now().toString(),
        url: newImageUrl,
        prompt: newImagePrompt,
        createdAt: Date.now()
    });
    
    setIsAddModalOpen(false);
    setNewImageUrl("");
    setNewImagePrompt("");
  };

  if (isComparing && selectedIds.length === 2) {
    const [img1, img2] = getCompareImages();
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Comparison Mode</h2>
          <button 
            onClick={() => { setIsComparing(false); setSelectedIds([]); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200"
          >
            <X className="w-4 h-4" /> Exit Comparison
          </button>
        </div>
        
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 select-none">
            {/* Image 2 (Right/Under) */}
            <div className="absolute inset-0">
                <img src={img2.url} alt="Comparison 2" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-sm font-bold">
                    B: {img2.prompt.slice(0, 20)}...
                </div>
            </div>

            {/* Image 1 (Left/Over) - Clipped */}
            <div 
                className="absolute inset-0 overflow-hidden border-r-2 border-indigo-500 bg-slate-900"
                style={{ width: `${sliderPos}%` }}
            >
                <img src={img1.url} alt="Comparison 1" className="w-full h-full object-cover object-left" 
                    style={{ width: `${100 / (sliderPos/100)}%`, maxWidth: 'none', height: '100%' }} 
                /> 
                 <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm font-bold z-10">
                    A: {img1.prompt.slice(0, 20)}...
                </div>
            </div>

            {/* Slider Handle */}
            <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
            
            <div 
                className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center pointer-events-none z-10"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="w-8 h-8 bg-indigo-500 rounded-full shadow-lg shadow-black/50 flex items-center justify-center">
                    <GitCompare className="w-4 h-4 text-white" />
                </div>
            </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-400">Image A</p>
                <p className="text-slate-200">{img1.prompt}</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-400">Image B</p>
                <p className="text-slate-200">{img2.prompt}</p>
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Image Gallery</h2>
        <div className="flex gap-2">
            {selectedIds.length > 0 && (
                <>
                    <button 
                        onClick={() => setSelectedIds([])}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                    >
                        Clear
                    </button>
                    <button
                        onClick={startComparison}
                        disabled={selectedIds.length !== 2}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                            ${selectedIds.length === 2 
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        <GitCompare className="w-4 h-4" /> Compare ({selectedIds.length}/2)
                    </button>
                </>
            )}
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
            >
                <Plus className="w-4 h-4" /> Add Image
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-10">
        {images.map((img) => {
          const isSelected = selectedIds.includes(img.id);
          return (
            <div 
              key={img.id} 
              className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200
                ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-900/40 scale-[0.98]' : 'border-transparent hover:border-slate-600'}`}
              onClick={() => toggleSelection(img.id)}
            >
              <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <p className="text-white text-sm line-clamp-2">{img.prompt}</p>
              </div>
              
              {/* Controls Overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                    className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-md"
                    title="Delete"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setViewImage(img); }}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md"
                    title="View Fullscreen"
                 >
                    <Maximize2 className="w-4 h-4" />
                 </button>
              </div>

              {isSelected && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white">
                  {selectedIds.indexOf(img.id) + 1}
                </div>
              )}
            </div>
          );
        })}
        {images.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                <ImageItemIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>No images yet. Add one or generate with AI!</p>
            </div>
        )}
      </div>

      {viewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="flex justify-end mb-2">
                 <button onClick={() => setViewImage(null)} className="text-white hover:text-indigo-400">
                     <X className="w-8 h-8" />
                 </button>
             </div>
             <img src={viewImage.url} alt={viewImage.prompt} className="w-full h-full object-contain rounded-lg bg-slate-900" />
             <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                 <p className="text-slate-200">{viewImage.prompt}</p>
                 <p className="text-slate-400 text-sm mt-1">{new Date(viewImage.createdAt).toLocaleDateString()}</p>
             </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">Add New Image</h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleSubmitAdd} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Description (Prompt)</label>
                          <input 
                              type="text" 
                              required
                              value={newImagePrompt}
                              onChange={e => setNewImagePrompt(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                              placeholder="Scenic view of mountains..."
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                          <button 
                            type="button"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className="flex items-center justify-center gap-2 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200"
                          >
                             <Upload className="w-4 h-4" /> Upload File
                          </button>
                          <div className="relative">
                            <input 
                                id="file-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload}
                            />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Or Paste Image URL</label>
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                             <LinkIcon className="w-4 h-4 text-slate-500" />
                             <input 
                                type="url" 
                                value={newImageUrl}
                                onChange={e => setNewImageUrl(e.target.value)}
                                className="flex-1 bg-transparent text-white focus:outline-none text-sm"
                                placeholder="https://example.com/image.jpg"
                             />
                          </div>
                      </div>

                      {newImageUrl && (
                          <div className="mt-2 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                              <img src={newImageUrl} alt="Preview" className="w-full h-full object-contain" />
                          </div>
                      )}

                      <button 
                        type="submit" 
                        disabled={!newImageUrl || !newImagePrompt}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors"
                      >
                          Add to Gallery
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const ImageItemIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;

export default ImageSection;