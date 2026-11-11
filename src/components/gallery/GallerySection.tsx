import React, { useState } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  title: string;
  category: string;
  caption: string;
}

export const GallerySection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

  const galleryItems: MediaItem[] = [
    {
      id: 'video-reel',
      type: 'video',
      src: '/assets/cuex-venue-reel.mp4',
      title: 'CueX Official Venue Reel',
      category: 'reel',
      caption: 'Experience the dynamic club atmosphere, equipment, controllers, and emerald tables.',
    },
    {
      id: 'interior-tables',
      type: 'image',
      src: '/assets/cuex-interior.jpg',
      title: 'Pool & Snooker Arena',
      category: 'tables',
      caption: 'Emerald green walls, bright billiards felt, directional table lighting and spacious floor.',
    },
    {
      id: 'ps5-lounge',
      type: 'image',
      src: '/assets/cuex-ps5.jpg',
      title: 'PlayStation 5 Gaming Station',
      category: 'gaming',
      caption: 'Dedicated 4K console gaming station with DualSense wireless controllers.',
    },
    {
      id: 'cue-craft',
      type: 'image',
      src: '/assets/cuex-cue-detail.jpg',
      title: 'Championship Cue Detail',
      category: 'details',
      caption: 'Handcrafted precision billiards cue with fine wood grain and brass ferrule.',
    },
    {
      id: 'logo-brand',
      type: 'image',
      src: '/assets/cuex-logo.png',
      title: 'Official CueX Emblem',
      category: 'brand',
      caption: 'The golden circular seal of CueX - Pool | Snooker | Cafe.',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Experiences' },
    { id: 'tables', label: 'The Tables' },
    { id: 'gaming', label: 'PS5 Gaming' },
    { id: 'details', label: 'Equipment Details' },
    { id: 'reel', label: 'Venue Video Reel' },
  ];

  const filteredItems =
    activeCategory === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

  const handleNext = () => {
    if (!activeItem) return;
    const currentIndex = galleryItems.findIndex((i) => i.id === activeItem.id);
    const nextIndex = (currentIndex + 1) % galleryItems.length;
    setActiveItem(galleryItems[nextIndex]);
  };

  const handlePrev = () => {
    if (!activeItem) return;
    const currentIndex = galleryItems.findIndex((i) => i.id === activeItem.id);
    const prevIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    setActiveItem(galleryItems[prevIndex]);
  };

  return (
    <section id="gallery" className="py-20 md:py-32 bg-charcoal/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            VISUAL TOUR
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-warmivory uppercase tracking-tight mb-3">
            ACTUAL VENUE <span className="text-gold-gradient">EXPERIENCE</span>
          </h2>
          <p className="text-xs sm:text-sm text-mutedgrey leading-relaxed">
            Real photographs and authentic moments straight from CueX in Teliyarganj, Prayagraj.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                activeCategory === cat.id
                  ? 'bg-champagne text-obsidian shadow-gold-glow'
                  : 'bg-charcoal border border-white/5 text-mutedgrey hover:text-warmivory'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="group relative rounded-2xl overflow-hidden bg-obsidian border border-champagne/20 cursor-pointer shadow-lg hover:border-champagne hover:shadow-gold-glow transition-all duration-300 aspect-video md:aspect-[4/3]"
            >
              {item.type === 'video' ? (
                <div className="w-full h-full relative bg-charcoal">
                  <video
                    src={item.src}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-obsidian/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-champagne text-obsidian flex items-center justify-center shadow-gold-glow group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                <span className="text-[10px] text-champagne uppercase tracking-widest font-bold">
                  {item.category}
                </span>
                <h4 className="font-display text-xl text-warmivory uppercase tracking-wide">
                  {item.title}
                </h4>
                <p className="text-[11px] text-mutedgrey truncate">{item.caption}</p>
              </div>

              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-obsidian/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-warmivory opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-obsidian/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <button
            onClick={() => setActiveItem(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-charcoal border border-white/20 text-warmivory hover:text-champagne transition-colors z-50"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-charcoal/80 border border-white/10 text-warmivory hover:text-champagne transition-colors z-50"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-charcoal/80 border border-white/10 text-warmivory hover:text-champagne transition-colors z-50"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center">
            {activeItem.type === 'video' ? (
              <video
                src={activeItem.src}
                controls
                autoPlay
                className="max-h-[70vh] rounded-2xl border border-champagne/40 shadow-2xl"
              />
            ) : (
              <img
                src={activeItem.src}
                alt={activeItem.title}
                className="max-h-[70vh] object-contain rounded-2xl border border-champagne/40 shadow-2xl"
              />
            )}

            <div className="mt-4 text-center">
              <h3 className="font-display text-2xl text-warmivory uppercase">
                {activeItem.title}
              </h3>
              <p className="text-xs text-mutedgrey max-w-lg mx-auto mt-1">
                {activeItem.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
