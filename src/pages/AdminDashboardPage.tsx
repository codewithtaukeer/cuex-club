import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Calendar,
  Clock,
  DollarSign,
  Search,
  Phone,
  MessageSquare,
  Ban,
  Layers,
  Download,
  RefreshCw,
  Trash2,
  UserPlus,
  Unlock,
  CheckCircle2,
  X,
  ShieldCheck,
  Ticket,
  Volume2,
  VolumeX,
  BellRing,
  Smartphone,
  CircleDot,
  Gamepad2,
  Trophy,
  Sliders,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CuexBooking, CuexResource, CuexBlockedPeriod, CuexOpeningHour, CuexVenueSettings } from '../types';
import { formatToIST, formatDateIST, formatINR, getISTDateString } from '../lib/utils';
import { BookingInvoiceModal } from '../components/booking/BookingInvoiceModal';
import { 
  playWhatsAppSound, 
  primeAudioContext, 
  requestNotificationPermission, 
  showBrowserNotification 
} from '../lib/notificationSound';

function statusColour(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pending_confirmation':
    case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'cancelled': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    case 'expired': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'no_show':
    case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-white/10 text-white/60 border-white/10';
  }
}

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'bookings' | 'collection' | 'controls' | 'resources' | 'blocked' | 'settings'>('bookings');
  const [bookings, setBookings] = useState<CuexBooking[]>([]);
  const [resources, setResources] = useState<CuexResource[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<CuexBlockedPeriod[]>([]);
  const [openingHours, setOpeningHours] = useState<CuexOpeningHour[]>([]);
  const [venueSettings, setVenueSettings] = useState<CuexVenueSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Price Management state
  const [pricePoolMatch, setPricePoolMatch] = useState<number>(40);
  const [pricePoolHourly, setPricePoolHourly] = useState<number>(120);
  const [priceSnookerMatch, setPriceSnookerMatch] = useState<number>(120);
  const [priceSnookerHourly, setPriceSnookerHourly] = useState<number>(360);
  const [pricePs5Single1, setPricePs5Single1] = useState<number>(149);
  const [pricePs5Single2, setPricePs5Single2] = useState<number>(249);
  const [pricePs5Two1, setPricePs5Two1] = useState<number>(249);
  const [pricePs5Two2, setPricePs5Two2] = useState<number>(349);
  const [savingPrices, setSavingPrices] = useState(false);

  // Day-off / Blackout Date state
  const [holidayDate, setHolidayDate] = useState<string>(getISTDateString());
  const [holidayReason, setHolidayReason] = useState<string>('Club Holiday / Full-Day Closure');
  const [savingHoliday, setSavingHoliday] = useState(false);

  // Day-wise Collection Filter state
  const [collectionRange, setCollectionRange] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'>('all');
  const [collectionStartDate, setCollectionStartDate] = useState<string>('');
  const [collectionEndDate, setCollectionEndDate] = useState<string>('');
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Block Modal state
  const [blockResource, setBlockResource] = useState<string>('all');
  const [blockStart, setBlockStart] = useState<string>('');
  const [blockEnd, setBlockEnd] = useState<string>('');
  const [blockReason, setBlockReason] = useState<string>('Scheduled Maintenance');
  const [savingBlock, setSavingBlock] = useState(false);

  // Manual Walk-in Booking State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualResource, setManualResource] = useState<'ps5' | 'pool' | 'snooker'>('pool');
  const [manualName, setManualName] = useState('Walk-in Customer');
  const [manualPhone, setManualPhone] = useState('6394149768');
  const [manualDate, setManualDate] = useState(getISTDateString());
  const [manualTime, setManualTime] = useState('13:00');
  const [manualDuration, setManualDuration] = useState(60);
  const [manualPlayers, setManualPlayers] = useState(1);
  const [manualAmount, setManualAmount] = useState(120);
  const [manualNotes, setManualNotes] = useState('Manual booking created by Owner/Admin');
  const [savingManualBooking, setSavingManualBooking] = useState(false);

  // Status message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activePassBooking, setActivePassBooking] = useState<CuexBooking | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cuex_admin_sound') !== 'false';
    } catch {
      return true;
    }
  });
  const [incomingAlert, setIncomingAlert] = useState<CuexBooking | null>(null);

  const handleTestSound = () => {
    primeAudioContext();
    playWhatsAppSound();
    requestNotificationPermission();
    setFeedbackMsg({
      type: 'success',
      text: '🔊 WhatsApp alert tone tested! Sound notifications are fully primed and active on this device.',
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('cuex_admin_sound', String(next));
    } catch {}
    if (next) {
      primeAudioContext();
      playWhatsAppSound();
      requestNotificationPermission();
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth?redirect=/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bookings
      const { data: bData } = await supabase
        .from('cuex_bookings')
        .select('*')
        .order('start_at', { ascending: false });
      if (bData) setBookings(bData as CuexBooking[]);

      // 2. Fetch Resources
      const { data: rData } = await supabase
        .from('cuex_resources')
        .select('*')
        .order('name');
      if (rData) setResources(rData as CuexResource[]);

      // 3. Fetch Blocked Periods
      const { data: bpData } = await supabase
        .from('cuex_blocked_periods')
        .select('*')
        .order('start_at', { ascending: false });
      if (bpData) setBlockedPeriods(bpData as CuexBlockedPeriod[]);

      // 4. Fetch Opening Hours
      const { data: ohData } = await supabase
        .from('cuex_opening_hours')
        .select('*')
        .order('day_of_week');
      if (ohData) setOpeningHours(ohData as CuexOpeningHour[]);

      // 5. Fetch Settings
      const { data: vsData } = await supabase
        .from('cuex_venue_settings')
        .select('*')
        .single();
      if (vsData) setVenueSettings(vsData as CuexVenueSettings);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  // Realtime subscription for admin bookings with instant WhatsApp chime notification
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('cuex-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuex_bookings' }, (payload) => {
        // Trigger alert on new booking request or status change to pending_confirmation
        if (payload.eventType === 'INSERT') {
          const newBooking = payload.new as CuexBooking;
          if (soundEnabled) {
            playWhatsAppSound();
          }
          setIncomingAlert(newBooking);
          showBrowserNotification('🎱 New CueX Booking Request!', {
            body: `${newBooking.customer_name} requested a slot (${newBooking.booking_reference})! Tap to review.`,
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as CuexBooking;
          const old = payload.old as Partial<CuexBooking>;
          if (updated.status === 'pending_confirmation' && old?.status !== 'pending_confirmation') {
            if (soundEnabled) {
              playWhatsAppSound();
            }
            setIncomingAlert(updated);
          }
        }
        loadAllAdminData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, soundEnabled]);

  // Sync pricing state with loaded resources
  useEffect(() => {
    if (resources.length > 0) {
      const p = resources.find(r => r.id === 'pool');
      if (p) {
        setPricePoolHourly(Number(p.hourly_rate) || 120);
        setPricePoolMatch(Number(p.pricing_details?.match ?? p.pricing_details?.per_game ?? 40));
      }
      const s = resources.find(r => r.id === 'snooker');
      if (s) {
        setPriceSnookerHourly(Number(s.hourly_rate) || 360);
        setPriceSnookerMatch(Number(s.pricing_details?.match ?? s.pricing_details?.frame ?? 120));
      }
      const ps = resources.find(r => r.id === 'ps5');
      if (ps) {
        setPricePs5Single1(Number(ps.pricing_details?.single_player?.['60'] ?? 149));
        setPricePs5Single2(Number(ps.pricing_details?.single_player?.['120'] ?? 249));
        setPricePs5Two1(Number(ps.pricing_details?.two_player?.['60'] ?? 249));
        setPricePs5Two2(Number(ps.pricing_details?.two_player?.['120'] ?? 349));
      }
    }
  }, [resources]);

  // Save Pricing Changes across the entire club
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
      // 1. Update Pool
      const { error: errP } = await supabase.from('cuex_resources').update({
        hourly_rate: pricePoolHourly,
        pricing_details: { match: pricePoolMatch, per_game: pricePoolMatch, hourly: pricePoolHourly }
      }).eq('id', 'pool');
      if (errP) throw errP;

      // 2. Update Snooker
      const { error: errS } = await supabase.from('cuex_resources').update({
        hourly_rate: priceSnookerHourly,
        pricing_details: { match: priceSnookerMatch, frame: priceSnookerMatch, hourly: priceSnookerHourly }
      }).eq('id', 'snooker');
      if (errS) throw errS;

      // 3. Update PS5
      const { error: errPs } = await supabase.from('cuex_resources').update({
        hourly_rate: pricePs5Single1,
        pricing_details: {
          single_player: { '60': pricePs5Single1, '120': pricePs5Single2 },
          two_player: { '60': pricePs5Two1, '120': pricePs5Two2 }
        }
      }).eq('id', 'ps5');
      if (errPs) throw errPs;

      setFeedbackMsg({ type: 'success', text: 'Pricing rates updated successfully across the website & app!' });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update pricing.' });
    } finally {
      setSavingPrices(false);
    }
  };

  // Mark full day closed / holiday
  const handleMarkDateClosed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;
    setSavingHoliday(true);
    try {
      const startAt = `${holidayDate}T00:00:00+05:30`;
      const endAt = `${holidayDate}T23:59:59+05:30`;
      const { error } = await supabase.from('cuex_blocked_periods').insert({
        resource_id: null, // Full venue closure
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        reason: holidayReason.trim() || 'Club Full-Day Closure',
        created_by: user?.id,
      });
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: `Venue marked closed for ${formatDateIST(startAt)}.` });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to mark date closed.' });
    } finally {
      setSavingHoliday(false);
    }
  };

  // Toggle weekly day-of-week open/closed
  const handleToggleDayOfWeekClosed = async (dayOfWeek: number, currentClosed: boolean) => {
    try {
      const { error } = await supabase.from('cuex_opening_hours').update({
        is_closed: !currentClosed
      }).eq('day_of_week', dayOfWeek);
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: `Weekly operating schedule updated.` });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  // Compute Day-wise Collections
  const dayWiseCollections = React.useMemo(() => {
    const map = new Map<string, {
      dateStr: string;
      formattedDate: string;
      isToday: boolean;
      totalRevenue: number;
      totalBookings: number;
      poolRevenue: number;
      poolCount: number;
      snookerRevenue: number;
      snookerCount: number;
      ps5Revenue: number;
      ps5Count: number;
      confirmedCount: number;
      completedCount: number;
      cancelledCount: number;
      bookings: CuexBooking[];
    }>();

    const todayIST = getISTDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayIST = getISTDateString(yesterdayDate);

    let rangeFilterFn = (_d: string) => true;
    if (collectionRange === 'today') {
      rangeFilterFn = (d) => d === todayIST;
    } else if (collectionRange === 'yesterday') {
      rangeFilterFn = (d) => d === yesterdayIST;
    } else if (collectionRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minDate = getISTDateString(sevenDaysAgo);
      rangeFilterFn = (d) => d >= minDate && d <= todayIST;
    } else if (collectionRange === 'month') {
      const currentMonthPrefix = todayIST.slice(0, 7);
      rangeFilterFn = (d) => d.startsWith(currentMonthPrefix);
    } else if (collectionRange === 'custom') {
      rangeFilterFn = (d) => {
        if (collectionStartDate && d < collectionStartDate) return false;
        if (collectionEndDate && d > collectionEndDate) return false;
        return true;
      };
    }

    bookings.forEach((b) => {
      const d = getISTDateString(new Date(b.start_at));
      if (!rangeFilterFn(d)) return;

      if (!map.has(d)) {
        map.set(d, {
          dateStr: d,
          formattedDate: formatDateIST(b.start_at),
          isToday: d === todayIST,
          totalRevenue: 0,
          totalBookings: 0,
          poolRevenue: 0,
          poolCount: 0,
          snookerRevenue: 0,
          snookerCount: 0,
          ps5Revenue: 0,
          ps5Count: 0,
          confirmedCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          bookings: [],
        });
      }

      const item = map.get(d)!;
      item.totalBookings += 1;
      item.bookings.push(b);

      const amt = Number(b.total_amount) || 0;
      const isCountable = b.status === 'confirmed' || b.status === 'completed';

      if (isCountable) {
        item.totalRevenue += amt;
        if (b.resource_id === 'pool') {
          item.poolRevenue += amt;
          item.poolCount += 1;
        } else if (b.resource_id === 'snooker') {
          item.snookerRevenue += amt;
          item.snookerCount += 1;
        } else if (b.resource_id === 'ps5') {
          item.ps5Revenue += amt;
          item.ps5Count += 1;
        }
      }

      if (b.status === 'confirmed') item.confirmedCount += 1;
      else if (b.status === 'completed') item.completedCount += 1;
      else if (b.status === 'cancelled' || b.status === 'no_show') item.cancelledCount += 1;
    });

    const list = Array.from(map.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    const totalGross = list.reduce((s, d) => s + d.totalRevenue, 0);
    const totalCount = list.reduce((s, d) => s + d.totalBookings, 0);
    const avgDaily = list.length > 0 ? Math.round(totalGross / list.length) : 0;
    
    const totalPool = list.reduce((s, d) => s + d.poolRevenue, 0);
    const totalSnooker = list.reduce((s, d) => s + d.snookerRevenue, 0);
    const totalPs5 = list.reduce((s, d) => s + d.ps5Revenue, 0);
    let topGame = 'Snooker Table';
    if (totalPool >= totalSnooker && totalPool >= totalPs5) topGame = 'Pool Table';
    else if (totalPs5 >= totalSnooker && totalPs5 >= totalPool) topGame = 'PS5 Gaming';

    return { list, totalGross, totalCount, avgDaily, topGame, totalPool, totalSnooker, totalPs5 };
  }, [bookings, collectionRange, collectionStartDate, collectionEndDate]);

  // Export Day-wise CSV
  const handleExportDayWiseCSV = () => {
    if (dayWiseCollections.list.length === 0) return;
    const headers = ['Date', 'Total Gross (INR)', 'Total Bookings', 'Pool Revenue (INR)', 'Pool Bookings', 'Snooker Revenue (INR)', 'Snooker Bookings', 'PS5 Revenue (INR)', 'PS5 Bookings', 'Confirmed', 'Completed', 'Cancelled'].map(h => `"${h}"`).join(',');
    const rows = dayWiseCollections.list.map(d => [
      `"${d.dateStr}"`,
      d.totalRevenue,
      d.totalBookings,
      d.poolRevenue,
      d.poolCount,
      d.snookerRevenue,
      d.snookerCount,
      d.ps5Revenue,
      d.ps5Count,
      d.confirmedCount,
      d.completedCount,
      d.cancelledCount,
    ].join(','));
    const blob = new Blob(['\uFEFF' + [headers, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.setAttribute('download', `cuex_daywise_collection_${getISTDateString()}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Admin Confirm Booking Request
  const handleConfirmBookingRequest = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_confirm_booking', {
        p_booking_id: b.id,
      });
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Reservation ${b.booking_reference} confirmed for ${b.customer_name}! Slot is now locked.`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Confirmation failed.' });
    }
  };

  // Admin Reject Booking Request
  const handleRejectBookingRequest = async (b: CuexBooking) => {
    const reason = window.prompt(`Reason for rejecting ${b.booking_reference}? (Optional)`, 'Slot unavailable / requested cancel');
    if (reason === null) return;

    try {
      const { error } = await supabase.rpc('cuex_admin_reject_booking', {
        p_booking_id: b.id,
        p_reason: reason || 'Declined by venue',
      });
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Booking ${b.booking_reference} rejected. Slot is immediately freed for other players.`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Rejection failed.' });
    }
  };

  // Admin Extend Hold Time
  const handleExtendHoldRequest = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_extend_hold', {
        p_booking_id: b.id,
        p_extra_minutes: 15,
      });
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Hold extended by 15 minutes for booking ${b.booking_reference}.`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to extend hold.' });
    }
  };

  // Make Table Free manually (Cancels reservation and immediately opens slot)
  const handleMakeTableFree = async (b: CuexBooking) => {
    if (!window.confirm(`Make table free for reference ${b.booking_reference}? This will cancel the reservation and immediately release the table in realtime availability.`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('cuex_bookings')
        .update({ status: 'cancelled' })
        .eq('id', b.id);
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Table released! ${b.booking_reference} is cancelled and the slot is now free for bookings.`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to release table.' });
    }
  };

  // Permanently delete booking
  const handleDeleteBooking = async (b: CuexBooking) => {
    if (!window.confirm(`Permanently delete booking ${b.booking_reference} from the database?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('cuex_bookings')
        .delete()
        .eq('id', b.id);
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Booking ${b.booking_reference} permanently deleted.`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete booking.' });
    }
  };

  // Status update action
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('cuex_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: `Booking updated to ${newStatus}.` });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Status update failed.' });
    }
  };

  // Handle Re-open Slot with atomic database verification
  const handleReopenSlot = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_reopen_slot', {
        p_booking_id: b.id,
      });
      if (error) throw error;
      setFeedbackMsg({
        type: 'success',
        text: `Slot for ${b.booking_reference} successfully verified and re-opened!`,
      });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Cannot re-open: this slot may conflict with another booking or maintenance block.',
      });
    }
  };

  // Handle Manual Walk-in Booking Submission via transaction-safe RPC
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim() || !manualDate || !manualTime) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in all required manual reservation fields.' });
      return;
    }

    setSavingManualBooking(true);
    try {
      const startDateTime = new Date(`${manualDate}T${manualTime}:00+05:30`);

      const { data, error } = await supabase.rpc('cuex_admin_manual_book', {
        p_resource_id: manualResource,
        p_start_at: startDateTime.toISOString(),
        p_duration_minutes: manualDuration,
        p_customer_name: manualName.trim(),
        p_customer_phone: manualPhone.trim(),
        p_total_amount: manualAmount,
        p_notes: manualNotes.trim() || null,
        p_number_of_players: manualPlayers,
      });

      if (error) throw error;
      const created = data as CuexBooking;

      setFeedbackMsg({
        type: 'success',
        text: `Manual reservation created with collision check! Ref: ${created?.booking_reference || 'Confirmed'} (${manualResource.toUpperCase()})`,
      });
      setShowManualModal(false);
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to create manual reservation.' });
    } finally {
      setSavingManualBooking(false);
    }
  };

  // Auto calculate manual amount
  useEffect(() => {
    if (manualResource === 'ps5') {
      if (manualPlayers >= 2) {
        setManualAmount(manualDuration >= 120 ? 349 : 249);
      } else {
        setManualAmount(manualDuration >= 120 ? 249 : 149);
      }
    } else if (manualResource === 'snooker') {
      setManualAmount(manualDuration <= 30 ? 120 : manualDuration >= 120 ? 720 : 360);
    } else {
      // Pool
      setManualAmount(manualDuration <= 30 ? 40 : manualDuration >= 120 ? 240 : 120);
    }
  }, [manualResource, manualDuration, manualPlayers]);

  // Toggle resource active state
  const handleToggleResourceActive = async (resourceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('cuex_resources')
        .update({ is_active: !currentStatus })
        .eq('id', resourceId);
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: `Facility status updated.` });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  // Save new Blocked Period
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd || !blockReason.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please fill in start time, end time, and reason.' });
      return;
    }
    setSavingBlock(true);
    try {
      const { error } = await supabase.from('cuex_blocked_periods').insert({
        resource_id: blockResource === 'all' ? null : blockResource,
        start_at: new Date(blockStart).toISOString(),
        end_at: new Date(blockEnd).toISOString(),
        reason: blockReason.trim(),
        created_by: user?.id,
      });
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: 'Maintenance block added successfully.' });
      setBlockStart('');
      setBlockEnd('');
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const { error } = await supabase.from('cuex_blocked_periods').delete().eq('id', id);
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: 'Block removed.' });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  // Save Settings
  const handleUpdateSettings = async (updates: Partial<CuexVenueSettings>) => {
    try {
      const { error } = await supabase
        .from('cuex_venue_settings')
        .update(updates)
        .eq('id', 'cuex_main');
      if (error) throw error;
      setFeedbackMsg({ type: 'success', text: 'Settings updated successfully!' });
      loadAllAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update settings.' });
    }
  };

  // Export to CSV with formula injection defense and Blob download
  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    
    // Sanitize any cell to prevent spreadsheet formula injection (=, +, -, @)
    const sanitize = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const headers = ['Reference', 'Resource', 'Customer Name', 'Phone', 'Date', 'Start', 'End', 'Duration (Mins)', 'Total Amount (INR)', 'Status'].map(h => `"${h}"`).join(',');
    
    const rows = bookings.map((b) => [
      sanitize(b.booking_reference),
      sanitize(b.resource_id.toUpperCase()),
      sanitize(b.customer_name),
      `"\t${b.customer_phone}"`, // Tab prefix prevents scientific notation in Excel
      sanitize(formatDateIST(b.start_at)),
      sanitize(formatToIST(b.start_at)),
      sanitize(formatToIST(b.end_at)),
      sanitize(b.duration_minutes),
      sanitize(b.total_amount),
      sanitize(b.status.toUpperCase()),
    ].join(','));

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n'); // UTF-8 BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cuex_reservations_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Bookings logic
  const todayStr = getISTDateString();
  const pendingRequests = bookings.filter((b) => b.status === 'pending_confirmation' || b.status === 'pending');

  const filteredBookings = bookings.filter((b) => {
    const bookingDateStr = getISTDateString(new Date(b.start_at));

    if (dateFilter === 'today' && bookingDateStr !== todayStr) return false;
    if (resourceFilter !== 'all' && b.resource_id !== resourceFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.booking_reference.toLowerCase().includes(q);
      const matchName = b.customer_name.toLowerCase().includes(q);
      const matchPhone = b.customer_phone.toLowerCase().includes(q);
      if (!matchRef && !matchName && !matchPhone) return false;
    }

    return true;
  });

  // Calculate stats
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  const pendingCount = pendingRequests.length;
  const todayCount = bookings.filter((b) => getISTDateString(new Date(b.start_at)) === todayStr).length;

  if (authLoading || (!isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center pt-24 text-champagne">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20 text-warmivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-2">
              <Shield className="w-3.5 h-3.5" />
              OWNER CONSOLE
            </div>
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight">
              CUEX MANAGEMENT DASHBOARD
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin-app"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cuexemerald/30 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all shadow-md"
              title="Open Phone App View with native bottom navigation and push alerts"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Phone App View
            </Link>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-gold-glow hover:scale-102 transition-transform"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Manual Walk-in Booking
            </button>
            <button
              onClick={loadAllAdminData}
              className="p-2.5 rounded-xl bg-charcoal border border-white/10 hover:border-champagne text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-charcoal border border-champagne/30 hover:border-champagne text-champagne text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Realtime Sound Alert & Notification Control Bar */}
        <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-charcoal/90 border border-champagne/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${soundEnabled ? 'bg-cuexemerald/15 border-cuexemerald/40 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {soundEnabled ? <Volume2 className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-warmivory">
                  Live Booking Sound Alerts:
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {soundEnabled ? 'ACTIVE (WhatsApp Chime)' : 'MUTED'}
                </span>
              </div>
              <p className="text-[11px] text-mutedgrey mt-0.5">
                Plays a loud WhatsApp-style chime on your phone or laptop whenever a customer submits a booking request.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTestSound}
              className="px-3.5 py-2 rounded-xl bg-champagne text-obsidian text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-warmgold shadow-gold-glow transition-all"
              title="Test WhatsApp notification chime now"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Sound</span>
            </button>

            <button
              onClick={toggleSound}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-obsidian border-white/10 text-mutedgrey hover:text-warmivory' 
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {soundEnabled ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Mute' : 'Enable Sound'}</span>
            </button>
          </div>
        </div>

        {/* Incoming Booking Alert Pop-up Banner */}
        {incomingAlert && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-charcoal to-obsidian border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 mt-0.5 animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-amber-300 uppercase tracking-wide">
                    NEW BOOKING REQUEST RECEIVED!
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {incomingAlert.booking_reference}
                  </span>
                </div>
                <p className="text-xs text-warmivory mt-0.5">
                  <strong>{incomingAlert.customer_name}</strong> ({incomingAlert.customer_phone}) requested{' '}
                  <span className="text-champagne font-bold uppercase">{incomingAlert.resource_id}</span> •{' '}
                  {formatDateIST(incomingAlert.start_at)} at {formatToIST(incomingAlert.start_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleConfirmBookingRequest(incomingAlert);
                  setIncomingAlert(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#107c41] hover:bg-[#138e4a] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-98"
              >
                Confirm Now
              </button>
              <button
                onClick={() => {
                  setActiveTab('bookings');
                  setStatusFilter('pending_confirmation');
                  setIncomingAlert(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-charcoal border border-champagne/40 text-champagne text-xs font-bold uppercase tracking-wider hover:bg-champagne/15 transition-all"
              >
                View Request
              </button>
              <button
                onClick={() => setIncomingAlert(null)}
                className="p-2 rounded-xl bg-charcoal border border-white/10 text-mutedgrey hover:text-warmivory transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-cuexemerald/15 border-cuexemerald/40 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5">
            <div className="flex items-center justify-between text-mutedgrey mb-2">
              <span className="text-[11px] uppercase tracking-wider">Today's Bookings</span>
              <Calendar className="w-4 h-4 text-champagne" />
            </div>
            <span className="font-display text-3xl sm:text-4xl text-warmivory">{todayCount}</span>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5">
            <div className="flex items-center justify-between text-mutedgrey mb-2">
              <span className="text-[11px] uppercase tracking-wider">Awaiting Confirm</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-display text-3xl sm:text-4xl text-amber-400">{pendingCount}</span>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5">
            <div className="flex items-center justify-between text-mutedgrey mb-2">
              <span className="text-[11px] uppercase tracking-wider">Total Bookings</span>
              <Layers className="w-4 h-4 text-cuexemerald" />
            </div>
            <span className="font-display text-3xl sm:text-4xl text-warmivory">{bookings.length}</span>
          </div>

          <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5">
            <div className="flex items-center justify-between text-mutedgrey mb-2">
              <span className="text-[11px] uppercase tracking-wider">Gross Booked Value</span>
              <DollarSign className="w-4 h-4 text-champagne" />
            </div>
            <span className="font-display text-3xl sm:text-4xl text-champagne">
              {formatINR(totalRevenue)}
            </span>
          </div>
        </div>

        {/* DEDICATED "BOOKING REQUESTS" SECTION (Matches user reference UI) */}
        {pendingRequests.length > 0 && (
          <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-charcoal/95 border-2 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl sm:text-3xl text-warmivory uppercase tracking-wide">
                  Booking requests
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-wider border border-amber-500/30">
                  {pendingRequests.length} pending
                </span>
              </div>
              <p className="hidden sm:block text-xs text-mutedgrey">
                Hold duration: 15 minutes. Call or WhatsApp player to confirm attendance.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingRequests.map((b) => {
                const facilityTitle =
                  b.resource_id === 'ps5'
                    ? 'PS5 Gaming Station'
                    : b.resource_id === 'pool'
                    ? 'Pool Table'
                    : 'Snooker Table';

                const holdSecondsLeft = b.expires_at
                  ? Math.max(0, Math.floor((new Date(b.expires_at).getTime() - Date.now()) / 1000))
                  : 15 * 60;
                const holdMin = Math.floor(holdSecondsLeft / 60);
                const holdSec = holdSecondsLeft % 60;

                // Player history check
                const customerPastBookings = bookings.filter(
                  (other) => other.customer_phone === b.customer_phone && other.id !== b.id
                );
                const completedPast = customerPastBookings.filter((o) => o.status === 'completed' || o.status === 'confirmed').length;
                const noshowPast = customerPastBookings.filter((o) => o.status === 'no_show').length;

                return (
                  <div
                    key={b.id}
                    className="p-5 sm:p-6 rounded-2xl bg-obsidian border border-white/10 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl text-warmivory uppercase">
                        {facilityTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold text-xs">
                          Pending
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono font-semibold">
                          ⏱️ {holdMin}m {holdSec < 10 ? '0' : ''}{holdSec}s hold
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-mutedgrey">
                      <p>
                        <span className="text-white/60 font-semibold">Customer:</span>{' '}
                        <span className="text-warmivory font-bold text-sm">{b.customer_name}</span>
                      </p>
                      <p>
                        <span className="text-white/60 font-semibold">Phone:</span>{' '}
                        <span className="text-champagne font-mono font-medium">{b.customer_phone}</span>
                      </p>
                      <p>
                        <span className="text-white/60 font-semibold">Date:</span>{' '}
                        <span className="text-warmivory font-medium">{formatDateIST(b.start_at)}</span>
                      </p>
                      <p>
                        <span className="text-white/60 font-semibold">Time:</span>{' '}
                        <span className="text-warmivory font-bold">
                          {formatToIST(b.start_at)} – {formatToIST(b.end_at)}
                        </span>{' '}
                        ({b.duration_minutes} Mins • {formatINR(b.total_amount)})
                      </p>
                      {b.customer_notes && (
                        <p className="pt-1 text-[11px] italic text-mutedgrey">
                          Note: "{b.customer_notes}"
                        </p>
                      )}
                    </div>

                    {/* Customer Reliability Profile */}
                    <div className="p-2.5 rounded-xl bg-charcoal/60 border border-white/5 text-[11px] flex items-center justify-between">
                      <span className="text-mutedgrey">Player Reliability:</span>
                      <span className="font-semibold text-warmivory">
                        {completedPast > 0 ? (
                          <span className="text-emerald-400">✓ {completedPast} completed game(s)</span>
                        ) : (
                          <span className="text-mutedgrey">First time player</span>
                        )}
                        {noshowPast > 0 && (
                          <span className="text-red-400 ml-2">⚠️ {noshowPast} no-show(s)</span>
                        )}
                      </span>
                    </div>

                    {/* Main Confirm & Reject Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleConfirmBookingRequest(b)}
                        className="py-3 rounded-xl bg-[#107c41] hover:bg-[#138e4a] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleRejectBookingRequest(b)}
                        className="py-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 font-bold text-xs uppercase tracking-wider transition-all active:scale-98"
                      >
                        Reject
                      </button>
                    </div>

                    {/* Sub-actions: Call, WhatsApp, Extend Hold */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:${b.customer_phone}`}
                          className="text-warmivory hover:text-champagne inline-flex items-center gap-1 font-semibold"
                        >
                          <Phone className="w-3.5 h-3.5 text-champagne" />
                          Call customer
                        </a>
                        <a
                          href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${b.customer_name}, this is CueX Lounge regarding your ${facilityTitle} reservation request for ${formatDateIST(b.start_at)} at ${formatToIST(b.start_at)}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#25D366] hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp customer
                        </a>
                      </div>

                      <button
                        onClick={() => handleExtendHoldRequest(b)}
                        className="text-[11px] text-mutedgrey hover:text-warmgold font-medium"
                        title="Add 15 minutes to temporary hold"
                      >
                        + Extend 15m
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'bookings', label: 'All Bookings', count: bookings.length },
            { id: 'collection', label: 'Day-wise Collection 💰' },
            { id: 'controls', label: 'Venue Controls ⚙️' },
            { id: 'resources', label: 'Facilities & Rates', count: resources.length },
            { id: 'blocked', label: 'Maintenance Blocks', count: blockedPeriods.length },
            { id: 'settings', label: 'Venue & Anti-Abuse Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-champagne text-obsidian shadow-gold-glow'
                  : 'bg-charcoal text-mutedgrey hover:text-warmivory border border-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: ALL BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by reference, name, or phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-xs text-warmivory outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-charcoal border border-white/10 text-xs text-warmivory outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today Only</option>
                </select>

                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-charcoal border border-white/10 text-xs text-warmivory outline-none"
                >
                  <option value="all">All Facilities</option>
                  <option value="ps5">PS5 Station</option>
                  <option value="pool">Pool Table</option>
                  <option value="snooker">Snooker Table</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-charcoal border border-white/10 text-xs text-warmivory outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_confirmation">Pending Confirmation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
            </div>

            {/* Bookings Cards */}
            {filteredBookings.length === 0 ? (
              <div className="py-12 rounded-2xl bg-charcoal/40 border border-white/5 text-center text-mutedgrey text-xs">
                No reservations found matching current filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 hover:border-champagne/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-xl text-warmivory">
                          {b.booking_reference}
                        </span>
                        <span className="text-xs font-bold text-champagne uppercase">
                          {b.resource_id === 'ps5' ? 'PS5 Gaming' : b.resource_id === 'pool' ? 'Pool' : 'Snooker'}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                            b.status === 'confirmed'
                              ? 'bg-cuexemerald/20 text-emerald-400'
                              : b.status === 'pending_confirmation' || b.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400'
                              : b.status === 'completed'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-mutedgrey">
                        <span>{b.customer_name}</span>
                        <span>•</span>
                        <a
                          href={`tel:${b.customer_phone}`}
                          className="hover:text-champagne inline-flex items-center gap-1 font-mono"
                        >
                          <Phone className="w-3 h-3 text-champagne" />
                          {b.customer_phone}
                        </a>
                        <span>•</span>
                        <span>{formatDateIST(b.start_at)}</span>
                        <span>•</span>
                        <span>
                          {formatToIST(b.start_at)} - {formatToIST(b.end_at)} ({b.duration_minutes}m)
                        </span>
                        <span>•</span>
                        <span className="font-bold text-warmivory">{formatINR(b.total_amount)}</span>
                      </div>

                      {b.customer_notes && (
                        <p className="text-[11px] text-mutedgrey italic pt-1">
                          Notes: "{b.customer_notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                      <a
                        href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-[#25D366]/15 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/25"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>

                      {(b.status === 'pending_confirmation' || b.status === 'pending') && (
                        <>
                          <button
                            onClick={() => handleConfirmBookingRequest(b)}
                            className="px-3 py-1.5 rounded-lg bg-cuexemerald/20 border border-cuexemerald/40 text-emerald-400 text-xs font-bold hover:bg-cuexemerald/30"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleRejectBookingRequest(b)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/30"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {b.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => setActivePassBooking(b)}
                            className="px-3 py-1.5 rounded-lg bg-champagne/15 border border-champagne/40 text-champagne text-xs font-bold hover:bg-champagne/25 flex items-center gap-1 shadow-sm"
                            title="View and print official entry pass / token invoice for this customer"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            Pass / Invoice
                          </button>
                          <button
                            onClick={() => handleMakeTableFree(b)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 flex items-center gap-1 shadow-sm"
                            title="Cancel reservation and reopen slot immediately for other players"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Cancel & Open Slot
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'completed')}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Done
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(b.id, 'no_show')}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20"
                            title="Mark as No-Show"
                          >
                            No Show
                          </button>
                        </>
                      )}

                      {(b.status === 'cancelled' || b.status === 'expired' || b.status === 'rejected') && (
                        <button
                          onClick={() => handleReopenSlot(b)}
                          className="px-3 py-1.5 rounded-lg bg-cuexemerald/15 border border-cuexemerald/30 text-emerald-400 text-xs font-semibold hover:bg-cuexemerald/25"
                          title="Verify slot collision before re-opening"
                        >
                          Re-open Slot
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBooking(b)}
                        className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
                        title="Delete record permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: DAY-WISE COLLECTION & FINANCIAL REPORTING */}
        {activeTab === 'collection' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-warmivory uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-champagne" />
                  Day-Wise Financial Collection
                </h2>
                <p className="text-xs text-mutedgrey mt-1">
                  Track daily cashflow, revenue breakdown by facility, and booking performance.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportDayWiseCSV}
                  disabled={dayWiseCollections.list.length === 0}
                  className="px-4 py-2.5 rounded-xl bg-charcoal border border-champagne/40 hover:border-champagne text-champagne text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export Daily CSV
                </button>
              </div>
            </div>

            {/* Range Filters */}
            <div className="p-4 rounded-2xl bg-charcoal/80 border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Days' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCollectionRange(f.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      collectionRange === f.id
                        ? 'bg-champagne text-obsidian shadow-gold-glow'
                        : 'bg-obsidian border border-white/10 text-mutedgrey hover:text-warmivory'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {collectionRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-mutedgrey">From:</span>
                    <input
                      type="date"
                      value={collectionStartDate}
                      onChange={(e) => setCollectionStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-mutedgrey">To:</span>
                    <input
                      type="date"
                      value={collectionEndDate}
                      onChange={(e) => setCollectionEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4 Financial Highlight Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-mutedgrey">Total Period Revenue</span>
                <p className="font-display text-3xl sm:text-4xl text-champagne">
                  {formatINR(dayWiseCollections.totalGross)}
                </p>
                <p className="text-[10px] text-mutedgrey">From confirmed & completed sessions</p>
              </div>

              <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-mutedgrey">Daily Average</span>
                <p className="font-display text-3xl sm:text-4xl text-warmivory">
                  {formatINR(dayWiseCollections.avgDaily)}
                </p>
                <p className="text-[10px] text-mutedgrey">Across {dayWiseCollections.list.length} recorded day(s)</p>
              </div>

              <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-mutedgrey">Total Bookings</span>
                <p className="font-display text-3xl sm:text-4xl text-warmivory">
                  {dayWiseCollections.totalCount}
                </p>
                <p className="text-[10px] text-mutedgrey">All statuses in selected range</p>
              </div>

              <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-mutedgrey">Top Grossing Facility</span>
                <p className="font-display text-2xl sm:text-3xl text-cuexemerald truncate">
                  {dayWiseCollections.topGame}
                </p>
                <p className="text-[10px] text-mutedgrey">
                  Snooker: {formatINR(dayWiseCollections.totalSnooker)} • Pool: {formatINR(dayWiseCollections.totalPool)}
                </p>
              </div>
            </div>

            {/* Game Revenue Distribution Breakdown Bar */}
            <div className="p-5 rounded-2xl bg-charcoal/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-warmivory">Facility Revenue Distribution</span>
                <span className="text-mutedgrey">100% of period revenue</span>
              </div>

              <div className="w-full h-3 rounded-full bg-obsidian overflow-hidden flex">
                <div
                  style={{ width: `${dayWiseCollections.totalGross > 0 ? (dayWiseCollections.totalSnooker / dayWiseCollections.totalGross) * 100 : 33}%` }}
                  className="h-full bg-gradient-to-r from-champagne to-warmgold transition-all"
                  title="Snooker Table"
                />
                <div
                  style={{ width: `${dayWiseCollections.totalGross > 0 ? (dayWiseCollections.totalPool / dayWiseCollections.totalGross) * 100 : 33}%` }}
                  className="h-full bg-cuexemerald transition-all"
                  title="Pool Table"
                />
                <div
                  style={{ width: `${dayWiseCollections.totalGross > 0 ? (dayWiseCollections.totalPs5 / dayWiseCollections.totalGross) * 100 : 34}%` }}
                  className="h-full bg-blue-500 transition-all"
                  title="PS5 Gaming"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-champagne" />
                  <span className="text-warmivory font-semibold">Snooker: {formatINR(dayWiseCollections.totalSnooker)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cuexemerald" />
                  <span className="text-warmivory font-semibold">Pool: {formatINR(dayWiseCollections.totalPool)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-warmivory font-semibold">PS5: {formatINR(dayWiseCollections.totalPs5)}</span>
                </div>
              </div>
            </div>

            {/* Day-by-Day Detailed Breakdown */}
            <div className="space-y-4">
              <h3 className="font-display text-xl text-warmivory uppercase tracking-wide">
                Day-by-Day Ledger ({dayWiseCollections.list.length} Days)
              </h3>

              {dayWiseCollections.list.length === 0 ? (
                <div className="py-12 rounded-2xl bg-charcoal/40 border border-white/5 text-center text-mutedgrey text-xs">
                  No financial collection recorded for this date range.
                </div>
              ) : (
                <div className="space-y-3">
                  {dayWiseCollections.list.map((day) => {
                    const isExpanded = selectedDayDetail === day.dateStr;
                    return (
                      <div
                        key={day.dateStr}
                        className="rounded-2xl bg-charcoal/80 border border-white/5 hover:border-champagne/30 transition-all overflow-hidden"
                      >
                        <div
                          onClick={() => setSelectedDayDetail(isExpanded ? null : day.dateStr)}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-display text-2xl text-warmivory">
                                {day.formattedDate}
                              </span>
                              {day.isToday && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                                  Today
                                </span>
                              )}
                              <span className="font-mono text-xs text-mutedgrey">
                                {day.dateStr}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-mutedgrey">
                              <span>{day.totalBookings} total session(s)</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">{day.confirmedCount + day.completedCount} successful</span>
                              {day.cancelledCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-400 font-medium">{day.cancelledCount} cancelled/no-show</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex flex-col md:items-end">
                              <span className="text-[10px] uppercase tracking-widest text-mutedgrey">Total Collection</span>
                              <span className="font-display text-2xl text-champagne font-bold">
                                {formatINR(day.totalRevenue)}
                              </span>
                            </div>

                            <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-warmivory">
                              {isExpanded ? 'Hide Details ▲' : 'View Bookings ▼'}
                            </button>
                          </div>
                        </div>

                        {/* Facility breakdown mini-bar */}
                        <div className="px-5 pb-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs">
                          <div className="p-2 rounded-xl bg-obsidian/60 border border-white/5">
                            <span className="text-[10px] text-champagne uppercase font-bold">Snooker</span>
                            <p className="font-bold text-warmivory">{formatINR(day.snookerRevenue)}</p>
                            <span className="text-[10px] text-mutedgrey">{day.snookerCount} frame(s)/hr</span>
                          </div>
                          <div className="p-2 rounded-xl bg-obsidian/60 border border-white/5">
                            <span className="text-[10px] text-emerald-400 uppercase font-bold">Pool</span>
                            <p className="font-bold text-warmivory">{formatINR(day.poolRevenue)}</p>
                            <span className="text-[10px] text-mutedgrey">{day.poolCount} game(s)/hr</span>
                          </div>
                          <div className="p-2 rounded-xl bg-obsidian/60 border border-white/5">
                            <span className="text-[10px] text-blue-400 uppercase font-bold">PS5</span>
                            <p className="font-bold text-warmivory">{formatINR(day.ps5Revenue)}</p>
                            <span className="text-[10px] text-mutedgrey">{day.ps5Count} session(s)</span>
                          </div>
                        </div>

                        {/* Expanded Booking List for this specific day */}
                        {isExpanded && (
                          <div className="p-5 bg-obsidian/80 border-t border-white/10 space-y-2">
                            <p className="text-xs font-bold text-mutedgrey uppercase tracking-wider pb-1">
                              Individual Bookings on {day.formattedDate}:
                            </p>
                            {day.bookings.map((b) => (
                              <div
                                key={b.id}
                                className="p-3 rounded-xl bg-charcoal/80 border border-white/5 flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-champagne font-bold">{b.booking_reference}</span>
                                    <span className="font-semibold text-warmivory">{b.customer_name}</span>
                                    <span className="text-mutedgrey">({b.resource_id.toUpperCase()})</span>
                                  </div>
                                  <p className="text-[11px] text-mutedgrey">
                                    {formatToIST(b.start_at)} – {formatToIST(b.end_at)} ({b.duration_minutes}m)
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-warmivory">{formatINR(b.total_amount)}</span>
                                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${statusColour(b.status)}`}>
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SEPARATE VENUE CONTROLS & PRICING MANAGEMENT */}
        {activeTab === 'controls' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="font-display text-2xl text-warmivory uppercase tracking-wide flex items-center gap-2">
                <Sliders className="w-6 h-6 text-champagne" />
                Venue Controls & Price Management
              </h2>
              <p className="text-xs text-mutedgrey mt-1">
                Change pricing live, mark holiday day-offs or emergency closures, manage operating hours, and execute quick operations.
              </p>
            </div>

            {/* Quick Operations Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowManualModal(true)}
                className="p-5 rounded-2xl bg-gradient-to-r from-champagne/15 via-warmgold/10 to-champagne/15 border-2 border-champagne/40 hover:border-champagne text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-lg text-champagne uppercase">Manual Walk-in Booking</span>
                  <UserPlus className="w-5 h-5 text-champagne group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-xs text-mutedgrey">
                  Directly lock a table for a customer standing at the counter. Zero collision guarantee.
                </p>
              </button>

              <button
                onClick={() => {
                  setBlockResource('all');
                  setBlockStart(`${getISTDateString()}T08:00`);
                  setBlockEnd(`${getISTDateString()}T23:59`);
                  setActiveTab('blocked');
                }}
                className="p-5 rounded-2xl bg-gradient-to-r from-red-500/15 via-charcoal to-red-500/10 border-2 border-red-500/30 hover:border-red-500/60 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-lg text-red-400 uppercase">Schedule Table Maintenance</span>
                  <Ban className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-xs text-mutedgrey">
                  Block an individual table or the whole venue for repairs, tournaments, or private parties.
                </p>
              </button>
            </div>

            {/* 1. Live Price Editor */}
            <form onSubmit={handleSavePrices} className="p-6 sm:p-8 rounded-3xl bg-charcoal/80 border border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display text-xl text-warmivory uppercase tracking-wide">
                    Live Pricing Configuration
                  </h3>
                  <p className="text-xs text-mutedgrey mt-0.5">
                    Changes apply immediately to online booking calculations and walk-in counters.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian text-xs font-bold uppercase tracking-wider shadow-gold-glow hover:scale-102 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPrices ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingPrices ? 'Saving…' : 'Save Pricing Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pool Table Rates */}
                <div className="p-5 rounded-2xl bg-obsidian border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CircleDot className="w-5 h-5" />
                    <h4 className="font-display text-lg uppercase tracking-wide">Pool Table</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-mutedgrey mb-1">Per Game (Match Mode) Rate (₹):</label>
                      <input
                        type="number"
                        value={pricePoolMatch}
                        onChange={(e) => setPricePoolMatch(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory outline-none font-bold text-sm"
                        required
                      />
                      <span className="text-[10px] text-mutedgrey mt-0.5 block">Configured as ₹40 for one game</span>
                    </div>
                    <div>
                      <label className="block text-mutedgrey mb-1">Standard Hourly Rate (₹):</label>
                      <input
                        type="number"
                        value={pricePoolHourly}
                        onChange={(e) => setPricePoolHourly(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory outline-none font-bold text-sm"
                        required
                      />
                      <span className="text-[10px] text-mutedgrey mt-0.5 block">60 minutes full table access (₹120)</span>
                    </div>
                  </div>
                </div>

                {/* Snooker Table Rates */}
                <div className="p-5 rounded-2xl bg-obsidian border border-champagne/30 space-y-4">
                  <div className="flex items-center gap-2 text-champagne">
                    <Trophy className="w-5 h-5" />
                    <h4 className="font-display text-lg uppercase tracking-wide">Snooker Table</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-mutedgrey mb-1">Per Frame Rate (₹):</label>
                      <input
                        type="number"
                        value={priceSnookerMatch}
                        onChange={(e) => setPriceSnookerMatch(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory outline-none font-bold text-sm"
                        required
                      />
                      <span className="text-[10px] text-mutedgrey mt-0.5 block">Configured as ₹120 for one frame</span>
                    </div>
                    <div>
                      <label className="block text-mutedgrey mb-1">Standard Hourly Rate (₹):</label>
                      <input
                        type="number"
                        value={priceSnookerHourly}
                        onChange={(e) => setPriceSnookerHourly(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory outline-none font-bold text-sm"
                        required
                      />
                      <span className="text-[10px] text-mutedgrey mt-0.5 block">Configured as ₹360 for an hour</span>
                    </div>
                  </div>
                </div>

                {/* PS5 Gaming Station Rates */}
                <div className="p-5 rounded-2xl bg-obsidian border border-blue-500/30 space-y-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Gamepad2 className="w-5 h-5" />
                    <h4 className="font-display text-lg uppercase tracking-wide">PS5 Station</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-mutedgrey mb-1">Single 1 Hr (₹):</label>
                        <input
                          type="number"
                          value={pricePs5Single1}
                          onChange={(e) => setPricePs5Single1(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 text-warmivory outline-none font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-mutedgrey mb-1">Single 2 Hrs (₹):</label>
                        <input
                          type="number"
                          value={pricePs5Single2}
                          onChange={(e) => setPricePs5Single2(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 text-warmivory outline-none font-bold"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-mutedgrey mb-1">2 Players 1 Hr (₹):</label>
                        <input
                          type="number"
                          value={pricePs5Two1}
                          onChange={(e) => setPricePs5Two1(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 text-warmivory outline-none font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-mutedgrey mb-1">2 Players 2 Hrs (₹):</label>
                        <input
                          type="number"
                          value={pricePs5Two2}
                          onChange={(e) => setPricePs5Two2(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-charcoal border border-white/10 text-warmivory outline-none font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* 2. Venue Day-Off & Specific Date Closure Controls */}
            <div className="p-6 sm:p-8 rounded-3xl bg-charcoal/80 border border-white/10 space-y-6">
              <div>
                <h3 className="font-display text-xl text-warmivory uppercase tracking-wide">
                  Venue Holiday & Day-Off Controls
                </h3>
                <p className="text-xs text-mutedgrey mt-0.5">
                  Turn off bookings for any specific calendar date, holiday, or toggle regular weekly operating days.
                </p>
              </div>

              {/* Specific Date Blackout Form */}
              <form onSubmit={handleMarkDateClosed} className="p-5 rounded-2xl bg-obsidian border border-white/10 space-y-4">
                <p className="text-xs font-bold text-warmivory uppercase tracking-wide">
                  Mark Full-Day Closure for a Specific Date
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-mutedgrey mb-1">Closure Date:</label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-charcoal border border-white/10 text-warmivory text-xs outline-none focus:border-champagne"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-mutedgrey mb-1">Reason for Closure:</label>
                    <input
                      type="text"
                      value={holidayReason}
                      onChange={(e) => setHolidayReason(e.target.value)}
                      placeholder="e.g. Festival Holiday / Tournament"
                      className="w-full px-3 py-2.5 rounded-xl bg-charcoal border border-white/10 text-warmivory text-xs outline-none focus:border-champagne"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={savingHoliday}
                      className="w-full py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-xs uppercase tracking-wider hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {savingHoliday ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      Close Venue on This Date
                    </button>
                  </div>
                </div>
              </form>

              {/* Weekly Schedule Toggles */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-warmivory uppercase tracking-wide">
                  Weekly Operating Schedule (7 Days)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {openingHours.map((oh) => {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return (
                      <div
                        key={oh.day_of_week}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 text-center transition-all ${
                          oh.is_closed
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-obsidian border-white/10 text-warmivory'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase">{days[oh.day_of_week]}</span>
                        <span className="text-[10px] text-mutedgrey">
                          {oh.is_closed ? 'CLOSED' : `${oh.open_time.slice(0, 5)} - ${oh.close_time.slice(0, 5)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleDayOfWeekClosed(oh.day_of_week, oh.is_closed)}
                          className={`mt-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            oh.is_closed
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {oh.is_closed ? 'Re-open' : 'Turn Off'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACILITIES & RATES */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resources.map((res) => (
              <div
                key={res.id}
                className="p-6 rounded-2xl bg-charcoal/80 border border-white/5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-2xl text-warmivory uppercase">{res.name}</h3>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        res.is_active
                          ? 'bg-cuexemerald/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {res.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <p className="text-xs text-mutedgrey mb-4">{res.description}</p>

                  <div className="p-3.5 rounded-xl bg-obsidian border border-white/5 space-y-2 text-xs">
                    <p className="font-bold text-champagne uppercase text-[10px] tracking-wider">
                      Pricing Rules:
                    </p>
                    {res.id === 'ps5' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-mutedgrey">1 Player (1 hr / 2 hrs):</span>
                          <span className="text-warmivory font-bold">₹149 / ₹249</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mutedgrey">2 Players (1 hr / 2 hrs):</span>
                          <span className="text-warmivory font-bold">₹249 / ₹349</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-mutedgrey">1 Hour Table Book:</span>
                          <span className="text-warmivory font-bold">₹120</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mutedgrey">1 Match:</span>
                          <span className="text-warmivory font-bold">₹60</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleToggleResourceActive(res.id, res.is_active)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                      res.is_active
                        ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                        : 'bg-cuexemerald/15 border border-cuexemerald/30 text-emerald-400 hover:bg-cuexemerald/25'
                    }`}
                  >
                    {res.is_active ? 'Disable Resource' : 'Enable Resource'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MAINTENANCE BLOCKS */}
        {activeTab === 'blocked' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-charcoal/80 border border-white/5">
              <h3 className="font-display text-2xl uppercase mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-amber-400" />
                Add Maintenance or Private Closure Block
              </h3>

              <form onSubmit={handleCreateBlock} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] text-mutedgrey uppercase tracking-wider mb-1">
                    Facility
                  </label>
                  <select
                    value={blockResource}
                    onChange={(e) => setBlockResource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-white/10 text-xs text-warmivory outline-none"
                  >
                    <option value="all">Entire Venue (All)</option>
                    <option value="ps5">PS5 Station Only</option>
                    <option value="pool">Pool Table Only</option>
                    <option value="snooker">Snooker Table Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-mutedgrey uppercase tracking-wider mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-xs text-warmivory outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-mutedgrey uppercase tracking-wider mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-xs text-warmivory outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-mutedgrey uppercase tracking-wider mb-1">
                    Reason
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Cloth replacement..."
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-xs text-warmivory outline-none"
                    />
                    <button
                      type="submit"
                      disabled={savingBlock}
                      className="px-4 rounded-xl bg-champagne text-obsidian text-xs font-bold uppercase shrink-0"
                    >
                      {savingBlock ? '...' : 'Block'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-mutedgrey">
                Active Maintenance Blocks ({blockedPeriods.length})
              </h4>
              {blockedPeriods.length === 0 ? (
                <div className="p-8 rounded-2xl bg-charcoal/40 text-center text-xs text-mutedgrey">
                  No active blocks recorded. All facilities follow standard operating hours.
                </div>
              ) : (
                blockedPeriods.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4 rounded-xl bg-charcoal/80 border border-amber-500/20 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-semibold text-warmivory text-xs">
                        {bp.resource_id ? bp.resource_id.toUpperCase() : 'ALL FACILITIES (ENTIRE VENUE)'} —{' '}
                        <span className="text-amber-400">{bp.reason}</span>
                      </p>
                      <p className="text-[11px] text-mutedgrey mt-0.5">
                        {formatDateIST(bp.start_at)} ({formatToIST(bp.start_at)} – {formatToIST(bp.end_at)})
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteBlock(bp.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: VENUE & ANTI-ABUSE SETTINGS */}
        {activeTab === 'settings' && venueSettings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Anti-Abuse Safeguards Box */}
            <div className="p-6 rounded-2xl bg-charcoal/80 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-display text-2xl uppercase text-warmivory">
                  Anti-Fake Booking Safeguards
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-mutedgrey font-semibold block mb-1">
                    Temporary Slot Hold Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={venueSettings.temp_hold_minutes || 15}
                    onChange={(e) =>
                      setVenueSettings({ ...venueSettings, temp_hold_minutes: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                  />
                  <p className="text-[10px] text-mutedgrey mt-1">Default 15 minutes. Automatically released upon expiry.</p>
                </div>

                <div>
                  <label className="text-mutedgrey font-semibold block mb-1">
                    Max Active Pending Requests Per Customer
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={venueSettings.max_pending_per_customer || 1}
                    onChange={(e) =>
                      setVenueSettings({ ...venueSettings, max_pending_per_customer: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                  />
                  <p className="text-[10px] text-mutedgrey mt-1">Prevents a single user from holding multiple slots simultaneously.</p>
                </div>

                <div>
                  <label className="text-mutedgrey font-semibold block mb-1">
                    Max Upcoming Confirmed Bookings Per Customer
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={venueSettings.max_active_per_customer || 2}
                    onChange={(e) =>
                      setVenueSettings({ ...venueSettings, max_active_per_customer: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                  />
                  <p className="text-[10px] text-mutedgrey mt-1">Stops bot hoarding across multiple days.</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() =>
                      handleUpdateSettings({
                        temp_hold_minutes: venueSettings.temp_hold_minutes,
                        max_pending_per_customer: venueSettings.max_pending_per_customer,
                        max_active_per_customer: venueSettings.max_active_per_customer,
                      })
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold uppercase tracking-wider text-xs shadow-gold-glow"
                  >
                    Save Safeguards Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* General Venue Information */}
            <div className="p-6 rounded-2xl bg-charcoal/80 border border-white/5 space-y-4">
              <h3 className="font-display text-2xl uppercase mb-2">Venue Configuration</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-mutedgrey block mb-1">Business Name</label>
                  <input
                    type="text"
                    disabled
                    value={venueSettings.business_name}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-warmivory"
                  />
                </div>

                <div>
                  <label className="text-mutedgrey block mb-1">Contact & WhatsApp Phone</label>
                  <input
                    type="text"
                    disabled
                    value={venueSettings.phone}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-warmivory font-mono"
                  />
                </div>

                <div>
                  <label className="text-mutedgrey block mb-1">Official Address</label>
                  <input
                    type="text"
                    disabled
                    value={venueSettings.address}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-warmivory"
                  />
                </div>

                <div>
                  <label className="text-mutedgrey block mb-1">Google Maps Directions Link</label>
                  <input
                    type="text"
                    disabled
                    value={venueSettings.maps_url}
                    className="w-full px-3 py-2 rounded-xl bg-obsidian border border-white/10 text-champagne"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <p className="text-[11px] font-bold uppercase text-champagne">Operating Hours Schedule (Asia/Kolkata):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {openingHours.map((oh) => {
                      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      return (
                        <div key={oh.id} className="p-2.5 rounded-lg bg-obsidian border border-white/5 text-[11px]">
                          <span className="font-semibold text-warmivory block">{days[oh.day_of_week]}</span>
                          <span className="text-mutedgrey">
                            {oh.is_closed ? 'Closed' : `${oh.open_time.slice(0, 5)} - ${oh.close_time.slice(0, 5)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Walk-in / Phone Booking Modal */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-lg w-full rounded-3xl bg-charcoal border border-champagne/40 p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowManualModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-mutedgrey hover:text-warmivory hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="text-[10px] tracking-widest text-champagne uppercase font-bold block mb-1">
                  OFFLINE / WALK-IN OVERRIDE
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-warmivory uppercase">
                  MANUAL RESERVATION
                </h3>
                <p className="text-xs text-mutedgrey mt-0.5">
                  Book a table or station directly. This immediately holds the slot in public availability.
                </p>
              </div>

              <form onSubmit={handleCreateManualBooking} className="space-y-4 text-xs">
                <div>
                  <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                    Select Facility
                  </label>
                  <select
                    value={manualResource}
                    onChange={(e) => setManualResource(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                  >
                    <option value="ps5">PS5 Gaming Station</option>
                    <option value="pool">English Pool Table</option>
                    <option value="snooker">Championship Snooker Table</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Walk-in Guest"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>

                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="6394149768"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>

                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Duration
                    </label>
                    <select
                      value={manualDuration}
                      onChange={(e) => setManualDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    >
                      <option value={30}>30 mins (Match)</option>
                      <option value={60}>60 mins (1 Hr)</option>
                      <option value={120}>120 mins (2 Hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Players
                    </label>
                    <select
                      value={manualPlayers}
                      onChange={(e) => setManualPlayers(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                    >
                      <option value={1}>1 Player</option>
                      <option value={2}>2 Players</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 font-bold text-champagne outline-none focus:border-champagne"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-mutedgrey font-semibold uppercase tracking-wider mb-1">
                    Internal Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Walk-in, cash paid, table 1 requested..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-white/10 text-warmivory outline-none focus:border-champagne"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2.5 rounded-xl text-mutedgrey hover:text-warmivory font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingManualBooking}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold uppercase tracking-wider shadow-gold-glow hover:scale-102 transition-transform"
                  >
                    {savingManualBooking ? 'Reserving...' : 'Confirm Reservation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Official Booking Pass & Invoice Modal */}
        {activePassBooking && (
          <BookingInvoiceModal
            booking={activePassBooking}
            onClose={() => setActivePassBooking(null)}
          />
        )}
      </div>
    </div>
  );
};
