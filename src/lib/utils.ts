import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VENUE_INFO = {
  name: 'CueX',
  subtitle: 'POOL | SNOOKER | CAFE',
  category: 'Gaming Zone, Pool, Snooker and Gaming Cafe',
  address: "Mehdhauri, near Mother's Pride School, Teliyarganj, Prayagraj (Allahabad), Uttar Pradesh, India",
  phone: '+916394149768',
  phoneDisplay: '+91 6394149768',
  whatsappUrl: 'https://wa.me/916394149768',
  mapsUrl: 'https://maps.app.goo.gl/Q4A223yN6kVchHxJ6',
  instagramUrl: 'https://www.instagram.com/_cue.x_?psln=emRnd3lpOGYwaGlo',
  timezone: 'Asia/Kolkata',
};

// Format currency in Indian Rupees
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Convert UTC or timestamptz to Indian Standard Time (IST) string
export function formatToIST(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
}

// Format date to "Wed, 12 Nov 2026" in IST
export function formatDateIST(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Get YYYY-MM-DD in IST
export function getISTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

// Generate pre-filled WhatsApp message for booking
export function generateBookingWhatsAppLink(booking: {
  booking_reference: string;
  resource_name: string;
  start_at: string;
  end_at: string;
  customer_name: string;
  total_amount: number;
}): string {
  const dateStr = formatDateIST(booking.start_at);
  const timeStr = `${formatToIST(booking.start_at)} - ${formatToIST(booking.end_at)}`;
  
  const text = `Hello CueX! 🎱🎮\n\nI have booked a slot:\n• Reference: *${booking.booking_reference}*\n• Facility: *${booking.resource_name}*\n• Date: *${dateStr}*\n• Time: *${timeStr}*\n• Name: *${booking.customer_name}*\n• Amount: *₹${booking.total_amount}*\n\nPlease confirm my reservation!`;
  
  return `https://wa.me/916394149768?text=${encodeURIComponent(text)}`;
}

// Helper to generate Add to Google Calendar URL
export function generateGoogleCalendarUrl(booking: {
  booking_reference: string;
  resource_name: string;
  start_at: string;
  end_at: string;
}): string {
  const startISO = new Date(booking.start_at).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endISO = new Date(booking.end_at).toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  const title = encodeURIComponent(`CueX Booking: ${booking.resource_name} (${booking.booking_reference})`);
  const details = encodeURIComponent(`Your reservation at CueX - Pool | Snooker | Cafe.\nRef: ${booking.booking_reference}\nAddress: ${VENUE_INFO.address}\nContact: ${VENUE_INFO.phoneDisplay}`);
  const location = encodeURIComponent(VENUE_INFO.address);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`;
}
