import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, Clock, TrendingUp, Search, Phone, MessageSquare,
  Ban, Download, RefreshCw, Trash2, UserPlus, Unlock, CheckCircle2,
  X, Ticket, Volume2, VolumeX, BellRing, ChevronRight, Home,
  Layers, LogOut, Settings, Wrench, Plus, AlertTriangle, Check,
  ArrowLeft, Filter, Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { CuexBooking, CuexResource, CuexBlockedPeriod } from '../types';
import { formatToIST, formatDateIST, formatINR, getISTDateString } from '../lib/utils';
import { BookingInvoiceModal } from '../components/booking/BookingInvoiceModal';
import {
  playWhatsAppSound, primeAudioContext,
  requestNotificationPermission, showBrowserNotification,
} from '../lib/notificationSound';
import { registerServiceWorker, showSwNotification, canInstallPwa, promptPwaInstall, isPwa } from '../lib/pwa';

// ─── Types ─────────────────────────────────────────────────────────────────
type AdminTab = 'home' | 'pending' | 'bookings' | 'walkin' | 'block' | 'settings';

// ─── Status Colour Helper ───────────────────────────────────────────────────
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

// ─── Resource label helper ─────────────────────────────────────────────────
function resLabel(id: string): string {
  if (id === 'ps5') return 'PS5 Gaming';
  if (id === 'pool') return 'Pool Table';
  return 'Snooker';
}

// ─── Main Component ─────────────────────────────────────────────────────────
export const AdminAppPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [tab, setTab] = useState<AdminTab>('home');
  const [bookings, setBookings] = useState<CuexBooking[]>([]);
  const [resources, setResources] = useState<CuexResource[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<CuexBlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingAlert, setIncomingAlert] = useState<CuexBooking | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('cuex_admin_sound') !== 'false'; } catch { return true; }
  });
  const [activePassBooking, setActivePassBooking] = useState<CuexBooking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Manual booking form state
  const [manualResource, setManualResource] = useState<'ps5' | 'pool' | 'snooker'>('pool');
  const [manualName, setManualName] = useState('Walk-in Customer');
  const [manualPhone, setManualPhone] = useState('');
  const [manualDate, setManualDate] = useState(getISTDateString());
  const [manualTime, setManualTime] = useState('13:00');
  const [manualDuration, setManualDuration] = useState(60);
  const [manualPlayers, setManualPlayers] = useState(1);
  const [manualAmount, setManualAmount] = useState(120);
  const [manualNotes, setManualNotes] = useState('Manual walk-in booking');
  const [savingManual, setSavingManual] = useState(false);

  // Block form state
  const [blockResource, setBlockResource] = useState('all');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Scheduled Maintenance');
  const [savingBlock, setSavingBlock] = useState(false);

  // ─── Auth Guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth?redirect=/admin-app');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // ─── Handle ?tab= from shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'pending') setTab('pending');
    else if (t === 'walkin') setTab('walkin');
  }, [searchParams]);

  // ─── PWA Setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    registerServiceWorker();
    requestNotificationPermission();
    // Show install banner if not already installed as PWA
    if (!isPwa() && canInstallPwa()) setShowInstallBanner(true);
    const timer = setTimeout(() => {
      if (!isPwa() && canInstallPwa()) setShowInstallBanner(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, rRes, bpRes] = await Promise.all([
        supabase.from('cuex_bookings').select('*').order('start_at', { ascending: false }),
        supabase.from('cuex_resources').select('*').order('name'),
        supabase.from('cuex_blocked_periods').select('*').order('start_at', { ascending: false }),
      ]);
      if (bRes.data) setBookings(bRes.data as CuexBooking[]);
      if (rRes.data) setResources(rRes.data as CuexResource[]);
      if (bpRes.data) setBlockedPeriods(bpRes.data as CuexBlockedPeriod[]);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  // ─── Realtime Subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('cuex-admin-app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuex_bookings' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const nb = payload.new as CuexBooking;
          if (soundEnabled) { primeAudioContext(); playWhatsAppSound(); }
          setIncomingAlert(nb);
          // Show notification via service worker (works even when screen off)
          showSwNotification(
            '🎱 New Booking Request!',
            `${nb.customer_name} (${nb.customer_phone}) wants ${resLabel(nb.resource_id)} on ${formatDateIST(nb.start_at)} at ${formatToIST(nb.start_at)}`,
            '/admin-app?tab=pending'
          ).catch(() => {
            showBrowserNotification('🎱 New Booking Request!', {
              body: `${nb.customer_name} wants ${resLabel(nb.resource_id)} — tap to review`,
            });
          });
        }
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, soundEnabled, loadData]);

  // ─── Auto calc amount ────────────────────────────────────────────────────
  useEffect(() => {
    if (manualResource === 'ps5') {
      setManualAmount(manualPlayers >= 2 ? (manualDuration >= 120 ? 349 : 249) : (manualDuration >= 120 ? 249 : 149));
    } else {
      setManualAmount(manualDuration <= 30 ? 60 : manualDuration >= 120 ? 240 : 120);
    }
  }, [manualResource, manualDuration, manualPlayers]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleConfirm = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_confirm_booking', { p_booking_id: b.id });
      if (error) throw error;
      showFeedback('success', `✅ ${b.booking_reference} confirmed!`);
      loadData();
    } catch (err: any) { showFeedback('error', err.message || 'Confirmation failed'); }
  };

  const handleReject = async (b: CuexBooking) => {
    const reason = window.prompt(`Reason for rejecting ${b.booking_reference}?`, 'Slot unavailable');
    if (reason === null) return;
    try {
      const { error } = await supabase.rpc('cuex_admin_reject_booking', {
        p_booking_id: b.id, p_reason: reason || 'Declined by venue',
      });
      if (error) throw error;
      showFeedback('success', `Booking ${b.booking_reference} rejected.`);
      loadData();
    } catch (err: any) { showFeedback('error', err.message || 'Rejection failed'); }
  };

  const handleExtendHold = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_extend_hold', { p_booking_id: b.id, p_extra_minutes: 15 });
      if (error) throw error;
      showFeedback('success', 'Hold extended by 15 minutes.');
      loadData();
    } catch (err: any) { showFeedback('error', err.message); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('cuex_bookings').update({ status }).eq('id', id);
      if (error) throw error;
      showFeedback('success', `Status → ${status}`);
      loadData();
    } catch (err: any) { showFeedback('error', err.message); }
  };

  const handleReopenSlot = async (b: CuexBooking) => {
    try {
      const { error } = await supabase.rpc('cuex_admin_reopen_slot', { p_booking_id: b.id });
      if (error) throw error;
      showFeedback('success', `Slot re-opened for ${b.booking_reference}`);
      loadData();
    } catch (err: any) { showFeedback('error', err.message || 'Cannot re-open — may conflict.'); }
  };

  const handleDelete = async (b: CuexBooking) => {
    if (!window.confirm(`Delete ${b.booking_reference} permanently?`)) return;
    try {
      const { error } = await supabase.from('cuex_bookings').delete().eq('id', b.id);
      if (error) throw error;
      showFeedback('success', `Deleted ${b.booking_reference}`);
      loadData();
    } catch (err: any) { showFeedback('error', err.message); }
  };

  const handleManualBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim() || !manualDate || !manualTime) {
      showFeedback('error', 'Fill in all fields.');
      return;
    }
    setSavingManual(true);
    try {
      const startAt = new Date(`${manualDate}T${manualTime}:00+05:30`).toISOString();
      const { data, error } = await supabase.rpc('cuex_admin_manual_book', {
        p_resource_id: manualResource,
        p_start_at: startAt,
        p_duration_minutes: manualDuration,
        p_customer_name: manualName.trim(),
        p_customer_phone: manualPhone.trim(),
        p_total_amount: manualAmount,
        p_notes: manualNotes.trim() || null,
        p_number_of_players: manualPlayers,
      });
      if (error) throw error;
      const created = data as CuexBooking;
      showFeedback('success', `Walk-in booked! Ref: ${created?.booking_reference}`);
      setManualPhone(''); setManualName('Walk-in Customer');
      setTab('bookings');
      loadData();
    } catch (err: any) { showFeedback('error', err.message || 'Booking failed.'); }
    finally { setSavingManual(false); }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd || !blockReason.trim()) {
      showFeedback('error', 'Fill in all block fields.');
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
      showFeedback('success', 'Maintenance block added.');
      setBlockStart(''); setBlockEnd('');
      loadData();
    } catch (err: any) { showFeedback('error', err.message); }
    finally { setSavingBlock(false); }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const { error } = await supabase.from('cuex_blocked_periods').delete().eq('id', id);
      if (error) throw error;
      showFeedback('success', 'Block removed.');
      loadData();
    } catch (err: any) { showFeedback('error', err.message); }
  };

  const handleExportCSV = () => {
    if (!bookings.length) return;
    const sanitize = (v: unknown): string => {
      const str = String(v ?? '').replace(/"/g, '""');
      return `"${/^[=+\-@]/.test(str) ? "'" + str : str}"`;
    };
    const headers = ['Reference','Resource','Name','Phone','Date','Start','End','Duration','Amount','Status'].map(h => `"${h}"`).join(',');
    const rows = bookings.map(b => [
      sanitize(b.booking_reference), sanitize(b.resource_id.toUpperCase()),
      sanitize(b.customer_name), `"\t${b.customer_phone}"`,
      sanitize(formatDateIST(b.start_at)), sanitize(formatToIST(b.start_at)),
      sanitize(formatToIST(b.end_at)), sanitize(b.duration_minutes),
      sanitize(b.total_amount), sanitize(b.status.toUpperCase()),
    ].join(','));
    const blob = new Blob(['\uFEFF' + [headers, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.setAttribute('download', `cuex_${getISTDateString()}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Derived Stats ────────────────────────────────────────────────────────
  const todayStr = getISTDateString();
  const pending = bookings.filter(b => b.status === 'pending_confirmation' || b.status === 'pending');
  const todayBookings = bookings.filter(b => getISTDateString(new Date(b.start_at)) === todayStr);
  const totalRevenue = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((s, b) => s + Number(b.total_amount), 0);

  const filteredBookings = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.booking_reference.toLowerCase().includes(q) ||
             b.customer_name.toLowerCase().includes(q) ||
             b.customer_phone.includes(q);
    }
    return true;
  });

  // ─── Loading / Auth State ─────────────────────────────────────────────────
  if (authLoading || (!isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-[#0B0C0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-champagne animate-spin" />
          <span className="text-xs text-mutedgrey uppercase tracking-widest">Loading CueX Admin...</span>
        </div>
      </div>
    );
  }

  // ─── Input style ──────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-champagne text-sm text-warmivory outline-none placeholder:text-mutedgrey';
  const labelCls = 'block text-[11px] uppercase tracking-wider text-mutedgrey mb-1.5 font-semibold';

  // ─── Booking Card (reusable) ───────────────────────────────────────────────
  const BookingCard = ({ b, showActions = true }: { b: CuexBooking; showActions?: boolean }) => {
    const holdSecs = b.expires_at ? Math.max(0, Math.floor((new Date(b.expires_at).getTime() - Date.now()) / 1000)) : null;
    const holdMin = holdSecs !== null ? Math.floor(holdSecs / 60) : null;
    const holdSec = holdSecs !== null ? holdSecs % 60 : null;
    const isPending = b.status === 'pending_confirmation' || b.status === 'pending';
    const isConfirmed = b.status === 'confirmed';
    const isClosed = ['cancelled', 'expired', 'rejected'].includes(b.status);

    return (
      <div className={`rounded-2xl border p-4 space-y-3 ${isPending ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/3 border-white/8'}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-champagne font-bold tracking-wider">{b.booking_reference}</p>
            <p className="font-semibold text-warmivory mt-0.5">{b.customer_name}</p>
          </div>
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${statusColour(b.status)}`}>
            {b.status.replace('_', ' ')}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1 text-xs text-mutedgrey">
          <div className="flex items-center gap-2">
            <span className="text-champagne font-bold uppercase text-[10px]">{resLabel(b.resource_id)}</span>
            <span>•</span>
            <span>{formatDateIST(b.start_at)}</span>
            <span>•</span>
            <span className="text-warmivory font-semibold">{formatToIST(b.start_at)}–{formatToIST(b.end_at)}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`tel:${b.customer_phone}`} className="flex items-center gap-1 hover:text-champagne font-mono">
              <Phone className="w-3 h-3 text-champagne" />{b.customer_phone}
            </a>
            <span className="font-bold text-warmivory">{formatINR(b.total_amount)}</span>
            {holdMin !== null && isPending && (
              <span className="text-amber-400 font-mono text-[10px]">⏱ {holdMin}m {holdSec! < 10 ? '0' : ''}{holdSec}s</span>
            )}
          </div>
          {b.customer_notes && (
            <p className="italic text-[11px]">"{b.customer_notes}"</p>
          )}
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Contact */}
            <a href={`tel:${b.customer_phone}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-warmivory">
              <Phone className="w-3 h-3 text-champagne" />Call
            </a>
            <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${b.customer_name}, this is CueX regarding your booking ${b.booking_reference}.`)}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-xs font-medium text-[#25D366]">
              <MessageSquare className="w-3 h-3" />WhatsApp
            </a>

            {/* Pending actions */}
            {isPending && (<>
              <button onClick={() => handleConfirm(b)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30">
                <Check className="w-3 h-3" />Confirm
              </button>
              <button onClick={() => handleReject(b)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs font-bold text-red-400">
                <X className="w-3 h-3" />Reject
              </button>
              <button onClick={() => handleExtendHold(b)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-mutedgrey hover:text-warmivory">
                +15m Hold
              </button>
            </>)}

            {/* Confirmed actions */}
            {isConfirmed && (<>
              <button onClick={() => setActivePassBooking(b)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-champagne/15 border border-champagne/40 text-xs font-bold text-champagne">
                <Ticket className="w-3 h-3" />Pass
              </button>
              <button onClick={() => handleUpdateStatus(b.id, 'completed')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-xs font-bold text-blue-400">
                <CheckCircle2 className="w-3 h-3" />Done
              </button>
              <button onClick={() => handleUpdateStatus(b.id, 'no_show')}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-xs text-red-400">
                No Show
              </button>
              <button onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300">
                <Unlock className="w-3 h-3" />Cancel
              </button>
            </>)}

            {/* Re-open */}
            {isClosed && (
              <button onClick={() => handleReopenSlot(b)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">
                Re-open Slot
              </button>
            )}

            {/* Delete */}
            <button onClick={() => handleDelete(b)}
              className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Tab Screens ──────────────────────────────────────────────────────────

  const HomeTab = () => (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Today's Bookings", value: todayBookings.length, icon: <Calendar className="w-4 h-4 text-champagne" />, color: 'text-warmivory' },
          { label: 'Awaiting Confirm', value: pending.length, icon: <Clock className="w-4 h-4 text-amber-400" />, color: 'text-amber-400', urgent: pending.length > 0 },
          { label: 'Total Bookings', value: bookings.length, icon: <Layers className="w-4 h-4 text-blue-400" />, color: 'text-warmivory' },
          { label: 'Gross Revenue', value: formatINR(totalRevenue), icon: <TrendingUp className="w-4 h-4 text-champagne" />, color: 'text-champagne' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-2xl bg-white/4 border ${s.urgent ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/8'}`}>
            <div className="flex items-center justify-between mb-2 text-mutedgrey">
              <span className="text-[10px] uppercase tracking-wider leading-tight">{s.label}</span>
              {s.icon}
            </div>
            <span className={`font-display text-2xl sm:text-3xl ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Pending Requests Quick View */}
      {pending.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 overflow-hidden">
          <button onClick={() => setTab('pending')} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="font-bold text-warmivory text-sm">{pending.length} Booking Request{pending.length > 1 ? 's' : ''} Waiting</p>
                <p className="text-xs text-mutedgrey mt-0.5">Tap to review and confirm</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-mutedgrey mb-3 font-semibold">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <UserPlus className="w-5 h-5" />, label: 'Walk-in Booking', action: () => setTab('walkin'), accent: 'bg-champagne/15 border-champagne/30 text-champagne' },
            { icon: <Ban className="w-5 h-5" />, label: 'Block Maintenance', action: () => setTab('block'), accent: 'bg-red-500/15 border-red-500/30 text-red-400' },
            { icon: <Download className="w-5 h-5" />, label: 'Export CSV', action: handleExportCSV, accent: 'bg-white/5 border-white/10 text-mutedgrey' },
            { icon: <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />, label: 'Refresh Data', action: loadData, accent: 'bg-white/5 border-white/10 text-mutedgrey' },
          ].map(a => (
            <button key={a.label} onClick={a.action}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-xs font-semibold uppercase tracking-wide ${a.accent} active:scale-95 transition-transform`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Status */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-mutedgrey mb-3 font-semibold">Facility Status</p>
        <div className="space-y-2">
          {resources.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/4 border border-white/8">
              <div>
                <p className="text-sm font-semibold text-warmivory">{r.name}</p>
                <p className="text-xs text-mutedgrey">{r.description?.slice(0, 40)}...</p>
              </div>
              <button
                onClick={async () => {
                  await supabase.from('cuex_resources').update({ is_active: !r.is_active }).eq('id', r.id);
                  loadData();
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${r.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
              >
                {r.is_active ? 'Open' : 'Closed'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PendingTab = () => (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="font-semibold text-warmivory">All Clear!</p>
          <p className="text-xs text-mutedgrey max-w-[200px]">No pending booking requests at the moment.</p>
        </div>
      ) : (
        pending.map(b => <BookingCard key={b.id} b={b} />)
      )}
    </div>
  );

  const BookingsTab = () => (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedgrey" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, reference…" className={`${inputCls} pl-10`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap border transition-all ${statusFilter === s ? 'bg-champagne text-obsidian border-champagne' : 'bg-white/5 text-mutedgrey border-white/10'}`}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredBookings.length === 0 ? (
        <div className="py-12 text-center text-mutedgrey text-xs">No bookings found.</div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );

  const WalkInTab = () => (
    <form onSubmit={handleManualBook} className="space-y-4">
      <div className="p-4 rounded-2xl bg-champagne/5 border border-champagne/20">
        <p className="text-xs text-champagne font-semibold">Walk-in booking is instantly confirmed — no hold period.</p>
      </div>

      <div>
        <label className={labelCls}>Facility</label>
        <div className="grid grid-cols-3 gap-2">
          {(['pool', 'snooker', 'ps5'] as const).map(r => (
            <button key={r} type="button" onClick={() => setManualResource(r)}
              className={`py-3 rounded-xl text-xs font-bold uppercase border transition-all ${manualResource === r ? 'bg-champagne text-obsidian border-champagne' : 'bg-white/5 text-mutedgrey border-white/10'}`}>
              {r === 'ps5' ? 'PS5' : r === 'pool' ? 'Pool' : 'Snooker'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Customer Name</label>
          <input value={manualName} onChange={e => setManualName(e.target.value)} className={inputCls} placeholder="Name" required />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} className={inputCls} placeholder="10-digit" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className={inputCls} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Duration</label>
          <select value={manualDuration} onChange={e => setManualDuration(Number(e.target.value))} className={inputCls}>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
          </select>
        </div>
        {manualResource === 'ps5' && (
          <div>
            <label className={labelCls}>Players</label>
            <select value={manualPlayers} onChange={e => setManualPlayers(Number(e.target.value))} className={inputCls}>
              <option value={1}>1 Player</option>
              <option value={2}>2 Players</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Amount (auto-calculated)</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-mutedgrey">₹</span>
          <input type="number" value={manualAmount} onChange={e => setManualAmount(Number(e.target.value))} className={`${inputCls} flex-1`} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes (optional)</label>
        <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </div>

      <button type="submit" disabled={savingManual}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98 transition-all shadow-gold-glow">
        {savingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {savingManual ? 'Creating Booking…' : 'Create Walk-in Booking'}
      </button>
    </form>
  );

  const BlockTab = () => (
    <div className="space-y-5">
      <form onSubmit={handleCreateBlock} className="space-y-4 p-4 rounded-2xl bg-white/3 border border-white/8">
        <p className="text-sm font-bold text-warmivory">Add Maintenance Block</p>

        <div>
          <label className={labelCls}>Facility</label>
          <select value={blockResource} onChange={e => setBlockResource(e.target.value)} className={inputCls}>
            <option value="all">All Facilities</option>
            <option value="ps5">PS5 Station</option>
            <option value="pool">Pool Table</option>
            <option value="snooker">Snooker Table</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start</label>
            <input type="datetime-local" value={blockStart} onChange={e => setBlockStart(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>End</label>
            <input type="datetime-local" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className={inputCls} required />
          </div>
        </div>

        <div>
          <label className={labelCls}>Reason</label>
          <input value={blockReason} onChange={e => setBlockReason(e.target.value)} className={inputCls} placeholder="e.g. Maintenance, Private event" required />
        </div>

        <button type="submit" disabled={savingBlock}
          className="w-full py-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60">
          {savingBlock ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
          Add Block
        </button>
      </form>

      {/* Active blocks */}
      {blockedPeriods.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-mutedgrey mb-3 font-semibold">Active Blocks ({blockedPeriods.length})</p>
          <div className="space-y-2">
            {blockedPeriods.map(bp => (
              <div key={bp.id} className="flex items-center justify-between p-3.5 rounded-xl bg-red-500/5 border border-red-500/20">
                <div>
                  <p className="text-xs font-bold text-warmivory">{bp.reason}</p>
                  <p className="text-[10px] text-mutedgrey mt-0.5">
                    {bp.resource_id ? resLabel(bp.resource_id) : 'All Facilities'} •{' '}
                    {formatToIST(bp.start_at)} – {formatToIST(bp.end_at)}
                  </p>
                </div>
                <button onClick={() => handleDeleteBlock(bp.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-4">
      {/* Sound control */}
      <div className="p-4 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${soundEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-mutedgrey'}`}>
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-bold text-warmivory">Sound Alerts</p>
            <p className="text-[11px] text-mutedgrey">{soundEnabled ? 'WhatsApp chime active' : 'Muted'}</p>
          </div>
        </div>
        <button onClick={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          try { localStorage.setItem('cuex_admin_sound', String(next)); } catch {}
          if (next) { primeAudioContext(); playWhatsAppSound(); requestNotificationPermission(); }
        }}
          className={`w-12 h-6 rounded-full transition-all ${soundEnabled ? 'bg-emerald-500' : 'bg-white/15'} relative`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${soundEnabled ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Test sound */}
      <button onClick={() => { primeAudioContext(); playWhatsAppSound(); requestNotificationPermission(); showFeedback('success', '🔊 Sound tested!'); }}
        className="w-full py-3.5 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
        <Volume2 className="w-4 h-4" />Test Sound Alert
      </button>

      {/* Install PWA */}
      <div className="p-4 rounded-2xl bg-white/4 border border-white/8 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-warmivory">Install as App</p>
            <p className="text-[11px] text-mutedgrey mt-0.5">Add to home screen for instant access and background push notifications when a booking comes in.</p>
          </div>
        </div>
        {isPwa() ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />Already installed as app!
          </div>
        ) : (
          <button onClick={async () => {
            const result = await promptPwaInstall();
            if (result === 'accepted') showFeedback('success', '✅ CueX Admin installed! You can now receive notifications even when closed.');
            else if (result === 'unavailable') showFeedback('error', 'Install prompt not available. Use browser menu → "Add to Home Screen" or "Install App".');
          }}
            className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />Install App on This Phone
          </button>
        )}
      </div>

      {/* How to install manually */}
      {!isPwa() && (
        <div className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-2">
          <p className="text-xs font-bold text-warmivory flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />Manual Install Steps (Android Chrome)
          </p>
          <ol className="text-[11px] text-mutedgrey space-y-1 list-decimal list-inside">
            <li>Open this page in Chrome on your phone</li>
            <li>Tap the 3-dot menu (⋮) in the top right</li>
            <li>Tap "Add to Home screen" or "Install App"</li>
            <li>Tap "Add" — it appears like a native app!</li>
            <li>Open it once and tap "Allow" for notifications</li>
          </ol>
        </div>
      )}

      {/* Sign out */}
      <button onClick={() => { signOut(); navigate('/'); }}
        className="w-full py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" />Sign Out
      </button>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  const tabConfig: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'pending', label: 'Requests', icon: <BellRing className="w-5 h-5" />, badge: pending.length },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="w-5 h-5" /> },
    { id: 'walkin', label: 'Walk-in', icon: <UserPlus className="w-5 h-5" /> },
    { id: 'block', label: 'Block', icon: <Wrench className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const tabTitle: Record<AdminTab, string> = {
    home: 'Dashboard', pending: 'Booking Requests', bookings: 'All Bookings',
    walkin: 'Walk-in Booking', block: 'Maintenance Block', settings: 'Settings',
  };

  return (
    <div className="min-h-screen bg-[#0B0C0B] text-warmivory flex flex-col max-w-lg mx-auto">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-[#0B0C0B]/95 backdrop-blur-xl border-b border-white/8 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-champagne/40 overflow-hidden">
              <img src="/assets/cuex-logo.png" alt="CueX" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display text-sm text-warmivory tracking-wider leading-none">CUEX ADMIN</p>
              <p className="text-[9px] text-champagne uppercase tracking-widest">Owner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <button onClick={() => setTab('pending')}
                className="relative p-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <BellRing className="w-4 h-4 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pending.length}
                </span>
              </button>
            )}
            <button onClick={loadData}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-mutedgrey">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-champagne' : ''}`} />
            </button>
          </div>
        </div>

        {/* Page title bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {tab !== 'home' && (
            <button onClick={() => setTab('home')} className="p-1 text-mutedgrey hover:text-warmivory">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="font-display text-lg uppercase tracking-wider">{tabTitle[tab]}</h1>
          {tab === 'bookings' && (
            <button onClick={() => {}} className="ml-auto p-1.5 rounded-lg bg-white/5 text-mutedgrey">
              <Filter className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Install banner */}
      {showInstallBanner && !isPwa() && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-300 font-medium">Install as app for background notifications</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { promptPwaInstall().then(r => { if (r === 'accepted') setShowInstallBanner(false); }); }}
              className="text-[10px] font-bold text-blue-400 uppercase tracking-wider border border-blue-400/50 px-2.5 py-1 rounded-full">
              Install
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="text-mutedgrey">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Incoming booking alert */}
      {incomingAlert && (
        <div className="mx-4 mt-3 p-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 animate-bounce shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-300 text-sm">New Booking Request!</p>
              <p className="text-xs text-warmivory mt-0.5 truncate">
                <strong>{incomingAlert.customer_name}</strong> → {resLabel(incomingAlert.resource_id)} on {formatDateIST(incomingAlert.start_at)}
              </p>
              <p className="text-xs text-mutedgrey">{incomingAlert.booking_reference}</p>
            </div>
            <button onClick={() => setIncomingAlert(null)} className="text-mutedgrey shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { handleConfirm(incomingAlert); setIncomingAlert(null); }}
              className="py-2.5 rounded-xl bg-emerald-500/25 border border-emerald-500/50 text-emerald-400 text-xs font-bold uppercase">
              ✓ Confirm Now
            </button>
            <button onClick={() => { setTab('pending'); setIncomingAlert(null); }}
              className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-warmivory text-xs font-semibold uppercase">
              View Request
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedbackMsg && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold ${feedbackMsg.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'}`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Invoice Modal */}
      {activePassBooking && (
        <BookingInvoiceModal booking={activePassBooking} onClose={() => setActivePassBooking(null)} />
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 pb-28 overflow-y-auto">
        {tab === 'home' && <HomeTab />}
        {tab === 'pending' && <PendingTab />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'walkin' && <WalkInTab />}
        {tab === 'block' && <BlockTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 bg-[#0F1010]/95 backdrop-blur-xl border-t border-white/8 safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {tabConfig.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all relative ${tab === t.id ? 'text-champagne' : 'text-mutedgrey hover:text-warmivory'}`}>
              {t.badge && t.badge > 0 ? (
                <div className="relative">
                  {t.icon}
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                </div>
              ) : t.icon}
              <span className={`text-[9px] font-semibold uppercase tracking-wide ${tab === t.id ? 'text-champagne' : ''}`}>
                {t.label}
              </span>
              {tab === t.id && (
                <div className="absolute -bottom-1 w-4 h-0.5 rounded-full bg-champagne" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
