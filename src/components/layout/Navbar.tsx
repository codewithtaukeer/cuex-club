import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, LogOut, Shield, Phone, MessageSquare, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VENUE_INFO } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Games', path: '/#games' },
    { name: 'Availability', path: '/availability' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleBookNowClick = () => {
    navigate('/booking');
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-3 sm:px-6 lg:px-8 ${
          isScrolled
            ? 'py-2.5 bg-obsidian/85 backdrop-blur-md shadow-2xl border-b border-champagne/15'
            : 'py-3.5 md:py-5 bg-gradient-to-b from-obsidian/90 via-obsidian/30 to-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-champagne/40 group-hover:border-champagne transition-all duration-300 shadow-[0_0_15px_rgba(214,167,84,0.2)]">
              <img
                src="/assets/cuex-logo.png"
                alt="CueX Logo"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl sm:text-2xl tracking-wider text-warmivory group-hover:text-champagne transition-colors leading-none">
                CUEX
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.25em] text-champagne font-medium uppercase leading-tight">
                POOL • SNOOKER • CAFE
              </span>
            </div>
          </Link>

          {/* Desktop Floating Pill Navigation Bar (Matching Reference Layout) */}
          <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-[#141615]/85 backdrop-blur-xl border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-xs uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-warmivory shadow-sm'
                      : 'text-warmivory/70 hover:text-warmivory hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            <Link
              to="/my-bookings"
              className={`text-xs uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                location.pathname === '/my-bookings'
                  ? 'bg-white/15 text-champagne shadow-sm'
                  : 'text-warmivory/70 hover:text-champagne hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-champagne" />
              <span>My Bookings</span>
            </Link>

            {/* Subtle Divider */}
            <div className="w-[1px] h-4 bg-white/15 mx-1" />

            {/* Auth State: Sign In vs Log Out */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1">
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-champagne/15 border border-champagne/30 text-champagne text-xs font-bold uppercase tracking-wider hover:bg-champagne/25 transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                ) : (
                  <span className="text-xs text-warmivory/80 font-medium px-2 truncate max-w-[90px]">
                    {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                )}

                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className={`text-xs uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                  location.pathname === '/auth'
                    ? 'bg-white/15 text-warmivory shadow-sm'
                    : 'text-warmivory/80 hover:text-champagne hover:bg-white/5'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-champagne" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Gradient Outline CTA Pill (Matching "Say Hello" in Reference Image) */}
            <button
              onClick={handleBookNowClick}
              className="relative group p-[1.5px] rounded-full bg-gradient-to-r from-cuexemerald via-champagne to-warmgold transition-all duration-300 shadow-[0_0_20px_rgba(214,167,84,0.25)] hover:shadow-[0_0_25px_rgba(214,167,84,0.45)] ml-1"
            >
              <div className="px-5 py-1.5 rounded-full bg-[#121312] group-hover:bg-gradient-to-r group-hover:from-champagne group-hover:to-warmgold text-champagne group-hover:text-obsidian font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5">
                <span>Book Now</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          </div>

          {/* Mobile & Tablet Pill Bar */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Quick Auth Pill for Mobile */}
            {user ? (
              <div className="flex items-center gap-1 bg-[#141615]/80 backdrop-blur-xl border border-white/10 rounded-full p-1">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="p-1.5 rounded-full bg-champagne/15 text-champagne text-xs font-bold"
                    aria-label="Admin Dashboard"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#141615]/80 backdrop-blur-xl border border-white/10 text-xs text-warmivory/90 hover:text-champagne font-semibold transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-champagne" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Book CTA */}
            <button
              onClick={handleBookNowClick}
              className="p-[1.5px] rounded-full bg-gradient-to-r from-cuexemerald via-champagne to-warmgold"
            >
              <div className="px-3.5 py-1.5 rounded-full bg-obsidian text-champagne font-bold text-xs uppercase tracking-wider">
                Book
              </div>
            </button>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full bg-[#141615]/80 border border-white/10 text-warmivory hover:text-champagne focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Full-Screen Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-obsidian/95 backdrop-blur-2xl flex flex-col justify-between pt-24 pb-8 px-6 lg:hidden animate-in fade-in duration-200">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-6 border-b border-white/10">
              <img
                src="/assets/cuex-logo.png"
                alt="CueX"
                className="w-12 h-12 rounded-full border border-champagne/40"
              />
              <div>
                <h3 className="font-display text-2xl text-warmivory tracking-wider leading-none">CUEX</h3>
                <p className="text-[10px] text-champagne tracking-widest">TELIYARGANJ • PRAYAGRAJ</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-lg font-display tracking-widest text-warmivory/90 hover:text-champagne flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-white/5 transition-all"
                >
                  <span>{link.name}</span>
                  <span className="text-champagne/40 text-xs">0{navLinks.indexOf(link) + 1}</span>
                </Link>
              ))}

              <Link
                to="/my-bookings"
                className="text-lg font-display tracking-widest text-champagne flex items-center justify-between py-2 px-3 rounded-xl bg-champagne/10 border border-champagne/20"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  My Bookings
                </span>
                <span className="text-xs bg-champagne/20 text-champagne px-2 py-0.5 rounded-full">Lookup</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-lg font-display tracking-widest text-warmgold flex items-center justify-between py-2 px-3 rounded-xl bg-warmgold/10 border border-warmgold/20"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Admin Panel
                  </span>
                  <span className="text-xs bg-warmgold/20 text-warmgold px-2 py-0.5 rounded-full">Owner</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
            <button
              onClick={handleBookNowClick}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-sm tracking-widest uppercase shadow-gold-glow text-center"
            >
              Book Your Game
            </button>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <a
                href={`tel:${VENUE_INFO.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-charcoal border border-white/10 text-xs text-warmivory font-medium"
              >
                <Phone className="w-4 h-4 text-champagne" />
                Call Club
              </a>
              <a
                href={VENUE_INFO.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-xs text-[#25D366] font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </a>
            </div>

            {/* Auth Action in Mobile Drawer */}
            <div className="pt-2 border-t border-white/5">
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out ({profile?.full_name || user.email})</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-warmivory font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-champagne" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
