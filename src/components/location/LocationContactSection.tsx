import React, { useState } from 'react';
import { MapPin, Phone, MessageSquare, Send, CheckCircle2, ArrowUpRight, Clock } from 'lucide-react';
import { InstagramIcon } from '../common/Icons';
import { supabase } from '../../lib/supabase';
import { VENUE_INFO } from '../../lib/utils';

export const LocationContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setErrorMsg('Please fill in all fields before sending.');
      return;
    }

    setSending(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('cuex_contact_messages').insert({
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
      });

      if (error) throw error;

      setSentSuccess(true);
      setName('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message. Please reach out via WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-obsidian relative overflow-hidden border-t border-white/5">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-champagne/5 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            VISIT & REACH OUT
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-warmivory uppercase tracking-tight mb-3">
            FIND YOUR WAY <span className="text-gold-gradient">TO CUEX</span>
          </h2>
          <p className="text-xs sm:text-sm text-mutedgrey leading-relaxed">
            Conveniently situated in Teliyarganj, Prayagraj. Drop by, book your slot, or get in touch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Venue Info & Maps Link */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-charcoal/80 border border-champagne/20 p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <span className="text-[10px] tracking-[0.25em] text-champagne uppercase font-bold block mb-1">
                  OFFICIAL LOCATION
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-warmivory uppercase">
                  CUEX — POOL | SNOOKER | CAFE
                </h3>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-mutedgrey">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-champagne shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-warmivory">
                    {VENUE_INFO.address}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-champagne shrink-0" />
                  <a href={`tel:${VENUE_INFO.phone}`} className="hover:text-champagne transition-colors">
                    {VENUE_INFO.phoneDisplay}
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-champagne shrink-0" />
                  <span className="text-champagne font-semibold">Open Daily: 8:00 AM – 3:00 AM (Night Gaming)</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={`tel:${VENUE_INFO.phone}`}
                  className="py-3 px-3 rounded-xl bg-charcoal border border-white/10 hover:border-champagne text-xs font-semibold text-warmivory flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-champagne" />
                  Call Club
                </a>
                <a
                  href={VENUE_INFO.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-3 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#25D366]/25 transition-all text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <a
                  href={VENUE_INFO.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-3 rounded-xl bg-charcoal border border-white/10 hover:border-pink-500/50 text-xs font-semibold text-warmivory flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                  Instagram
                </a>
              </div>

              {/* Exact Google Maps Directions Action Banner */}
              <div className="pt-2">
                <a
                  href={VENUE_INFO.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-gold-glow hover:shadow-gold-glow-lg transition-transform active:scale-98"
                >
                  <span>Open Google Maps Directions</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Contact Form */}
          <div className="rounded-3xl bg-charcoal/80 border border-white/10 p-6 sm:p-8 shadow-xl">
            <h3 className="font-display text-2xl sm:text-3xl text-warmivory uppercase mb-2">
              SEND US A MESSAGE
            </h3>
            <p className="text-xs text-mutedgrey mb-6">
              Have questions about tournaments, membership, or booking private events?
            </p>

            {sentSuccess ? (
              <div className="p-6 rounded-2xl bg-cuexemerald/15 border border-cuexemerald/40 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-display text-2xl text-warmivory">MESSAGE RECEIVED</h4>
                <p className="text-xs text-mutedgrey">
                  Thank you! We have received your note and our team will get in touch shortly.
                </p>
                <button
                  onClick={() => setSentSuccess(false)}
                  className="text-xs text-champagne hover:underline font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-mutedgrey mb-1 font-medium">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-mutedgrey mb-1 font-medium">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-mutedgrey mb-1 font-medium">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you'd like to ask..."
                    className="w-full px-4 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 rounded-xl bg-champagne hover:bg-champagne-light text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
