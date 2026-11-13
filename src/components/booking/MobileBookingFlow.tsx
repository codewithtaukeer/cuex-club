import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Gamepad2, CircleDot, Trophy, User, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ResourceType, AvailabilitySlot, CuexBooking } from '../../types';
import { formatToIST, formatDateIST, formatINR, getISTDateString } from '../../lib/utils';
import { BookingSuccessModal } from './BookingSuccessModal';

const VALID_FACILITIES: ResourceType[] = ['ps5', 'pool', 'snooker'];

export const MobileBookingFlow: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const requestIdRef = useRef<number>(0);

  // Parse and safely validate URL query params (P1-3 defense)
  const searchParams = new URLSearchParams(location.search);
  const rawFacility = searchParams.get('facility');
  const initialFacility: ResourceType = VALID_FACILITIES.includes(rawFacility as ResourceType)
    ? (rawFacility as ResourceType)
    : 'pool';

  const rawDate = searchParams.get('date');
  const todayStr = getISTDateString();
  const initialDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate >= todayStr
    ? rawDate
    : todayStr;

  const initialTime = searchParams.get('time') || '';
  const rawDuration = Number(searchParams.get('duration'));
  const initialDuration = [30, 60, 120].includes(rawDuration) ? rawDuration : 60;
  const initialBookingMode: 'hourly' | 'match' = initialDuration <= 30 ? 'match' : 'hourly';

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFacility, setSelectedFacility] = useState<ResourceType>(initialFacility);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [numberOfPlayers, setNumberOfPlayers] = useState<number>(1);
  const [bookingMode, setBookingMode] = useState<'hourly' | 'match'>(initialBookingMode);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Customer form state
  const [customerName, setCustomerName] = useState<string>(profile?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(profile?.phone || '');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Availability slots
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<CuexBooking | null>(null);

  // Sync profile details when loaded
  useEffect(() => {
    if (profile) {
      if (!customerName && profile.full_name) setCustomerName(profile.full_name);
      if (!customerPhone && profile.phone) setCustomerPhone(profile.phone);
    }
  }, [profile]);

  // Fetch slots whenever facility, date, or duration changes (P1-6: Race condition defense)
  const loadSlots = async () => {
    const currentReqId = ++requestIdRef.current;
    setLoadingSlots(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc('cuex_get_resource_availability', {
        p_resource_id: selectedFacility,
        p_date: selectedDate,
        p_duration_minutes: durationMinutes,
      });

      if (currentReqId !== requestIdRef.current) {
        // Discard stale out-of-order response
        return;
      }

      if (error) throw error;
      const fetchedSlots = (data as AvailabilitySlot[]) || [];
      setSlots(fetchedSlots);

      // Match initialTime on first load if provided
      if (initialTime && !selectedSlot) {
        const match = fetchedSlots.find((s) => s.slot_start === initialTime);
        if (match && match.slot_status === 'available') {
          setSelectedSlot(match);
          setCurrentStep(4);
        }
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMsg(err.message || 'Failed to load time slots.');
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoadingSlots(false);
      }
    }
  };

  useEffect(() => {
    // Clear selected slot whenever facility, date, or duration changes (P1-1: Stale slot defense)
    setSelectedSlot(null);
    loadSlots();
  }, [selectedFacility, selectedDate, durationMinutes]);

  // Calculate live price
  const calculateEstimatedPrice = (): number => {
    if (selectedSlot && selectedSlot.calculated_price !== undefined) {
      return Number(selectedSlot.calculated_price);
    }
    if (selectedFacility === 'ps5') {
      if (numberOfPlayers >= 2) {
        return durationMinutes >= 120 ? 349 : 249;
      }
      return durationMinutes >= 120 ? 249 : 149;
    }
    // Pool or Snooker
    if (bookingMode === 'match' || durationMinutes <= 30) {
      return 60;
    }
    return durationMinutes >= 120 ? 240 : 120;
  };

  // Submit booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      setErrorMsg('Please select an available time slot.');
      setCurrentStep(3);
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Please enter your full name (minimum 2 characters).');
      return;
    }

    // P1-7: Support Unicode / Hindi / Devanagari letters along with Latin
    if (!/^[\p{L}\s.'-]+$/u.test(trimmedName)) {
      setErrorMsg('Please enter a valid name using letters and spaces.');
      return;
    }

    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1);
    }

    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a complete 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Indian mobile numbers must start with 6, 7, 8, or 9.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc('cuex_book_slot', {
        p_resource_id: selectedFacility,
        p_start_at: selectedSlot.slot_start,
        p_duration_minutes: durationMinutes,
        p_customer_name: trimmedName,
        p_customer_phone: cleanPhone,
        p_customer_email: user?.email || null,
        p_number_of_players: numberOfPlayers,
        p_booking_mode: bookingMode,
        p_customer_notes: customerNotes.trim() || null,
      });

      if (error) throw error;

      // Save phone and name in localStorage for guest access
      try {
        localStorage.setItem('cuex_guest_phone', cleanPhone);
        localStorage.setItem('cuex_guest_name', trimmedName);
      } catch {
        // ignore localStorage errors
      }

      setConfirmedBooking(data as CuexBooking);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setErrorMsg(err.message || 'Could not complete booking. Please try another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  // 7-day quick dates
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: getISTDateString(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  const facilityMeta = {
    ps5: { name: 'PS5 Gaming Station', icon: <Gamepad2 className="w-5 h-5 text-blue-400" /> },
    pool: { name: 'Pool Table', icon: <CircleDot className="w-5 h-5 text-emerald-400" /> },
    snooker: { name: 'Snooker Table', icon: <Trophy className="w-5 h-5 text-champagne" /> },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step Indicator Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-mutedgrey mb-3">
          <span className={currentStep >= 1 ? 'text-champagne' : ''}>1. Game</span>
          <span className="text-white/20">→</span>
          <span className={currentStep >= 2 ? 'text-champagne' : ''}>2. Date & Mode</span>
          <span className="text-white/20">→</span>
          <span className={currentStep >= 3 ? 'text-champagne' : ''}>3. Slot</span>
          <span className="text-white/20">→</span>
          <span className={currentStep >= 4 ? 'text-champagne' : ''}>4. Confirm</span>
        </div>
        <div className="h-1.5 w-full bg-charcoal rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-champagne to-warmgold transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: CHOOSE YOUR GAME */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center mb-6">
            <h2 className="font-display text-3xl sm:text-4xl text-warmivory uppercase tracking-wide">
              STEP 1: SELECT FACILITY
            </h2>
            <p className="text-xs text-mutedgrey">Choose what you want to play at CueX</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(
              [
                {
                  id: 'ps5' as const,
                  title: 'PS5 Gaming Station',
                  subtitle: 'Single or 2-Player Gaming',
                  priceText: 'From ₹149/hr',
                  desc: '4K Display, DualSense wireless controllers, next-gen library',
                  image: '/assets/cuex-ps5.jpg',
                  icon: <Gamepad2 className="w-6 h-6 text-blue-400" />,
                },
                {
                  id: 'pool' as const,
                  title: 'English Pool Table',
                  subtitle: 'Tournament Billiards',
                  priceText: '₹120/hr • ₹60/match',
                  desc: 'Emerald green cloth, precision cues, tournament spec balls',
                  image: '/assets/cuex-interior.jpg',
                  icon: <CircleDot className="w-6 h-6 text-emerald-400" />,
                },
                {
                  id: 'snooker' as const,
                  title: 'Snooker Table',
                  subtitle: 'Championship Dimensions',
                  priceText: '₹120/hr • ₹60/match',
                  desc: 'Directional canopy lighting, professional snooker cue set',
                  image: '/assets/cuex-cue-detail.jpg',
                  icon: <Trophy className="w-6 h-6 text-champagne" />,
                },
              ] as const
            ).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedFacility(item.id);
                  setSelectedSlot(null);
                  if (item.id === 'ps5') {
                    setDurationMinutes(60);
                    setBookingMode('hourly');
                  } else {
                    setDurationMinutes(60);
                    setBookingMode('hourly');
                    setNumberOfPlayers(1);
                  }
                  setCurrentStep(2);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                  selectedFacility === item.id
                    ? 'bg-charcoal border-champagne shadow-gold-glow'
                    : 'bg-obsidian border-white/10 hover:border-white/30'
                }`}
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-charcoal shrink-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display text-xl text-warmivory truncate">{item.title}</h3>
                    <span className="text-xs font-bold text-champagne shrink-0 ml-2">
                      {item.priceText}
                    </span>
                  </div>
                  <p className="text-[11px] text-mutedgrey line-clamp-2 mb-2">{item.desc}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-warmgold font-semibold uppercase">
                    <span>Select Game</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DATE & DURATION */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-mutedgrey hover:text-warmivory flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-xs font-bold text-champagne uppercase">
              {facilityMeta[selectedFacility].name}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-mutedgrey mb-3">
              1. Choose Date
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {nextDays.map((d) => (
                <button
                  key={d.dateStr}
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                    selectedDate === d.dateStr
                      ? 'bg-champagne/20 border-champagne text-champagne shadow-gold-glow'
                      : 'bg-charcoal border-white/10 text-mutedgrey hover:text-warmivory'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Options based on Facility */}
          {selectedFacility === 'ps5' ? (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mutedgrey mb-2">
                  2. Number of Players
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNumberOfPlayers(1)}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                      numberOfPlayers === 1
                        ? 'bg-champagne text-obsidian border-champagne'
                        : 'bg-charcoal border-white/10 text-mutedgrey'
                    }`}
                  >
                    1 Player (Solo)
                  </button>
                  <button
                    onClick={() => setNumberOfPlayers(2)}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                      numberOfPlayers === 2
                        ? 'bg-champagne text-obsidian border-champagne'
                        : 'bg-charcoal border-white/10 text-mutedgrey'
                    }`}
                  >
                    2 Players (Co-op / Versus)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mutedgrey mb-2">
                  3. Session Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDurationMinutes(60)}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                      durationMinutes === 60
                        ? 'bg-champagne text-obsidian border-champagne'
                        : 'bg-charcoal border-white/10 text-mutedgrey'
                    }`}
                  >
                    1 Hour ({numberOfPlayers === 1 ? '₹149' : '₹249'})
                  </button>
                  <button
                    onClick={() => setDurationMinutes(120)}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                      durationMinutes === 120
                        ? 'bg-champagne text-obsidian border-champagne'
                        : 'bg-charcoal border-white/10 text-mutedgrey'
                    }`}
                  >
                    2 Hours ({numberOfPlayers === 1 ? '₹249' : '₹349'})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Pool or Snooker options */
            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-mutedgrey mb-2">
                2. Booking Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setBookingMode('hourly');
                    setDurationMinutes(60);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    bookingMode === 'hourly'
                      ? 'bg-champagne/15 border-champagne text-warmivory shadow-gold-glow'
                      : 'bg-charcoal border-white/10 text-mutedgrey'
                  }`}
                >
                  <p className="text-xs font-bold text-warmivory">1 Hour Table Booking</p>
                  <p className="text-[11px] text-champagne font-semibold mt-1">₹120 / Hour</p>
                  <p className="text-[10px] text-mutedgrey mt-0.5">Full table access for 60 mins</p>
                </button>

                <button
                  onClick={() => {
                    setBookingMode('match');
                    setDurationMinutes(30);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    bookingMode === 'match'
                      ? 'bg-champagne/15 border-champagne text-warmivory shadow-gold-glow'
                      : 'bg-charcoal border-white/10 text-mutedgrey'
                  }`}
                >
                  <p className="text-xs font-bold text-warmivory">Single Match</p>
                  <p className="text-[11px] text-champagne font-semibold mt-1">₹60 / Match</p>
                  <p className="text-[10px] text-mutedgrey mt-0.5">30 mins game slot</p>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setCurrentStep(3)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-4"
          >
            <span>Proceed to Time Slots</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: SELECT TIME SLOT */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs text-mutedgrey hover:text-warmivory flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-xs font-bold text-champagne uppercase">
              {facilityMeta[selectedFacility].name} • {selectedDate}
            </span>
          </div>

          <div className="text-center">
            <h3 className="font-display text-2xl text-warmivory uppercase">
              CHOOSE YOUR START TIME
            </h3>
            <p className="text-xs text-mutedgrey">
              Green slots are available for instant reservation
            </p>
          </div>

          {loadingSlots ? (
            <div className="py-16 text-center text-champagne flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs tracking-widest uppercase">Fetching Realtime Slots...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map((slot, idx) => {
                const isAvailable = slot.slot_status === 'available';
                const isSelected = selectedSlot?.slot_start === slot.slot_start;

                return (
                  <button
                    key={idx}
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedSlot(slot);
                    }}
                    className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-champagne to-warmgold text-obsidian border-champagne shadow-gold-glow scale-102'
                        : isAvailable
                        ? 'bg-charcoal border-cuexemerald/40 text-warmivory hover:border-champagne'
                        : 'bg-charcoal/30 border-white/5 text-mutedgrey/40 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="font-display text-xl leading-none">
                      {formatToIST(slot.slot_start)}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${
                        isSelected
                          ? 'text-obsidian font-extrabold'
                          : isAvailable
                          ? 'text-emerald-400'
                          : 'text-mutedgrey'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : isAvailable ? 'AVAILABLE' : slot.slot_status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            disabled={!selectedSlot}
            onClick={() => setCurrentStep(4)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-champagne to-warmgold text-obsidian font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Continue with Selected Slot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 4: CUSTOMER DETAILS & REVIEW */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              onClick={() => setCurrentStep(3)}
              className="text-xs text-mutedgrey hover:text-warmivory flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-xs font-bold text-champagne uppercase">Booking Review</span>
          </div>

          {/* Booking Summary Box */}
          <div className="rounded-2xl bg-charcoal border border-champagne/30 p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-display text-xl text-warmivory">
                {facilityMeta[selectedFacility].name}
              </span>
              <span className="font-display text-2xl text-champagne">
                {formatINR(calculateEstimatedPrice())}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-mutedgrey uppercase">Date</p>
                <p className="font-semibold text-warmivory">
                  {selectedSlot ? formatDateIST(selectedSlot.slot_start) : selectedDate}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-mutedgrey uppercase">Time</p>
                <p className="font-semibold text-warmivory">
                  {selectedSlot ? formatToIST(selectedSlot.slot_start) : '--'} –{' '}
                  {selectedSlot ? formatToIST(selectedSlot.slot_end) : '--'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-mutedgrey uppercase">Duration</p>
                <p className="font-semibold text-warmivory">{durationMinutes} Minutes</p>
              </div>
              <div>
                <p className="text-[10px] text-mutedgrey uppercase">Payment</p>
                <p className="font-semibold text-emerald-400">Pay at Venue</p>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-mutedgrey">
                  Full Name <span className="text-red-400">*</span>
                </label>
                {customerName.trim().length >= 2 && /^[a-zA-Z\s.'-]+$/.test(customerName.trim()) && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Valid Name
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-mutedgrey" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory text-xs placeholder:text-mutedgrey/50 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-mutedgrey">
                  Mobile Number <span className="text-red-400">*</span>
                </label>
                {(() => {
                  const raw = customerPhone.replace(/\D/g, '');
                  const digits = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw.startsWith('0') && raw.length === 11 ? raw.slice(1) : raw;
                  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
                    return (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Valid Indian Mobile
                      </span>
                    );
                  }
                  if (digits.length > 0 && !/^[6-9]/.test(digits)) {
                    return <span className="text-[10px] text-amber-400">Must start with 6, 7, 8, or 9</span>;
                  }
                  if (digits.length > 0 && digits.length < 10) {
                    return <span className="text-[10px] text-mutedgrey">{10 - digits.length} digits left</span>;
                  }
                  return null;
                })()}
              </div>
              <div className="relative flex">
                <span className="inline-flex items-center px-3.5 rounded-l-xl bg-charcoal/80 border border-r-0 border-white/10 text-mutedgrey text-xs font-bold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone.replace('+91', '').trim()}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory text-xs placeholder:text-mutedgrey/50 outline-none font-medium tracking-wide transition-colors"
                />
              </div>
              <p className="text-[10px] text-mutedgrey mt-1">Used by CueX owner to confirm via phone call or WhatsApp</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-mutedgrey mb-1.5">
                Special Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Preferred games on PS5, cue requests, or extra notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal border border-white/10 focus:border-champagne text-warmivory text-xs placeholder:text-mutedgrey/50 outline-none resize-none"
              />
            </div>
          </div>

          {/* Anti-abuse Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">15-Minute Temporary Slot Hold</p>
              <p className="text-[11px] text-mutedgrey mt-0.5">
                Submitting this request temporarily reserves your chosen slot. The CueX owner will verify and confirm your reservation.
              </p>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmBooking}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-champagne via-warmgold to-champagne text-obsidian font-extrabold text-xs uppercase tracking-widest shadow-gold-glow hover:shadow-gold-glow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Locking in 15-Min Hold...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit Request (Hold for 15 mins)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmedBooking && (
        <BookingSuccessModal
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
        />
      )}
    </div>
  );
};
