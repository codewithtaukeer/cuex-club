import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Calendar, UserCheck, Trophy, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const HowToBookSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBook = () => {
    if (!user) {
      navigate('/auth?redirect=/booking');
    } else {
      navigate('/booking');
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Choose Your Game',
      desc: 'Select the PS5 gaming station, tournament pool table, or championship snooker table.',
      icon: <Gamepad2 className="w-5 h-5 text-champagne" />,
    },
    {
      num: '02',
      title: 'Pick Date & Time',
      desc: 'Browse actual live availability and select a convenient 30, 60, or 120-minute slot.',
      icon: <Calendar className="w-5 h-5 text-champagne" />,
    },
    {
      num: '03',
      title: 'Quick Details',
      desc: 'Provide your name and phone number for WhatsApp confirmation. No advance online payment needed.',
      icon: <UserCheck className="w-5 h-5 text-champagne" />,
    },
    {
      num: '04',
      title: 'Show Up & Play',
      desc: 'Receive your unique CX reference code, show it at the counter, rack up, and enjoy.',
      icon: <Trophy className="w-5 h-5 text-champagne" />,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-obsidian relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            SEAMLESS RESERVATIONS
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-warmivory uppercase tracking-tight mb-3">
            YOUR NEXT GAME IS <span className="text-gold-gradient">A FEW CLICKS AWAY</span>
          </h2>
          <p className="text-xs sm:text-sm text-mutedgrey leading-relaxed">
            Reserve your table or PlayStation 5 setup in under 60 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-6 rounded-2xl bg-charcoal/60 border border-white/5 hover:border-champagne/40 transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-3xl text-champagne/40 group-hover:text-champagne transition-colors">
                    {step.num}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-obsidian border border-champagne/20 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-display text-xl text-warmivory uppercase mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-mutedgrey leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleBook}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-extrabold text-xs md:text-sm uppercase tracking-widest shadow-gold-glow hover:shadow-gold-glow-lg transition-transform hover:scale-105 active:scale-95 inline-flex items-center gap-2"
          >
            <span>Book Your Experience</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
