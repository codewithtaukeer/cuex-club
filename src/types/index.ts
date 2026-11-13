export type ResourceType = 'ps5' | 'pool' | 'snooker';

export interface CuexResource {
  id: ResourceType;
  name: string;
  resource_type: ResourceType;
  is_active: boolean;
  slot_duration_minutes: number;
  available_duration_options: number[];
  hourly_rate: number;
  pricing_details: {
    single_player?: Record<string, number>;
    two_player?: Record<string, number>;
    hourly?: Record<string, number> | number;
    per_match?: Record<string, number>;
    match?: number;
    per_game?: number;
    frame?: number;
    [key: string]: any;
  };
  buffer_minutes: number;
  max_advance_days: number;
  description: string;
  image_url: string;
}

export type BookingStatus =
  | 'pending_confirmation'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'completed'
  | 'no_show';

export interface CuexBooking {
  id: string;
  booking_reference: string;
  user_id: string;
  resource_id: ResourceType;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  number_of_players: number;
  booking_mode: 'hourly' | 'match';
  start_at: string;
  end_at: string;
  duration_minutes: number;
  total_amount: number;
  status: BookingStatus;
  customer_notes?: string;
  admin_notes?: string;
  expires_at?: string;
  confirmed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Join helper
  resource?: CuexResource;
}

export interface CuexOpeningHour {
  id: number;
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

export interface CuexVenueSettings {
  id: string;
  business_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  maps_url: string;
  instagram_url: string;
  auto_confirm: boolean;
  cancellation_deadline_hours: number;
  cancellation_policy: string;
  is_setup_completed: boolean;
  temp_hold_minutes: number;
  max_pending_per_customer: number;
  max_active_per_customer: number;
  require_manual_approval: boolean;
  turnstile_enabled: boolean;
  turnstile_site_key?: string;
}

export interface CuexBlockedPeriod {
  id: string;
  resource_id: ResourceType | null;
  start_at: string;
  end_at: string;
  reason: string;
  created_at: string;
}

export interface AvailabilitySlot {
  slot_start: string;
  slot_end: string;
  slot_status: 'available' | 'booked' | 'blocked' | 'past';
  calculated_price: number;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'member';
}
