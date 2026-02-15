import React, { useState } from 'react';
import { generateImage, generateArticle, generatePresentation } from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { ImageItem, TextItem, PresentationItem } from '../types';
import { Loader2, Wand2, Image as ImageIcon, FileText, MonitorPlay, AlertCircle } from 'lucide-react';

interface GeneratorProps {
  onAddImage: (img: ImageItem) => void;
  onAddText: (txt: TextItem) => void;
  onAddPresentation: (deck: PresentationItem) => void;
}

type GenType = 'image' | 'text' | 'presentation';

const Generator: React.FC<GeneratorProps> = ({ onAddImage, onAddText, onAddPresentation }) => {
  const [activeType, setActiveType] = useState<GenType>('text');
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      if (activeType === 'image') {
        const base64Url = await generateImage(prompt);
        // Upload base64 to Supabase to get a permanent URL
        // generateImage returns a URL (if placeholder) or potential base64 if we change backend.
        // Assuming user wants to persist whatever we get.

        let finalImageUrl = base64Url;
        if (base64Url.startsWith('data:image')) {
          finalImageUrl = await supabaseService.uploadBase64(base64Url, 'generated_images');
        }

        onAddImage({
          id: Date.now().toString(),
          url: finalImageUrl,
          prompt: prompt,
          createdAt: Date.now()
        });
      } else if (activeType === 'text') {
        const article = await generateArticle(prompt);
        onAddText({
          id: Date.now().toString(),
          title: article.title,
          content: article.content,
          author: "Gemini AI",
          createdAt: Date.now(),
          rating: 5,
          ratingCount: 1,
          comments: []
        });
      } else if (activeType === 'presentation') {
        const deck = await generatePresentation(prompt);
        onAddPresentation({
          id: Date.now().toString(),
          title: deck.title,
          author: "Gemini AI",
          slides: deck.slides.map((s: any, i: number) => ({ ...s, id: i.toString() }))
        });
      }
      setPrompt(""); // Reset on success
    } catch (err: any) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const options = [
    // { id: 'image', label: 'Image', icon: ImageIcon, desc: 'Generate high quality visuals' },
    { id: 'text', label: 'Article', icon: FileText, desc: 'Write blogs and stories' },
    // { id: 'presentation', label: 'Slides', icon: MonitorPlay, desc: 'Create presentation outlines' },
  ];

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col justify-center pb-20">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-white mb-4">Creative Studio</h2>
        <p className="text-slate-400 text-lg">What would you like to create with Gemini today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setActiveType(opt.id as GenType)}
              className={`p-6 rounded-2xl border transition-all text-left group
                ${isActive
                  ? 'bg-indigo-600/10 border-indigo-500'
                  : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors
                 ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className={`font-bold mb-1 ${isActive ? 'text-white' : 'text-slate-200'}`}>{opt.label}</h3>
              <p className="text-sm text-slate-500">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700 shadow-xl">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe the ${activeType} you want to generate...`}
          className="w-full bg-transparent text-white p-4 min-h-[120px] focus:outline-none placeholder:text-slate-600 resize-none text-lg"
        />
        <div className="flex items-center justify-between px-4 pb-4 pt-2">
          <div className="text-sm text-slate-500">
            {error && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</span>}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all
                    ${isLoading || !prompt.trim()
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/80 hover:-translate-y-0.5'
              }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Generator;