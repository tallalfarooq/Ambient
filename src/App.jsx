import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import ErrorBoundary from '@/components/ErrorBoundary';

// Eager — small, on the critical path
import Favorites from '@/pages/Favorites';
import Unsubscribe from '@/pages/Unsubscribe';
import Pricing from '@/pages/Pricing';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import Login from '@/pages/Login';
import Try from '@/pages/Try';

// Lazy — admin only, also bigger Stripe / sharing flows
const AdminEmail   = lazy(() => import('@/pages/AdminEmail'));
const SharedDesign = lazy(() => import('@/pages/SharedDesign'));

// Tiny fallback shown while a lazy chunk is loading. Matches the existing
// auth-loading spinner so the transition feels seamless.
const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B]">
    <div className="w-8 h-8 border-4 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  // Show a single loading spinner during initial auth hydration.
  // Public pages render once auth is resolved (logged in or not).
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B]">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Auth routes — rendered without the app Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />

        {/* Main app routes — wrapped in Layout */}
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/Favorites" element={
          <LayoutWrapper currentPageName="Favorites">
            <Favorites />
          </LayoutWrapper>
        } />
        <Route path="/SharedDesign" element={
          <LayoutWrapper currentPageName="SharedDesign">
            <SharedDesign />
          </LayoutWrapper>
        } />
        <Route path="/Pricing" element={
          <LayoutWrapper currentPageName="Pricing">
            <Pricing />
          </LayoutWrapper>
        } />
        <Route path="/privacy-policy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/AdminEmail" element={<LayoutWrapper currentPageName="AdminEmail"><AdminEmail /></LayoutWrapper>} />
        <Route path="/terms-of-service" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/Try" element={<LayoutWrapper currentPageName="Try"><Try /></LayoutWrapper>} />
        <Route path="/try" element={<LayoutWrapper currentPageName="Try"><Try /></LayoutWrapper>} />
        <Route path="*" element={
          <LayoutWrapper currentPageName="NotFound">
            <PageNotFound />
          </LayoutWrapper>
        } />
      </Routes>
    </Suspense>
  );
};


function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App
