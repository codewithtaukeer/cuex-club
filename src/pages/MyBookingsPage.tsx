import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, ArrowRight, Phone, HelpCircle, Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CuexBooking } from '../types';
import { formatToIST, formatDateIST, formatINR, generateGoogleCalendarUrl, VENUE_INFO } from '../lib/utils';
import { BookingInvoiceModal } from '../components/booking/BookingInvoiceModal';

export const MyBookingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<CuexBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<CuexBooking | null>(null);
  const [refLookup, setRefLookup] = useState<string>('');
  const [phoneLookup, setPhoneLookup] = useState<string>(() => {
    try {
      return localStorage.getItem('cuex_guest_phone') || '';
    } catch {
      return '';
    }
  });

  const fetchBookings = async (phoneToQuery?: string, refToQuery?: string) => {
    setLoading(true);
    try {
      if (user) {
        // Authenticated user lookup via RLS
        const { data, error } = await supabase
          .from('cuex_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('start_at', { ascending: false });
        if (error) throw error;
        setBookings((data as CuexBooking[]) || []);
      } else {
        // Secure Guest lookup via dedicated RPC function (protects database from public table scraping)
        const targetPhone = phoneToQuery !== undefined ? phoneToQuery : phoneLookup;
        const targetRef = refToQuery !== undefined ? refToQuery : refLookup;
        const clean = targetPhone.replace(/\D/g, '');
        const digits = clean.startsWith('91') && clean.length === 12 ? clean.slice(2) : clean.startsWith('0') && clean.length === 11 ? clean.slice(1) : clean;
        
        if (!digits || digits.length < 10) {
          setBookings([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('cuex_lookup_guest_bookings', {
          p_phone: `+91${digits}`,
          p_booking_ref: targetRef.trim() || null,
        });

        if (error) throw error;
        setBookings((data as CuexBooking[]) || []);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      fetchBookings();
    } else if (phoneLookup && phoneLookup.length >= 10) {
      fetchBookings(phoneLookup, refLookup);
    } else {
      setBookings([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-obsidian pt-28 pb-24 text-warmivory">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
              CUSTOMER CONSOLE
            </div>
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight">
              MY RESERVATIONS
            </h1>
          </div>

          <Link
            to="/booking"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-bold text-xs uppercase tracking-widest shadow-gold-glow flex items-center justify-center gap-2 w-fit"
          >
            <span>Book New Slot</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Guest Phone Lookup Bar if not logged in */}
        {!user && (
          <div className="mb-8 p-5 rounded-2xl bg-charcoal/90 border border-champagne/30">
            <p className="text-xs font-bold text-warmivory uppercase tracking-wider mb-1">
              Find Your Reservations by Mobile Number
            </p>
            <p className="text-[11px] text-mutedgrey mb-3">
              Enter the 10-digit mobile number used when requesting your PS5, Pool, or Snooker slot.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchBookings(phoneLookup, refLookup);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-[1.5] flex">
                <span className="inline-flex items-center px-3.5 rounded-l-xl bg-obsidian border border-r-0 border-white/10 text-mutedgrey text-xs font-bold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneLookup.replace('+91', '').trim()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPhoneLookup(val);
                    try {
                      localStorage.setItem('cuex_guest_phone', val);
                    } catch {}
                  }}
                  placeholder="9876543210 (Mobile Number)"
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs placeholder:text-mutedgrey/50 outline-none"
                />
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={12}
                  value={refLookup}
                  onChange={(e) => setRefLookup(e.target.value.toUpperCase())}
                  placeholder="Ref (e.g. CX-12345)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 focus:border-champagne text-warmivory text-xs placeholder:text-mutedgrey/50 outline-none uppercase font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || phoneLookup.replace(/\D/g, '').length < 10}
                className="px-6 py-2.5 rounded-xl bg-champagne text-obsidian font-bold text-xs uppercase tracking-wider hover:bg-warmgold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Searching...' : 'Lookup Bookings'}
              </button>
            </form>
          </div>
        )}

        {/* Cancellation Policy & Admin Request Notice */}
        <div className="mb-6 p-4 rounded-2xl bg-charcoal/80 border border-champagne/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-champagne shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-warmivory">Need to Cancel or Reschedule Your Slot?</p>
              <p className="text-[11px] text-mutedgrey mt-0.5 leading-relaxed">
                To maintain accurate table availability, reservations cannot be cancelled directly online. Please WhatsApp or call the CueX Admin below. The admin will immediately process your request and reopen the slot.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/916394149768?text=${encodeURIComponent('Hello CueX Admin, I am requesting assistance with cancelling or rescheduling my reservation.')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/30 flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Admin
            </a>
            <a
              href={`tel:${VENUE_INFO.phone}`}
              className="px-3 py-1.5 rounded-lg bg-charcoal border border-white/10 hover:border-champagne text-xs font-semibold text-warmivory flex items-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-champagne" />
              Call Admin
            </a>
          </div>
        </div>

        {/* Bookings List */}
        {authLoading || loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-charcoal/40 border border-white/5 p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-white/10 rounded mb-4" />
                <div className="h-4 w-2/3 bg-white/5 rounded mb-2" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl bg-charcoal/60 border border-white/10 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-champagne/10 border border-champagne/30 flex items-center justify-center mx-auto mb-4 text-champagne">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="font-display text-2xl uppercase mb-2">No Bookings Found</h3>
            <p className="text-xs text-mutedgrey max-w-sm mx-auto mb-6">
              You haven't made any reservations yet. Browse available slots and book your next game at CueX!
            </p>
            <Link
              to="/booking"
              className="px-6 py-3 rounded-full bg-champagne text-obsidian text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-gold-glow"
            >
              <span>Explore Facilities & Book</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isPast = new Date(booking.end_at).getTime() < new Date().getTime();
              const isUpcoming = !isPast && (booking.status === 'confirmed' || booking.status === 'pending_confirmation' || booking.status === 'pending');

              const resourceTitle =
                booking.resource_id === 'ps5'
                  ? 'PS5 Gaming Station'
                  : booking.resource_id === 'pool'
                  ? 'Pool Table'
                  : 'Snooker Table';

              const waLink = `https://wa.me/916394149768?text=${encodeURIComponent(
                `Hello CueX! 🎱\nI have a reservation inquiry:\n• Reference: *${booking.booking_reference}*\n• Facility: *${resourceTitle}*\n• Date: *${formatDateIST(booking.start_at)}*\n• Slot: *${formatToIST(booking.start_at)} – ${formatToIST(booking.end_at)}*\n• Status: *${booking.status.toUpperCase()}*`
              )}`;

              const calLink = generateGoogleCalendarUrl({
                booking_reference: booking.booking_reference,
                resource_name: resourceTitle,
                start_at: booking.start_at,
                end_at: booking.end_at,
              });

              return (
                <div
                  key={booking.id}
                  className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                    isUpcoming
                      ? 'bg-charcoal/90 border-champagne/30 shadow-lg'
                      : 'bg-charcoal/40 border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-2xl text-warmivory uppercase">
                          {resourceTitle}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                            booking.status === 'confirmed'
                              ? 'bg-cuexemerald/20 text-emerald-400 border-cuexemerald/40'
                              : booking.status === 'pending_confirmation' || booking.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {booking.status === 'pending_confirmation' ? 'Awaiting Confirmation' : booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-mutedgrey mt-0.5">
                        Reference: <span className="text-champagne font-bold">{booking.booking_reference}</span>
                      </p>
                    </div>

                    <div className="text-right sm:text-right">
                      <span className="font-display text-2xl text-champagne">
                        {formatINR(booking.total_amount)}
                      </span>
                      <p className="text-[10px] text-mutedgrey uppercase">Pay at venue</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-white/5">
                    <div>
                      <span className="text-[10px] text-mutedgrey uppercase block">Date</span>
                      <span className="font-semibold text-warmivory">
                        {formatDateIST(booking.start_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-mutedgrey uppercase block">Time Slot</span>
                      <span className="font-semibold text-warmivory">
                        {formatToIST(booking.start_at)} – {formatToIST(booking.end_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-mutedgrey uppercase block">Duration</span>
                      <span className="font-semibold text-warmivory">{booking.duration_minutes} Mins</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-mutedgrey uppercase block">Players</span>
                      <span className="font-semibold text-warmivory">{booking.number_of_players}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Token / Invoice button for confirmed or completed bookings */}
                      {(booking.status === 'confirmed' || booking.status === 'completed') && (
                        <button
                          onClick={() => setSelectedInvoiceBooking(booking)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-champagne/20 via-warmgold/20 to-champagne/20 border border-champagne/50 text-champagne text-xs font-bold hover:bg-champagne/30 shadow-[0_0_15px_rgba(214,167,84,0.2)] transition-all"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Download Pass / Invoice</span>
                        </button>
                      )}

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/25 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Venue Details</span>
                      </a>

                      {isUpcoming && (
                        <a
                          href={calLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian border border-white/10 text-warmivory text-xs font-semibold hover:text-champagne transition-all"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Google Cal</span>
                        </a>
                      )}
                    </div>

                    {/* Customer Cannot Self-Cancel: Only Request via WhatsApp or Call Admin */}
                    {isUpcoming && (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://wa.me/916394149768?text=${encodeURIComponent(
                            `Hello CueX Admin, I am requesting to cancel/reschedule my reservation:\n• Reference: ${booking.booking_reference}\n• Facility: ${resourceTitle}\n• Date: ${formatDateIST(booking.start_at)}\n• Slot: ${formatToIST(booking.start_at)} – ${formatToIST(booking.end_at)}\n• Customer: ${booking.customer_name}\n• Phone: ${booking.customer_phone}\n\nPlease cancel this slot and reopen it.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/25 transition-all shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-red-400" />
                          <span>Request Cancel (WhatsApp)</span>
                        </a>

                        <a
                          href={`tel:${VENUE_INFO.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal border border-white/10 text-warmivory text-xs font-semibold hover:border-champagne hover:text-champagne transition-all"
                        >
                          <Phone className="w-3.5 h-3.5 text-champagne" />
                          <span>Call Admin</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice & Entry Pass Modal */}
      {selectedInvoiceBooking && (
        <BookingInvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}
    </div>
  );
};
