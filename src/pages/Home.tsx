import React from 'react';
import { CinematicHero } from '../components/hero/CinematicHero';
import { GamesSection } from '../components/games/GamesSection';
import { LiveAvailabilitySection } from '../components/availability/LiveAvailabilitySection';
import { AboutSection } from '../components/about/AboutSection';
import { GallerySection } from '../components/gallery/GallerySection';
import { HowToBookSection } from '../components/booking/HowToBookSection';
import { LocationContactSection } from '../components/location/LocationContactSection';

export const Home: React.FC = () => {
  return (
    <main className="overflow-hidden bg-obsidian">
      <CinematicHero />
      <GamesSection />
      <LiveAvailabilitySection />
      <AboutSection />
      <GallerySection />
      <HowToBookSection />
      <LocationContactSection />
    </main>
  );
};
