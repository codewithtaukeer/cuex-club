import React from 'react';
import { Sparkles, Target, Zap, Coffee, Shield } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 md:py-32 bg-obsidian relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-1/2 right-0 w-[40vw] h-[40vw] bg-cuexemerald/10 blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Visual Composition with Real Photos */}
          <div className="relative">
            {/* Primary Interior Photograph */}
            <div className="relative z-10 rounded-3xl overflow-hidden border border-champagne/30 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <img
                src="/assets/cuex-interior.jpg"
                alt="CueX Billiards and Gaming Lounge Interior"
                className="w-full h-80 sm:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-[10px] tracking-[0.25em] text-champagne uppercase font-bold block mb-1">
                  TELIYARGANJ • PRAYAGRAJ
                </span>
                <p className="font-display text-2xl text-warmivory uppercase">
                  EMERALD FELT. CHAMPIONSHIP SPECS.
                </p>
              </div>
            </div>

            {/* Overlapping Detail Photo */}
            <div className="hidden sm:block absolute -bottom-10 -right-6 z-20 w-52 h-64 rounded-2xl overflow-hidden border-2 border-champagne/50 shadow-2xl">
              <img
                src="/assets/cuex-cue-detail.jpg"
                alt="Precision Cue Stick Detail"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating Gold Experience Badge */}
            <div className="absolute -top-4 -left-4 z-20 px-4 py-2.5 rounded-2xl bg-charcoal/95 border border-champagne/40 backdrop-blur-md shadow-gold-glow flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-warmgold" />
              <div>
                <p className="text-[10px] text-mutedgrey uppercase tracking-wider">Atmosphere</p>
                <p className="font-display text-sm text-warmivory">LUXURY CLUB VIBES</p>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Copy */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4 w-fit">
              THE CUEX PHILOSOPHY
            </div>

            <h2 className="font-display text-4xl sm:text-6xl text-warmivory uppercase tracking-tight leading-none mb-6">
              MORE THAN JUST A GAME. <br />
              <span className="text-gold-gradient">IT'S YOUR SPACE.</span>
            </h2>

            <p className="text-sm sm:text-base text-mutedgrey leading-relaxed mb-6">
              CueX brings together the precision of billiards, the excitement of console gaming, and the energy of a great hangout. Whether you're lining up the perfect bank shot, challenging your friends on the PS5, or just looking for a premium place to spend quality time in Prayagraj, there is a game waiting for you.
            </p>

            {/* Highlight Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-charcoal/60 border border-white/5">
                <Target className="w-5 h-5 text-champagne mb-2" />
                <h4 className="font-display text-lg text-warmivory uppercase">Precision Tables</h4>
                <p className="text-xs text-mutedgrey">Championship grade English pool and snooker tables with tournament cloth.</p>
              </div>

              <div className="p-4 rounded-xl bg-charcoal/60 border border-white/5">
                <Zap className="w-5 h-5 text-blue-400 mb-2" />
                <h4 className="font-display text-lg text-warmivory uppercase">4K PlayStation 5</h4>
                <p className="text-xs text-mutedgrey">Dedicated console station with DualSense wireless controllers & high refresh display.</p>
              </div>

              <div className="p-4 rounded-xl bg-charcoal/60 border border-white/5">
                <Coffee className="w-5 h-5 text-warmgold mb-2" />
                <h4 className="font-display text-lg text-warmivory uppercase">Cafe & Beverages</h4>
                <p className="text-xs text-mutedgrey">Cold drinks, refreshments and snacks served while you play.</p>
              </div>

              <div className="p-4 rounded-xl bg-charcoal/60 border border-white/5">
                <Shield className="w-5 h-5 text-emerald-400 mb-2" />
                <h4 className="font-display text-lg text-warmivory uppercase">Realtime Reservations</h4>
                <p className="text-xs text-mutedgrey">Zero waiting time. Pre-book your table or PS5 slot online in seconds.</p>
              </div>
            </div>

            {/* Visual statement */}
            <div className="p-4 rounded-xl border border-champagne/20 bg-charcoal/30 flex items-center justify-between">
              <span className="font-display text-2xl text-champagne tracking-widest uppercase">
                PLAY. COMPETE. REPEAT.
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-champagne animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
