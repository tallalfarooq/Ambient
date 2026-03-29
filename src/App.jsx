import { Toaster } from "@/components/ui/toaster"
import { base44 } from "@/api/base44Client"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';
import Favorites from '@/pages/Favorites';
import AdminEmail from '@/pages/AdminEmail';
import SharedDesign from '@/pages/SharedDesign';
import Unsubscribe from '@/pages/Unsubscribe';
import Pricing from '@/pages/Pricing';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Use SDK login redirect - don't render null to avoid flicker
      base44.auth.redirectToLogin(window.location.href);
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0B]">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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