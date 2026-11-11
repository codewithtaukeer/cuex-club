import React from 'react';
import { AboutSection } from '../components/about/AboutSection';
import { GamesSection } from '../components/games/GamesSection';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian pt-20 pb-20">
      <AboutSection />
      <GamesSection />
    </div>
  );
};
