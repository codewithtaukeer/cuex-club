import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/layout/CustomCursor';
import { StickyBottomBar } from './components/layout/StickyBottomBar';

// Lazy-loaded route components for high performance & fast initial load
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const BookingPage = lazy(() => import('./pages/BookingPage').then(m => ({ default: m.BookingPage })));
const AvailabilityPage = lazy(() => import('./pages/AvailabilityPage').then(m => ({ default: m.AvailabilityPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage').then(m => ({ default: m.MyBookingsPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Route fallback loader
const RouteLoader = () => (
  <div className="min-h-[70vh] flex items-center justify-center bg-obsidian text-champagne">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-champagne border-t-transparent animate-spin" />
      <span className="text-xs uppercase tracking-widest text-mutedgrey">Loading CueX Experience...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <CustomCursor />
        <div className="flex flex-col min-h-screen bg-obsidian text-warmivory selection:bg-champagne selection:text-obsidian">
          <Navbar />
          <div className="flex-1">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/availability" element={<AvailabilityPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
          <StickyBottomBar />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
