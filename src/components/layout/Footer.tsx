import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageSquare, MapPin, ArrowUpRight } from 'lucide-react';
import { InstagramIcon } from '../common/Icons';
import { VENUE_INFO } from '../../lib/utils';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-obsidian border-t border-champagne/15 pt-16 pb-24 md:pb-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cuexemerald/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-champagne/5 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          {/* Col 1: Brand & Identity */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/assets/cuex-logo.png"
                alt="CueX"
                className="w-12 h-12 rounded-full border border-champagne/40"
              />
              <div>
                <span className="font-display text-2xl text-warmivory tracking-wider block">CUEX</span>
                <span className="text-[9px] tracking-[0.25em] text-champagne block">POOL | SNOOKER | CAFE</span>
              </div>
            </Link>
            <p className="text-mutedgrey text-xs leading-relaxed max-w-sm mt-2">
              Prayagraj's premier destination for competitive pool, championship snooker and 4K PlayStation 5 gaming. Precision shots, luxury atmosphere, elite competition.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a
                href={VENUE_INFO.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-charcoal border border-champagne/20 flex items-center justify-center text-champagne hover:border-champagne hover:scale-105 transition-all shadow-sm"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={VENUE_INFO.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-charcoal border border-champagne/20 flex items-center justify-center text-[#25D366] hover:border-[#25D366] hover:scale-105 transition-all shadow-sm"
                aria-label="WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href={`tel:${VENUE_INFO.phone}`}
                className="w-9 h-9 rounded-full bg-charcoal border border-champagne/20 flex items-center justify-center text-warmivory hover:text-champagne hover:border-champagne hover:scale-105 transition-all shadow-sm"
                aria-label="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: The Facilities */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-warmivory uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
              Gaming Facilities
            </h4>
            <ul className="space-y-2.5 text-xs text-mutedgrey">
              <li>
                <Link to="/booking?facility=ps5" className="hover:text-champagne transition-colors flex items-center justify-between">
                  <span>PS5 Gaming Station</span>
                  <span className="text-[10px] text-champagne/70">From ₹149</span>
                </Link>
              </li>
              <li>
                <Link to="/booking?facility=pool" className="hover:text-champagne transition-colors flex items-center justify-between">
                  <span>English Pool Table</span>
                  <span className="text-[10px] text-champagne/70">₹120/hr • ₹60/match</span>
                </Link>
              </li>
              <li>
                <Link to="/booking?facility=snooker" className="hover:text-champagne transition-colors flex items-center justify-between">
                  <span>Championship Snooker Table</span>
                  <span className="text-[10px] text-champagne/70">₹120/hr • ₹60/match</span>
                </Link>
              </li>
              <li className="pt-2">
                <Link to="/availability" className="text-champagne hover:underline inline-flex items-center gap-1 font-semibold">
                  Check Live Availability
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-warmivory uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
              Club Navigation
            </h4>
            <ul className="space-y-2 text-xs text-mutedgrey">
              <li>
                <Link to="/" className="hover:text-champagne transition-colors">Home Experience</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-champagne transition-colors">About CueX</Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-champagne transition-colors">Venue & Table Gallery</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-champagne transition-colors">Contact & Enquiries</Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-champagne transition-colors">My Reservations</Link>
              </li>
              <li className="pt-2 border-t border-white/5">
                <Link to="/auth?redirect=/admin" className="text-mutedgrey/40 hover:text-champagne transition-colors text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1">
                  <span>Admin Portal</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Location & Hours */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-warmivory uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
              Venue & Location
            </h4>
            <div className="space-y-3 text-xs text-mutedgrey">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-champagne shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {VENUE_INFO.address}
                </span>
              </div>
              <div className="pt-1">
                <a
                  href={VENUE_INFO.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-champagne hover:text-warmgold font-semibold underline underline-offset-4"
                >
                  Open in Google Maps
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[11px] text-warmivory font-medium">Operating Hours:</p>
                <p className="text-[11px] text-mutedgrey">Monday – Sunday: 11:00 AM – 11:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Closing statement & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-sm tracking-widest text-champagne uppercase text-center md:text-left">
            THE GAME IS ALWAYS ON AT CUEX.
          </p>
          <p className="text-[11px] text-mutedgrey text-center md:text-right">
            © {currentYear} CueX Lounge. All rights reserved. Prayagraj, Uttar Pradesh.
          </p>
        </div>
      </div>
    </footer>
  );
};
