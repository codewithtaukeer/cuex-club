import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ResourceType, AvailabilitySlot } from '../../types';
import { formatToIST, formatINR, getISTDateString, VENUE_INFO } from '../../lib/utils';

interface LiveAvailabilitySectionProps {
  initialResource?: ResourceType;
  onSelectSlot?: (resource: ResourceType, date: string, slot: AvailabilitySlot) => void;
}

export const LiveAvailabilitySection: React.FC<LiveAvailabilitySectionProps> = ({
  initialResource = 'ps5',
  onSelectSlot,
}) => {
  const [selectedResource, setSelectedResource] = useState<ResourceType>(initialResource);
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString());
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Next 7 days for quick selection
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: getISTDateString(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('cuex_get_resource_availability', {
        p_resource_id: selectedResource,
        p_date: selectedDate,
        p_duration_minutes: selectedDuration,
      });

      if (rpcError) {
        throw rpcError;
      }

      setSlots((data as AvailabilitySlot[]) || []);
    } catch (err: any) {
      console.error('Error fetching availability:', err);
      setError(err.message || 'Unable to load availability slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedResource, selectedDate, selectedDuration]);

  // Supabase Realtime subscription for live availability updates
  useEffect(() => {
    const channel = supabase
      .channel('cuex-realtime-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuex_bookings' },
        () => {
          fetchAvailability();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuex_blocked_periods' },
        () => {
          fetchAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedResource, selectedDate, selectedDuration]);

  const handleSlotSelection = (slot: AvailabilitySlot) => {
    if (slot.slot_status !== 'available') return;
    if (onSelectSlot) {
      onSelectSlot(selectedResource, selectedDate, slot);
    } else {
      navigate(
        `/booking?facility=${selectedResource}&date=${selectedDate}&time=${encodeURIComponent(
          slot.slot_start
        )}&duration=${selectedDuration}`
      );
    }
  };

  return (
    <section id="availability" className="py-20 md:py-28 bg-obsidian relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-cuexemerald/10 blur-[130px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 border border-champagne/30 text-champagne text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
            REAL-TIME RESERVATION ENGINE
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-warmivory uppercase tracking-tight mb-3">
            THE TABLE IS YOURS. <span className="text-gold-gradient">WHEN IT'S FREE.</span>
          </h2>
          <p className="font-display text-lg sm:text-xl text-champagne/80 tracking-widest uppercase">
            FIND YOUR PERFECT TIME. BOOK YOUR GAME.
          </p>
        </div>

        {/* Resource Switcher Segmented Control */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-charcoal border border-champagne/20 shadow-xl max-w-md w-full">
            {(
              [
                { id: 'ps5', label: 'PS5 Gaming' },
                { id: 'pool', label: 'Pool Table' },
                { id: 'snooker', label: 'Snooker Table' },
              ] as const
            ).map((res) => (
              <button
                key={res.id}
                onClick={() => setSelectedResource(res.id)}
                className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  selectedResource === res.id
                    ? 'bg-gradient-to-r from-champagne to-warmgold text-obsidian shadow-gold-glow'
                    : 'text-warmivory/70 hover:text-warmivory'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-mutedgrey flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-champagne" />
              Select Date (Asia/Kolkata)
            </span>
            <button
              onClick={fetchAvailability}
              disabled={loading}
              className="text-xs text-champagne hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {quickDates.map((item) => (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedDate === item.dateStr
                    ? 'bg-champagne/15 border-champagne text-champagne shadow-gold-glow'
                    : 'bg-charcoal border-white/5 text-mutedgrey hover:text-warmivory hover:border-white/20'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Availability Display */}
        <div className="rounded-3xl bg-charcoal/60 border border-white/10 p-6 md:p-8 backdrop-blur-xl">
            {/* Status Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10 text-xs">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cuexemerald" />
                  <span className="text-warmivory/80">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="text-mutedgrey">Booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <span className="text-mutedgrey">Blocked / Maint.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-white/20" />
                  <span className="text-mutedgrey">Past</span>
                </div>
              </div>

              {/* Duration filter for Pool/Snooker */}
              {selectedResource !== 'ps5' ? (
                <div className="flex items-center gap-2">
                  <span className="text-mutedgrey text-[11px] uppercase">Format:</span>
                  <button
                    onClick={() => setSelectedDuration(30)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedDuration === 30
                        ? 'bg-champagne text-obsidian'
                        : 'bg-obsidian text-mutedgrey'
                    }`}
                  >
                    Match (30m)
                  </button>
                  <button
                    onClick={() => setSelectedDuration(60)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedDuration === 60
                        ? 'bg-champagne text-obsidian'
                        : 'bg-obsidian text-mutedgrey'
                    }`}
                  >
                    Hourly (60m)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-mutedgrey text-[11px] uppercase">Duration:</span>
                  <button
                    onClick={() => setSelectedDuration(60)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedDuration === 60
                        ? 'bg-champagne text-obsidian'
                        : 'bg-obsidian text-mutedgrey'
                    }`}
                  >
                    1 Hour
                  </button>
                  <button
                    onClick={() => setSelectedDuration(120)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedDuration === 120
                        ? 'bg-champagne text-obsidian'
                        : 'bg-obsidian text-mutedgrey'
                    }`}
                  >
                    2 Hours
                  </button>
                </div>
              )}
            </div>

            {/* Error or Loading */}
            {loading && (
              <div className="py-16 text-center text-champagne flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs uppercase tracking-widest">Checking Realtime Slots...</span>
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Slots Grid */}
            {!loading && !error && (
              <div>
                {slots.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-warmivory text-sm mb-3">
                      All booked up for this date or the venue is closed.
                    </p>
                    <a
                      href={VENUE_INFO.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/30 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Can't find a suitable time? Chat with us
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {slots.map((slot, idx) => {
                      const isAvailable = slot.slot_status === 'available';
                      const isBooked = slot.slot_status === 'booked';
                      const isBlocked = slot.slot_status === 'blocked';

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-4 flex flex-col justify-between border transition-all ${
                            isAvailable
                              ? 'bg-obsidian border-cuexemerald/40 hover:border-champagne hover:shadow-gold-glow cursor-pointer'
                              : isBooked
                              ? 'bg-charcoal/40 border-red-900/30 opacity-60 cursor-not-allowed'
                              : isBlocked
                              ? 'bg-charcoal/40 border-amber-900/30 opacity-50 cursor-not-allowed'
                              : 'bg-charcoal/20 border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                          onClick={() => isAvailable && handleSlotSelection(slot)}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] tracking-widest uppercase font-bold text-mutedgrey">
                                {selectedDuration} Mins
                              </span>
                              <span
                                className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                                  isAvailable
                                    ? 'bg-cuexemerald/20 text-emerald-400 border border-cuexemerald/40'
                                    : isBooked
                                    ? 'bg-red-500/10 text-red-400'
                                    : isBlocked
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-white/5 text-mutedgrey'
                                }`}
                              >
                                {isAvailable
                                  ? 'AVAILABLE'
                                  : isBooked
                                  ? 'BOOKED'
                                  : isBlocked
                                  ? 'BLOCKED'
                                  : 'PAST'}
                              </span>
                            </div>

                            <p className="font-display text-xl sm:text-2xl text-warmivory mb-1">
                              {formatToIST(slot.slot_start)}
                            </p>
                            <p className="text-[11px] text-mutedgrey mb-3">
                              until {formatToIST(slot.slot_end)}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-champagne">
                              {formatINR(slot.calculated_price)}
                            </span>
                            {isAvailable && (
                              <span className="text-[10px] text-warmgold font-semibold uppercase tracking-wider">
                                Select →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };
