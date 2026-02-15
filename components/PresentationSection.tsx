import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { PresentationItem, Slide } from '../types';
import { ChevronRight, ChevronLeft, Download, MonitorPlay, X, Plus, Trash2, FileText, Images, Upload, Link as LinkIcon } from 'lucide-react';

interface PresentationSectionProps {
    presentations: PresentationItem[];
    onAdd: (item: PresentationItem) => void;
    onDelete: (id: string) => void;
}

const PresentationSection: React.FC<PresentationSectionProps> = ({ presentations, onAdd, onDelete }) => {
    const [activeDeck, setActiveDeck] = useState<PresentationItem | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form
    const [addMode, setAddMode] = useState<'pdf' | 'images' | null>(null);
    const [pdfUploadType, setPdfUploadType] = useState<'link' | 'file'>('link');
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [pdfUrl, setPdfUrl] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [imageUrls, setImageUrls] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Clean up handled manually now to prevent premature revocation on submit

    const nextSlide = () => {
        if (!activeDeck) return;
        if (currentSlide < activeDeck.slides.length - 1) setCurrentSlide(curr => curr + 1);
    };

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
    };

    const downloadPDF = () => {
        if (activeDeck?.pdfUrl) {
            window.open(activeDeck.pdfUrl, '_blank');
        } else {
            alert("Mock: Downloading generated PDF...");
        }
    };

    const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Revoke previous blob if exists to avoid leaks while switching files in form
            if (pdfUrl && pdfUrl.startsWith('blob:')) {
                URL.revokeObjectURL(pdfUrl);
            }
            // Use createObjectURL for robust file handling
            const objectUrl = URL.createObjectURL(file);
            setPdfUrl(objectUrl);
            setPdfFile(file);
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
    };

    const handleCancel = () => {
        // Only revoke if we are cancelling (not submitting)
        if (pdfUrl && pdfUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pdfUrl);
        }
        resetForm();
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsUploading(true);

        try {
            let finalPdfUrl = pdfUrl;

            if (addMode === 'pdf' && pdfUploadType === 'file' && pdfFile) {
                finalPdfUrl = await supabaseService.uploadFile(pdfFile, 'presentations');
            }

            // Fix Google Drive links to be embeddable
            // Converts /view or /edit to /preview
            if (addMode === 'pdf' && pdfUploadType === 'link' && finalPdfUrl.includes('drive.google.com')) {
                finalPdfUrl = finalPdfUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
                if (!finalPdfUrl.includes('/preview')) finalPdfUrl += '/preview';
            }

            const newDeck: PresentationItem = {
                id: Date.now().toString(),
                title: title || "New Presentation",
                author: author || "Unknown",
                slides: [],
                pdfUrl: addMode === 'pdf' ? finalPdfUrl : undefined
            };

            if (addMode === 'images') {
                // Parse CSV or newlines for image URLs
                const urls = imageUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
                newDeck.slides = urls.map((url, idx) => ({
                    id: `slide-${idx}`,
                    title: `Slide ${idx + 1}`,
                    content: [],
                    imageUrl: url
                }));
            } else {
                // Placeholder slide for PDF mode
                newDeck.slides = [{ id: '1', title: 'PDF View', content: ['View PDF content below'] }];
            }

            onAdd(newDeck);
            resetForm();

        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload presentation");
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setAuthor("");
        setPdfUrl("");
        setPdfFile(null);
        setImageUrls("");
        setAddMode(null);
        setPdfUploadType('link');
        setIsAddModalOpen(false);
    };

    if (activeDeck) {
        // If it's a PDF deck
        if (activeDeck.pdfUrl) {
            return (
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => { setActiveDeck(null); setCurrentSlide(0); }} className="text-slate-400 hover:text-white flex items-center gap-2">
                            <ChevronLeft className="w-4 h-4" /> Back to Decks
                        </button>
                        <a href={activeDeck.pdfUrl} download={activeDeck.title} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium">
                            <Download className="w-4 h-4" /> {activeDeck.pdfUrl.startsWith('blob:') ? 'Download File' : 'Open Original'}
                        </a>
                    </div>
                    <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center p-4 relative">
                        {/* Using object tag instead of iframe for better local blob support */}
                        <object
                            data={activeDeck.pdfUrl}
                            type="application/pdf"
                            className="w-full h-full rounded-lg bg-white"
                        >
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <p className="mb-2">Unable to display PDF inline.</p>
                                <a href={activeDeck.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">Click here to view</a>
                            </div>
                        </object>
                    </div>
                </div>
            );
        }

        const slide = activeDeck.slides[currentSlide];
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => { setActiveDeck(null); setCurrentSlide(0); }} className="text-slate-400 hover:text-white flex items-center gap-2">
                        <ChevronLeft className="w-4 h-4" /> Back to Decks
                    </button>
                    <div className="flex gap-2">
                        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white">
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Slide Viewer */}
                <div className="flex-1 bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
                    {slide.imageUrl ? (
                        <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-contain bg-black" />
                    ) : (
                        <>
                            {/* Slide Content */}
                            <div className="flex-1 p-12 flex flex-col justify-center animate-in fade-in duration-300" key={currentSlide}>
                                <h2 className="text-4xl font-bold mb-8 text-indigo-700">{slide.title}</h2>
                                <div className="space-y-4">
                                    {slide.content.map((bullet, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-xl">
                                            <span className="text-indigo-500 mt-1.5">•</span>
                                            <span>{bullet}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="h-12 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-6 text-sm text-slate-500 shrink-0">
                        <span>{activeDeck.title}</span>
                        <span>{currentSlide + 1} / {activeDeck.slides.length}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-8 mt-6">
                    <button
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className="p-3 bg-slate-800 rounded-full disabled:opacity-30 hover:bg-indigo-600 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={nextSlide}
                        disabled={currentSlide === activeDeck.slides.length - 1}
                        className="p-3 bg-slate-800 rounded-full disabled:opacity-30 hover:bg-indigo-600 transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Presentations</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                    <Plus className="w-4 h-4" /> Add Presentation
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {presentations.map((deck) => (
                    <div
                        key={deck.id}
                        onClick={() => setActiveDeck(deck)}
                        className="group bg-slate-800 border border-slate-700 hover:border-indigo-500/50 p-1 rounded-xl cursor-pointer transition-all hover:-translate-y-1 relative"
                    >
                        <div className="bg-slate-200 aspect-[4/3] rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                            {deck.slides[0]?.imageUrl ? (
                                <img src={deck.slides[0].imageUrl} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6 w-full">
                                    <h3 className="text-slate-800 font-bold text-lg mb-2 line-clamp-2">{deck.title}</h3>
                                    <p className="text-slate-500 text-xs">{deck.slides.length} slides</p>
                                    {deck.pdfUrl && <p className="text-indigo-600 text-xs font-bold mt-2 uppercase">PDF Document</p>}
                                </div>
                            )}

                            <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors flex items-center justify-center">
                                <div className="bg-white/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl">
                                    <MonitorPlay className="w-6 h-6 text-indigo-600 fill-current" />
                                </div>
                            </div>
                        </div>
                        <div className="px-3 pb-3 pr-10">
                            <p className="text-slate-300 font-medium truncate">{deck.title}</p>
                            <p className="text-slate-500 text-xs">By {deck.author}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                            className="absolute bottom-3 right-3 p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors z-10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {presentations.length === 0 && (
                    <div className="col-span-full text-center py-20 text-slate-500">No presentations available.</div>
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCancel}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Add Presentation</h3>
                            <button onClick={handleCancel} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        {!addMode ? (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setAddMode('pdf')} className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl flex flex-col items-center gap-3 transition-colors">
                                    <FileText className="w-10 h-10 text-indigo-400" />
                                    <span className="font-medium text-white">Upload/Link PDF</span>
                                </button>
                                <button onClick={() => setAddMode('images')} className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl flex flex-col items-center gap-3 transition-colors">
                                    <Images className="w-10 h-10 text-emerald-400" />
                                    <span className="font-medium text-white">Image Series</span>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                    <input type="text" required={!title} value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Author</label>
                                    <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                                </div>

                                {addMode === 'pdf' ? (
                                    <div>
                                        {/* Tabs for PDF */}
                                        <div className="flex gap-2 mb-2 bg-slate-900 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setPdfUploadType('link')}
                                                className={`flex-1 py-2 text-sm rounded-md transition-colors ${pdfUploadType === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                Link URL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPdfUploadType('file')}
                                                className={`flex-1 py-2 text-sm rounded-md transition-colors ${pdfUploadType === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                Upload File
                                            </button>
                                        </div>

                                        {pdfUploadType === 'link' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1">PDF URL</label>
                                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                                    <LinkIcon className="w-4 h-4 text-slate-500" />
                                                    <input type="url" required={pdfUploadType === 'link'} value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} className="flex-1 bg-transparent text-white focus:outline-none" placeholder="https://example.com/slides.pdf" />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Google Drive links will be auto-converted to preview mode.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1">Upload PDF File</label>
                                                <div className="relative group cursor-pointer border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 transition-colors text-center">
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={handlePdfFileChange}
                                                        required={pdfUploadType === 'file' && !pdfUrl}
                                                    />
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
                                                        <span className="text-sm text-slate-400 group-hover:text-white">Drop PDF here or click to upload</span>
                                                    </div>
                                                </div>
                                                {pdfUrl && pdfUploadType === 'file' && <p className="text-xs text-green-400 mt-2 text-center">File loaded successfully</p>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Image URLs (comma separated or new line)</label>
                                        <textarea required value={imageUrls} onChange={e => setImageUrls(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono" placeholder="https://site.com/slide1.jpg&#10;https://site.com/slide2.jpg" />
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setAddMode(null)} className="flex-1 py-3 text-slate-400 hover:text-white">Back</button>
                                    <button type="submit" disabled={addMode === 'pdf' && !pdfUrl || isUploading} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl">
                                        {isUploading ? 'Uploading...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresentationSection;