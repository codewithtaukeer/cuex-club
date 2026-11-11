import React from 'react';
import { LiveAvailabilitySection } from '../components/availability/LiveAvailabilitySection';

export const AvailabilityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian pt-20 pb-20">
      <LiveAvailabilitySection />
    </div>
  );
};
