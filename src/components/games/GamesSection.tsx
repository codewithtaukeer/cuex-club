import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, CircleDot, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const GamesSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFacilityBook = (facilityId: 'ps5' | 'pool' | 'snooker') => {
    if (!user) {
      navigate(`/auth?redirect=/booking&facility=${facilityId}`);
    } else {
      navigate(`/booking?facility=${facilityId}`);
    }
  };

  const facilities = [
    {
      id: 'ps5' as const,
      title: 'THE GAMING STATION',
      subtitle: 'PLAYSTATION 5 EXPERIENCE',
      tag: 'Console Gaming',
      description: 'Grab the controller, challenge your friends, and bring your favourite next-gen titles to life on a high refresh 4K display.',
      image: '/assets/cuex-ps5.jpg',
      icon: <Gamepad2 className="w-5 h-5 text-blue-400" />,
      accentColor: 'border-blue-500/30 hover:border-blue-500/60',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      pricing: [
        { label: 'Single Player (1 Hr)', price: '₹149' },
        { label: 'Single Player (2 Hrs)', price: '₹249' },
        { label: '2 Players (1 Hr)', price: '₹249' },
        { label: '2 Players (2 Hrs)', price: '₹349' },
      ],
      features: ['DualSense Controllers', '4K Ultra HD Display', 'Top Titles & Multiplayer', 'Air Conditioned Setup'],
      cta: 'BOOK PS5',
    },
    {
      id: 'pool' as const,
      title: 'THE POOL TABLE',
      subtitle: 'CLASSIC ENGLISH BILLIARDS',
      tag: 'Tournament Grade',
      description: 'Line up your shot, master your angles, and let every frame count on an authentic English pool table with fine emerald-green cloth.',
      image: '/assets/cuex-interior.jpg',
      icon: <CircleDot className="w-5 h-5 text-emerald-400" />,
      accentColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      glow: 'shadow-[0_0_30px_rgba(8,120,77,0.2)]',
      pricing: [
        { label: '1 Hour Table Booking', price: '₹120' },
        { label: 'Single Game (Per Game)', price: '₹40' },
      ],
      features: ['Emerald Green Cloth', 'Precision Balanced Cues', 'Tournament Spec Balls', 'Ample Cueing Clearance'],
      cta: 'BOOK POOL',
    },
    {
      id: 'snooker' as const,
      title: 'THE SNOOKER TABLE',
      subtitle: 'PRECISION & MASTERY',
      tag: 'Championship Spec',
      description: 'Precision, patience, and perfect positioning. Make your next break unforgettable on our dedicated full-size snooker table with overhead canopy lighting.',
      image: '/assets/cuex-cue-detail.jpg',
      icon: <Trophy className="w-5 h-5 text-champagne" />,
      accentColor: 'border-champagne/30 hover:border-champagne/60',
      glow: 'shadow-[0_0_30px_rgba(214,167,84,0.2)]',
      pricing: [
        { label: '1 Hour Table Booking', price: '₹360' },
        { label: 'Single Frame (Per Frame)', price: '₹120' },
      ],
      features: ['Full Championship Dimensions', 'Directional Canopy Lighting', 'Master Cues & Triangle', 'Rest & Spider Cues Available'],
      cta: 'BOOK SNOOKER',
    },
  ];

  return (
    <section id="games" className="py-20 md:py-32 bg-charcoal/50 relative overflow-hidden border-t border-b border-white/5">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-cuexemerald/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-champagne/10 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            FACILITIES AT CUEX
          </div>
          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl text-warmivory uppercase tracking-tight mb-4">
            CHOOSE YOUR <span className="text-gold-gradient">GAME</span>
          </h2>
          <p className="font-display text-xl sm:text-2xl text-champagne/80 tracking-widest uppercase mb-2">
            THREE EXPERIENCES. ONE DESTINATION.
          </p>
          <p className="text-mutedgrey text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Exactly three independently bookable setups in Prayagraj. Choose your discipline, lock in your slot, and play in complete comfort.
          </p>
        </div>

        {/* 3 Facility Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className={`group flex flex-col justify-between rounded-2xl bg-obsidian/90 border ${fac.accentColor} transition-all duration-300 hover:-translate-y-2 ${fac.glow} overflow-hidden`}
            >
              {/* Top Image Container */}
              <div className="relative h-60 sm:h-72 overflow-hidden bg-charcoal">
                <img
                  src={fac.image}
                  alt={fac.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                
                {/* Floating Tag */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/10 text-[10px] tracking-wider text-warmivory uppercase font-semibold">
                  {fac.icon}
                  <span>{fac.tag}</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.25em] text-champagne uppercase block mb-1">
                    {fac.subtitle}
                  </span>
                  <h3 className="font-display text-3xl sm:text-4xl text-warmivory uppercase tracking-wider mb-3">
                    {fac.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-mutedgrey leading-relaxed mb-6">
                    {fac.description}
                  </p>

                  {/* Pricing Table Box */}
                  <div className="rounded-xl bg-charcoal/80 border border-white/5 p-4 mb-6">
                    <div className="text-[10px] tracking-widest text-champagne uppercase font-bold mb-2 pb-1 border-b border-white/5 flex items-center justify-between">
                      <span>Rate Structure</span>
                      <span className="text-[9px] text-mutedgrey font-normal">Pay at Venue</span>
                    </div>
                    <div className="space-y-1.5">
                      {fac.pricing.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-mutedgrey">{p.label}</span>
                          <span className="font-bold text-warmivory">{p.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Checkmarks */}
                  <div className="grid grid-cols-2 gap-2 mb-8 text-[11px] text-mutedgrey">
                    {fac.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-champagne/80 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  onClick={() => handleFacilityBook(fac.id)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-gold-glow transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-102"
                >
                  <span>{fac.cta}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
