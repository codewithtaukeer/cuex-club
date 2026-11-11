import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CinematicHero: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBookingClick = () => {
    if (!user) {
      navigate('/auth?redirect=/booking');
    } else {
      navigate('/booking');
    }
  };

  const handleAvailabilityClick = () => {
    if (!user) {
      navigate('/auth?redirect=/availability');
    } else {
      navigate('/availability');
    }
  };

  const scrollToGames = () => {
    const el = document.getElementById('games');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[92vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-obsidian pt-24 pb-16 md:py-0">
      {/* 1. Cinematic Background layers */}
      <div className="absolute inset-0 z-0">
        {/* Real interior photograph with dark luxury overlay */}
        <img
          src="/assets/cuex-interior.jpg"
          alt="CueX Luxury Gaming Lounge Interior"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-75 contrast-125 scale-105 transform motion-safe:animate-pulse-slow"
        />

        {/* Emerald green billiards table atmospheric glow */}
        <div className="absolute top-1/4 left-1/4 w-[45vw] h-[45vw] rounded-full bg-cuexemerald/15 blur-[140px] pointer-events-none" />
        
        {/* Champagne gold ambient backlight */}
        <div className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] rounded-full bg-champagne/10 blur-[130px] pointer-events-none" />

        {/* Diagonal Cue stick graphic background line */}
        <div className="absolute -top-32 -right-32 w-2 h-[1200px] bg-gradient-to-b from-transparent via-champagne/20 to-transparent rotate-45 pointer-events-none blur-[1px]" />
        
        {/* Radial dark gradient mask */}
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-obsidian/85 to-obsidian" />
      </div>

      {/* 2. Floating Billiard Balls Micro-Visuals (Desktop & Tablet) */}
      <div className="hidden md:block absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Ball 8 (Black with gold shine) */}
        <motion.div
          animate={{ y: [0, -18, 0], x: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-10 lg:left-24 w-14 h-14 rounded-full bg-gradient-to-br from-charcoal via-obsidian to-black border border-white/20 shadow-2xl flex items-center justify-center"
        >
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-inner">
            <span className="text-[11px] font-bold text-obsidian">8</span>
          </div>
          <div className="absolute top-1 left-2 w-3 h-2 bg-white/40 rounded-full blur-[1px]" />
        </motion.div>

        {/* Ball 1 (Gold/Yellow cue ball) */}
        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-12 lg:right-28 w-12 h-12 rounded-full bg-gradient-to-br from-warmgold via-champagne to-champagne-dark border border-champagne/40 shadow-gold-glow flex items-center justify-center"
        >
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-inner">
            <span className="text-[10px] font-bold text-obsidian">1</span>
          </div>
        </motion.div>

        {/* Ball 3 (Emerald table green ball) */}
        <motion.div
          animate={{ y: [0, -14, 0], x: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-9 h-9 rounded-full bg-gradient-to-br from-cuexemerald-light via-cuexemerald to-cuexemerald-dark border border-emerald-400/30 shadow-emerald-glow opacity-80"
        />
      </div>

      {/* 3. Main Hero Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Subtle Luxury Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-charcoal/90 border border-champagne/30 text-champagne text-[11px] md:text-xs font-semibold tracking-[0.2em] uppercase mb-6 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-warmgold" />
          <span>TELIYARGANJ • PRAYAGRAJ</span>
          <span className="w-1 h-1 rounded-full bg-champagne" />
          <span>EST. 2026</span>
        </motion.div>

        {/* Official CueX Circular Logo Badge with Golden Glow */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-b from-champagne-light via-champagne to-transparent shadow-[0_0_50px_rgba(214,167,84,0.35)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-obsidian flex items-center justify-center">
              <img
                src="/assets/cuex-logo.png"
                alt="CueX Official Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {/* Subtle spinning glow ring */}
          <div className="absolute -inset-1 rounded-full border border-champagne/30 pointer-events-none animate-pulse" />
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight leading-[0.9] text-warmivory uppercase mb-4"
        >
          WHERE EVERY <br />
          <span className="text-gold-gradient">SHOT COUNTS.</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-display text-lg sm:text-2xl md:text-3xl tracking-[0.25em] text-champagne uppercase mb-4"
        >
          RACK UP. POWER UP. HANG OUT.
        </motion.p>

        {/* Supporting text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl text-xs sm:text-sm md:text-base text-mutedgrey leading-relaxed mb-8 px-2"
        >
          Prayagraj's premier lounge for tournament-grade pool, championship snooker and 4K PlayStation 5 gaming. Bring your squad. Make your move.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
        >
          <button
            onClick={handleBookingClick}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-extrabold text-xs md:text-sm tracking-widest uppercase shadow-gold-glow hover:shadow-gold-glow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>Reserve Your Slot</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={scrollToGames}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-charcoal/80 border border-champagne/30 text-warmivory hover:text-champagne hover:border-champagne text-xs md:text-sm tracking-widest uppercase transition-all duration-300 backdrop-blur-sm"
          >
            Explore The Club
          </button>
        </motion.div>

        {/* Real Availability Indicator Banner */}
        <motion.button
          onClick={handleAvailabilityClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cuexemerald/10 border border-cuexemerald/30 text-emerald-300 hover:bg-cuexemerald/20 transition-all text-xs font-medium cursor-pointer group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Check Real-Time Availability Today</span>
          <span className="text-emerald-400/80 group-hover:translate-x-0.5 transition-transform">→</span>
        </motion.button>

        {/* 3 Facility Snapshot Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="grid grid-cols-3 gap-2 sm:gap-6 mt-10 max-w-lg w-full pt-6 border-t border-white/10"
        >
          <div className="flex flex-col items-center">
            <span className="font-display text-lg sm:text-xl text-warmivory">1 PS5</span>
            <span className="text-[10px] sm:text-xs text-mutedgrey tracking-wider uppercase">Station</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <span className="font-display text-lg sm:text-xl text-warmivory">1 POOL</span>
            <span className="text-[10px] sm:text-xs text-mutedgrey tracking-wider uppercase">Table</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-lg sm:text-xl text-warmivory">1 SNOOKER</span>
            <span className="text-[10px] sm:text-xs text-mutedgrey tracking-wider uppercase">Table</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
        <span className="text-[10px] tracking-[0.25em] text-champagne/60 uppercase block mb-1">SCROLL</span>
        <div className="w-4 h-7 rounded-full border border-champagne/30 mx-auto flex items-start justify-center p-1">
          <div className="w-1 h-2 rounded-full bg-champagne animate-bounce" />
        </div>
      </div>
    </section>
  );
};
