import React, { useState } from 'react';
import { TextItem, Comment } from '../types';
import { Star, MessageSquare, ChevronLeft, Send, User, Plus, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface TextSectionProps {
    texts: TextItem[];
    onAddComment: (textId: string, comment: Comment) => void;
    onRate: (textId: string, rating: number) => void;
    onAdd: (item: TextItem) => void;
    onDelete: (id: string) => void;
}

const TextSection: React.FC<TextSectionProps> = ({ texts, onAddComment, onRate, onAdd, onDelete }) => {
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [author, setAuthor] = useState("");

    const activeText = texts.find(t => t.id === activeTextId);

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !activeTextId) return;

        onAddComment(activeTextId, {
            id: Date.now().toString(),
            author: "Guest User",
            text: newComment,
            timestamp: Date.now()
        });
        setNewComment("");
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !author) return;

        onAdd({
            id: Date.now().toString(),
            title,
            content,
            author,
            createdAt: Date.now(),
            rating: 0,
            ratingCount: 0,
            comments: []
        });

        setTitle("");
        setContent("");
        setAuthor("");
        setIsAddModalOpen(false);
    };

    if (activeText) {
        return (
            <div className="h-full flex flex-col">
                <button
                    onClick={() => setActiveTextId(null)}
                    className="self-start flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Articles
                </button>

                <div className="flex-1 overflow-y-auto pr-2">
                    <article className="prose prose-invert max-w-none bg-slate-800/30 p-8 rounded-2xl border border-slate-700/50">
                        <h1 className="text-3xl font-bold text-white mb-2">{activeText.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-8 border-b border-slate-700 pb-4">
                            <span>By {activeText.author}</span>
                            <span>•</span>
                            <span>{new Date(activeText.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-1 ml-auto">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => onRate(activeText.id, star)}>
                                            <Star
                                                className={`w-4 h-4 ${star <= activeText.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <span className="ml-2">({activeText.ratingCount})</span>
                            </div>
                        </div>

                        <div className="text-slate-300 leading-relaxed font-serif text-lg">
                            <div className="prose prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {activeText.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </article>

                    <div className="mt-8 max-w-3xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" /> Comments ({activeText.comments.length})
                        </h3>

                        <div className="space-y-4 mb-8">
                            {activeText.comments.map(comment => (
                                <div key={comment.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <User className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-200">{comment.author}</span>
                                        <span className="text-xs text-slate-500">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-300">{comment.text}</p>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleCommentSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg font-medium transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Articles & Blogs</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                    <Plus className="w-4 h-4" /> New Article
                </button>
            </div>

            <div className="grid gap-4">
                {texts.map((text) => (
                    <div
                        key={text.id}
                        className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 p-6 rounded-xl cursor-pointer transition-all duration-200 relative"
                        onClick={() => setActiveTextId(text.id)}
                    >
                        <div className="flex justify-between items-start mb-2 pr-8">
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{text.title}</h3>
                            <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="text-sm font-medium">{text.rating.toFixed(1)}</span>
                            </div>
                        </div>
                        <p className="text-slate-400 line-clamp-2 mb-4">{text.content}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="font-semibold text-indigo-400">{text.author}</span>
                            <span>•</span>
                            <span>{new Date(text.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{text.comments.length} comments</span>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(text.id); }}
                            className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                {texts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <FileTextIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>No articles yet. Generate one or write your own!</p>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Write New Article</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Author</label>
                                    <input
                                        type="text"
                                        required
                                        value={author}
                                        onChange={e => setAuthor(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Content (Markdown supported)</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-xl transition-colors"
                                >
                                    Publish Article
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const FileTextIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;


export default TextSection;