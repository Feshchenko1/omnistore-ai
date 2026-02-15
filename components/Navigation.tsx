import React from 'react';
import { Image, FileText, Music, Video, MonitorPlay, Sparkles } from 'lucide-react';
import { MediaType } from '../types';

interface NavigationProps {
  activeTab: MediaType | 'generate';
  onTabChange: (tab: MediaType | 'generate') => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'image', label: 'Images', icon: Image },
    { id: 'text', label: 'Texts', icon: FileText },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'presentation', label: 'Slides', icon: MonitorPlay },
  ];

  return (
    <nav className="w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300">
      <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl hidden lg:block bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          OmniStore
        </span>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as MediaType)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 shadow-sm shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-indigo-400' : 'group-hover:text-slate-200'}`} />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
         <button
            onClick={() => onTabChange('generate')}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 font-semibold
                ${activeTab === 'generate'
                 ? 'bg-indigo-600 text-white'
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50'}
            `}
         >
            <Sparkles className="w-5 h-5" />
            <span className="hidden lg:block">Create New</span>
         </button>
      </div>
    </nav>
  );
};

export default Navigation;