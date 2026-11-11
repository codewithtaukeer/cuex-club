import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VENUE_INFO } from '../../lib/utils';

export const StickyBottomBar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on booking page itself to avoid form clutter
  if (location.pathname.startsWith('/booking')) {
    return null;
  }

  const handleAction = () => {
    if (!user) {
      navigate('/auth?redirect=/booking');
    } else {
      navigate('/booking');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-obsidian/95 backdrop-blur-lg border-t border-champagne/20 px-4 py-3 pb-safe shadow-[0_-10px_25px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-3">
        {/* Quick Call & WhatsApp shortcuts */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${VENUE_INFO.phone}`}
            className="w-11 h-11 rounded-xl bg-charcoal border border-white/10 flex items-center justify-center text-warmivory active:scale-95"
            aria-label="Call"
          >
            <Phone className="w-5 h-5 text-champagne" />
          </a>
          <a
            href={VENUE_INFO.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 rounded-xl bg-charcoal border border-[#25D366]/30 flex items-center justify-center text-[#25D366] active:scale-95"
            aria-label="WhatsApp"
          >
            <MessageSquare className="w-5 h-5" />
          </a>
        </div>

        {/* Primary CTA button */}
        <button
          onClick={handleAction}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-gold-glow active:scale-98 transition-transform"
        >
          <Calendar className="w-4 h-4" />
          <span>{user ? 'BOOK YOUR GAME' : 'SIGN IN TO BOOK'}</span>
        </button>
      </div>
    </div>
  );
};
