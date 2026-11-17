import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider, useData } from './context/DataContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { MaintenanceGate } from './components/MaintenanceGate.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LivePage } from './pages/LivePage.tsx';
import { VotingPage } from './pages/VotingPage.tsx';
import { HousematesPage } from './pages/HousematesPage.tsx';
import { HousemateDetailPage } from './pages/HousemateDetailPage.tsx';
import { NewsPage } from './pages/NewsPage.tsx';
import { NewsArticlePage } from './pages/NewsArticlePage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import {
  ContactPage,
  FaqPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from './pages/StaticPages.tsx';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};

const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const { siteSettings, dataLoading } = useData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [minIntroDone, setMinIntroDone] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => setMinIntroDone(true),
      prefersReducedMotion ? 150 : 900
    );
    return () => window.clearTimeout(timer);
  }, []);

  const isAdminRoute = pathname.startsWith('/admin');
  const showMaintenance = siteSettings.maintenanceMode && !isAdmin && !isAdminRoute;
  const showLoadingScreen = dataLoading || !minIntroDone;

  return (
    <>
      <AnimatePresence>
        {showLoadingScreen && <LoadingScreen isReady={!dataLoading} />}
      </AnimatePresence>
      <ScrollToTop />
      {!dataLoading &&
        (showMaintenance ? (
          <MaintenanceGate />
        ) : (
        <div className="min-h-screen flex flex-col pbb-cosmic-shell text-slate-950 dark:text-slate-100">
          <Navbar onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/voting" element={<VotingPage />} />
              <Route path="/housemates" element={<HousematesPage />} />
              <Route path="/housemates/:slug" element={<HousemateDetailPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:slug" element={<NewsArticlePage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer onOpenSearch={() => setSearchOpen(true)} />
        </div>
        ))}
      <AuthModal />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <AppShell />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
