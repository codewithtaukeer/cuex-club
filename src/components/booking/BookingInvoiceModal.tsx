import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  QrCode, 
  Receipt,
  Ticket
} from 'lucide-react';
import type { CuexBooking } from '../../types';
import { 
  formatToIST, 
  formatDateIST, 
  formatINR, 
  VENUE_INFO 
} from '../../lib/utils';

interface BookingInvoiceModalProps {
  booking: CuexBooking;
  onClose: () => void;
}

export const BookingInvoiceModal: React.FC<BookingInvoiceModalProps> = ({ booking, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const resourceTitle =
    booking.resource_id === 'ps5'
      ? 'PS5 Gaming Station'
      : booking.resource_id === 'pool'
      ? 'Pool Table'
      : 'Snooker Table';

  const invoiceNumber = `INV-${booking.booking_reference}`;
  const issueDate = formatDateIST(booking.created_at || booking.start_at);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = 
`🎱 *CUEX OFFICIAL ENTRY PASS & BOOKING TOKEN* 🎱
━━━━━━━━━━━━━━━━━━━━
*Booking Reference:* ${booking.booking_reference}
*Pass Status:* ✅ CONFIRMED & VERIFIED
*Facility:* ${resourceTitle}
*Date:* ${formatDateIST(booking.start_at)}
*Slot:* ${formatToIST(booking.start_at)} – ${formatToIST(booking.end_at)}
*Duration:* ${booking.duration_minutes} Mins
*Guest Name:* ${booking.customer_name}
*Total Payable:* ${formatINR(booking.total_amount)} (Pay at Venue)
━━━━━━━━━━━━━━━━━━━━
📍 *Venue Address:*
Mehdhauri, near Mother's Pride School, Teliyarganj, Prayagraj, UP
📞 *Helpdesk / Admin:* +91 6394149768

_Please show this digital pass at the CueX reception counter upon arrival._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-obsidian/95 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cuex-printable-pass, #cuex-printable-pass * {
            visibility: visible !important;
          }
          #cuex-printable-pass {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 680px !important;
            margin: 0 auto !important;
            padding: 30px !important;
            background: #ffffff !important;
            color: #111111 !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-invert {
            color: #000000 !important;
            border-color: #cccccc !important;
          }
          .print-bg-light {
            background-color: #f8f9fa !important;
          }
        }
      `}</style>

      <div className="max-w-xl w-full my-6 relative">
        {/* Top Control Bar (Non-printable) */}
        <div className="no-print flex items-center justify-between pb-3 text-warmivory">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-champagne" />
            <span className="font-display tracking-wider text-sm uppercase text-warmivory">
              Official Booking Token & Receipt
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-warmivory transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass / Invoice Card */}
        <div
          id="cuex-printable-pass"
          ref={printRef}
          className="rounded-3xl bg-[#141615] border border-champagne/40 shadow-[0_0_50px_rgba(214,167,84,0.25)] overflow-hidden text-warmivory print-invert"
        >
          {/* Header Banner */}
          <div className="p-6 sm:p-7 bg-gradient-to-r from-obsidian via-[#1c1e1d] to-obsidian border-b border-champagne/30 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-champagne/50 p-0.5 bg-obsidian shrink-0">
                  <img
                    src="/assets/cuex-logo.png"
                    alt="CueX"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl tracking-wider text-champagne">CUEX</span>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full bg-champagne/15 text-champagne border border-champagne/30">
                      ENTRY PASS
                    </span>
                  </div>
                  <p className="text-[10px] text-mutedgrey tracking-widest uppercase">
                    POOL • SNOOKER • PS5 CAFE
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right sm:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cuexemerald/20 border border-cuexemerald/50 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CONFIRMED & VERIFIED</span>
                </div>
                <p className="text-[10px] text-mutedgrey mt-1">Invoice: {invoiceNumber}</p>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-7 space-y-6">
            {/* Big Token ID Display */}
            <div className="p-4 rounded-2xl bg-obsidian border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-bg-light">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-mutedgrey block">
                  BOOKING REFERENCE / TOKEN ID
                </span>
                <span className="font-display text-3xl sm:text-4xl text-champagne tracking-widest font-bold">
                  {booking.booking_reference}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block">Issued On</span>
                <span className="text-xs font-semibold text-warmivory">{issueDate}</span>
              </div>
            </div>

            {/* Reservation Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Facility Reserved
                </span>
                <span className="font-display text-lg text-warmivory block leading-tight">
                  {resourceTitle}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Scheduled Date
                </span>
                <span className="font-semibold text-xs text-warmivory flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-champagne shrink-0" />
                  {formatDateIST(booking.start_at)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Time Slot (IST)
                </span>
                <span className="font-semibold text-xs text-warmivory flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-champagne shrink-0" />
                  {formatToIST(booking.start_at)} – {formatToIST(booking.end_at)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Duration
                </span>
                <span className="font-semibold text-xs text-warmivory">
                  {booking.duration_minutes} Minutes
                </span>
              </div>

              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Customer Name
                </span>
                <span className="font-semibold text-xs text-warmivory">
                  {booking.customer_name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-mutedgrey uppercase tracking-wider block mb-1">
                  Phone Number
                </span>
                <span className="font-semibold text-xs text-warmivory">
                  {booking.customer_phone}
                </span>
              </div>
            </div>

            {/* Itemized Billing Breakdown */}
            <div className="rounded-2xl bg-obsidian/70 border border-white/10 p-4 space-y-2.5 print-bg-light">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-xs font-bold uppercase text-champagne">
                <Receipt className="w-4 h-4" />
                <span>BILLING & INVOICE BREAKDOWN</span>
              </div>

              <div className="flex items-center justify-between text-xs text-mutedgrey">
                <span>{resourceTitle} ({booking.duration_minutes} Mins Slot)</span>
                <span className="text-warmivory font-semibold">{formatINR(booking.total_amount)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-mutedgrey">
                <span>Platform Reservation Fee</span>
                <span className="text-emerald-400 font-semibold">FREE (Waived)</span>
              </div>

              <div className="flex items-center justify-between text-xs text-mutedgrey">
                <span>Applicable Taxes (GST)</span>
                <span className="text-warmivory font-semibold">Included</span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="font-bold text-warmivory uppercase">Total Payable at Venue</span>
                <span className="font-display text-2xl text-champagne font-bold">
                  {formatINR(booking.total_amount)}
                </span>
              </div>

              <div className="text-[11px] text-mutedgrey flex items-center justify-between pt-1">
                <span>Payment Mode:</span>
                <span className="text-warmivory font-medium">Cash / UPI (Google Pay, PhonePe, Paytm) / Cards</span>
              </div>
            </div>

            {/* Barcode & Verification Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-charcoal/80 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-obsidian border border-white/10 text-champagne">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-warmivory">Official CueX Check-in Pass</p>
                  <p className="text-[10px] text-mutedgrey">Present this token at the reception desk to begin your slot.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-champagne font-semibold shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified by Club Management</span>
              </div>
            </div>

            {/* Venue & Important Rules */}
            <div className="text-[11px] text-mutedgrey space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-champagne shrink-0 mt-0.5" />
                <span><strong>Venue:</strong> {VENUE_INFO.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-champagne shrink-0" />
                <span><strong>Helpdesk / Admin:</strong> {VENUE_INFO.phoneDisplay}</span>
              </div>
              <p className="pt-2 text-[10px] leading-relaxed italic text-mutedgrey/80">
                * Please arrive 5-10 minutes before your slot time. Free cue sticks and chalk provided. For cancellations or changes, please inform CueX admin in advance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls (Non-printable) */}
        <div className="no-print mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl bg-champagne text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-warmgold shadow-gold-glow transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="py-3 px-4 rounded-xl bg-[#25D366] text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all shadow-md"
          >
            <Share2 className="w-4 h-4" />
            <span>Send to WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-charcoal border border-white/10 text-warmivory font-semibold text-xs uppercase tracking-wider hover:bg-white/10 transition-all text-center"
          >
            Close Pass
          </button>
        </div>
      </div>
    </div>
  );
};
