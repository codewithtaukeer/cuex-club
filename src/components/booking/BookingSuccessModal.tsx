import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, MessageSquare, Calendar as CalendarIcon, Phone, ArrowRight, RefreshCw, XCircle, Ticket, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CuexBooking, BookingStatus } from '../../types';
import { formatToIST, formatDateIST, formatINR, generateBookingWhatsAppLink, generateGoogleCalendarUrl, VENUE_INFO } from '../../lib/utils';
import { BookingInvoiceModal } from './BookingInvoiceModal';

interface BookingSuccessModalProps {
  booking: CuexBooking;
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({ booking: initialBooking, onClose }) => {
  const navigate = useNavigate();
  const [currentBooking, setCurrentBooking] = useState<CuexBooking>(initialBooking);
  const [status, setStatus] = useState<BookingStatus>(initialBooking.status);
  const [showInvoice, setShowInvoice] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!initialBooking.expires_at) return 15 * 60;
    const diff = Math.floor((new Date(initialBooking.expires_at).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const [refreshing, setRefreshing] = useState(false);

  // Countdown timer for pending confirmation hold
  useEffect(() => {
    if (status !== 'pending_confirmation' && status !== 'pending') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Escape key closes modal (Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Realtime subscription for instant owner confirmation
  useEffect(() => {
    const channel = supabase
      .channel(`booking-status-${currentBooking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cuex_bookings',
          filter: `id=eq.${currentBooking.id}`,
        },
        (payload) => {
          const updated = payload.new as CuexBooking;
          setCurrentBooking(updated);
          setStatus(updated.status);

          if (updated.expires_at) {
            const diff = Math.floor((new Date(updated.expires_at).getTime() - Date.now()) / 1000);
            setTimeLeft(Math.max(0, diff));
          }

          if (updated.status === 'confirmed') {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#D6A754', '#F4C979', '#08784D', '#ffffff'],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBooking.id]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase
        .from('cuex_bookings')
        .select('*')
        .eq('id', currentBooking.id)
        .single();

      if (data) {
        const b = data as CuexBooking;
        setCurrentBooking(b);
        setStatus(b.status);
        if (b.status === 'confirmed') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const resourceTitle =
    currentBooking.resource_id === 'ps5'
      ? 'PS5 Gaming Station'
      : currentBooking.resource_id === 'pool'
      ? 'Pool Table'
      : 'Snooker Table';

  const waLink = generateBookingWhatsAppLink({
    booking_reference: currentBooking.booking_reference,
    resource_name: resourceTitle,
    start_at: currentBooking.start_at,
    end_at: currentBooking.end_at,
    customer_name: currentBooking.customer_name,
    total_amount: currentBooking.total_amount,
  });

  const calendarUrl = generateGoogleCalendarUrl({
    booking_reference: currentBooking.booking_reference,
    resource_name: resourceTitle,
    start_at: currentBooking.start_at,
    end_at: currentBooking.end_at,
  });

  const isConfirmed = status === 'confirmed';
  const isPending = status === 'pending_confirmation' || status === 'pending';
  const isRejected = status === 'rejected';

  const isCancelled = status === 'cancelled';
  const isCompleted = status === 'completed';

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/95 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="max-w-lg w-full rounded-3xl bg-charcoal border border-champagne/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(214,167,84,0.3)] relative text-center my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-mutedgrey hover:text-warmivory transition-colors z-10"
          title="Close dialog (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State Icon Indicator */}
        {isConfirmed ? (
          <div className="w-16 h-16 rounded-full bg-cuexemerald/20 border border-cuexemerald flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-emerald-glow animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        ) : isPending ? (
          <div className="relative w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Clock className="w-8 h-8 animate-pulse" />
            <div className="absolute -inset-1 rounded-full border border-amber-500/30 animate-ping pointer-events-none" />
          </div>
        ) : isRejected ? (
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto mb-4 text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
        ) : isCancelled ? (
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
        ) : isCompleted ? (
          <div className="w-16 h-16 rounded-full bg-cuexemerald/20 border border-cuexemerald/40 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-charcoal border border-white/20 flex items-center justify-center mx-auto mb-4 text-mutedgrey">
            <Clock className="w-8 h-8" />
          </div>
        )}

        {/* Dynamic Titles */}
        {isConfirmed ? (
          <>
            <h3 id="booking-modal-title" className="font-display text-4xl sm:text-5xl text-warmivory uppercase tracking-tight mb-2">
              YOU'RE IN!
            </h3>
            <p className="text-champagne font-display text-lg tracking-widest uppercase mb-1">
              RESERVATION CONFIRMED
            </p>
            <p className="text-xs text-mutedgrey mb-6">
              Your CueX reservation is confirmed. Show your reference at the reception counter.
            </p>
          </>
        ) : isPending ? (
          <>
            <h3 id="booking-modal-title" className="font-display text-3xl sm:text-4xl text-warmivory uppercase tracking-tight mb-2">
              BOOKING REQUEST RECEIVED!
            </h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Awaiting Owner Confirmation</span>
            </div>
            <p className="text-xs text-mutedgrey mb-4 max-w-sm mx-auto leading-relaxed">
              Your selected slot is temporarily held for 15 minutes. CueX will call or WhatsApp you shortly to confirm your reservation.
            </p>

            {/* Countdown Hold Timer */}
            <div className="p-3.5 rounded-2xl bg-obsidian border border-amber-500/30 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-mutedgrey">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Temporary Hold Time:</span>
              </div>
              <span className="font-display text-2xl text-amber-400 tracking-wider">
                {timeFormatted}
              </span>
            </div>
          </>
        ) : isRejected ? (
          <>
            <h3 id="booking-modal-title" className="font-display text-3xl sm:text-4xl text-red-400 uppercase tracking-tight mb-2">
              REQUEST DECLINED
            </h3>
            <p className="text-xs text-mutedgrey mb-6">
              The requested slot could not be confirmed. Please select another slot or reach out to us.
            </p>
          </>
        ) : isCancelled ? (
          <>
            <h3 id="booking-modal-title" className="font-display text-3xl sm:text-4xl text-red-400 uppercase tracking-tight mb-2">
              RESERVATION CANCELLED
            </h3>
            <p className="text-xs text-mutedgrey mb-6">
              This reservation has been cancelled by CueX administration.
            </p>
          </>
        ) : isCompleted ? (
          <>
            <h3 id="booking-modal-title" className="font-display text-3xl sm:text-4xl text-champagne uppercase tracking-tight mb-2">
              GAME COMPLETED
            </h3>
            <p className="text-xs text-mutedgrey mb-6">
              Thank you for playing at CueX! We hope you enjoyed your session.
            </p>
          </>
        ) : (
          <>
            <h3 id="booking-modal-title" className="font-display text-3xl sm:text-4xl text-mutedgrey uppercase tracking-tight mb-2">
              HOLD PERIOD EXPIRED
            </h3>
            <p className="text-xs text-mutedgrey mb-6">
              The temporary hold has elapsed without confirmation. Please submit a new request.
            </p>
          </>
        )}

        {/* Booking Card Details */}
        <div className="rounded-2xl bg-obsidian/80 border border-white/10 p-5 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-[11px] text-mutedgrey uppercase tracking-wider">Booking Ref</span>
            <span className="font-display text-2xl text-champagne tracking-wider">
              {currentBooking.booking_reference}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-mutedgrey uppercase">Facility</p>
              <p className="font-semibold text-warmivory">{resourceTitle}</p>
            </div>
            <div>
              <p className="text-[10px] text-mutedgrey uppercase">Date</p>
              <p className="font-semibold text-warmivory">{formatDateIST(currentBooking.start_at)}</p>
            </div>
            <div>
              <p className="text-[10px] text-mutedgrey uppercase">Time</p>
              <p className="font-semibold text-warmivory">
                {formatToIST(currentBooking.start_at)} – {formatToIST(currentBooking.end_at)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-mutedgrey uppercase">Estimated Total</p>
              <p className="font-bold text-champagne">{formatINR(currentBooking.total_amount)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 text-[11px] text-mutedgrey">
            <p>Reserved for: <span className="text-warmivory font-medium">{currentBooking.customer_name}</span> ({currentBooking.customer_phone})</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Prominent Download Pass / Invoice Button if Confirmed */}
          {isConfirmed && (
            <button
              onClick={() => setShowInvoice(true)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-gold-glow hover:shadow-gold-glow-lg transition-transform active:scale-98"
            >
              <Ticket className="w-4 h-4" />
              <span>Download Official Pass & Token</span>
            </button>
          )}

          {isPending && (
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full py-2.5 rounded-xl bg-charcoal border border-champagne/30 text-champagne text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Check for Owner Confirmation</span>
            </button>
          )}

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Chat with CueX on WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-3">
            {isConfirmed && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 rounded-xl bg-charcoal border border-white/10 text-warmivory hover:text-champagne hover:border-champagne text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Add to Calendar
              </a>
            )}
            <a
              href={`tel:${VENUE_INFO.phone}`}
              className={`py-2.5 rounded-xl bg-charcoal border border-white/10 text-warmivory hover:text-champagne hover:border-champagne text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                !isConfirmed ? 'col-span-2' : ''
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-champagne" />
              Call CueX ({VENUE_INFO.phoneDisplay})
            </a>
          </div>

          <div className="pt-3 flex items-center justify-between gap-4">
            <button
              onClick={() => {
                onClose();
                navigate('/my-bookings');
              }}
              className="text-xs text-champagne hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>View in My Bookings</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => {
                onClose();
                navigate('/');
              }}
              className="text-xs text-mutedgrey hover:text-warmivory transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Booking Invoice & Pass Modal */}
      {showInvoice && (
        <BookingInvoiceModal
          booking={currentBooking}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};
