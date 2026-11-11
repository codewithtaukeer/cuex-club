import React from 'react';
import { MobileBookingFlow } from '../components/booking/MobileBookingFlow';

export const BookingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20">
      <MobileBookingFlow />
    </div>
  );
};
