import { useState, useEffect, createContext } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Layers, Home, BookImage, LogIn, LogOut, User, Sparkles, Heart } from "lucide-react";
import CookieBanner from "@/components/consent/CookieBanner";

export const ConsentContext = createContext(null);

const NAV = [
  { label: "Home", page: "Home", icon: Home },
  { label: "Studio", page: "Studio", icon: Sparkles },
  { label: "My Designs", page: "Projects", icon: BookImage },
  { label: "Favorites", page: "Favorites", icon: Heart },
  { label: "Pricing", page: "Pricing", icon: Layers },
];

const CONSENT_KEY = "ambient_consent";

export default function Layout({ children, currentPageName }) {
  const [consent, setConsent] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) setConsent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleConsent = (prefs) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    setConsent(prefs);
  };

  return (
    <ConsentContext.Provider value={consent || { necessary: true, functional: false, marketing: false }}>
      <div className="min-h-screen bg-[#0A0A0B]">
        <style>{`
          * { box-sizing: border-box; }
          body { background: #0A0A0B; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        `}</style>

        {/* Top nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/6 bg-[#0A0A0B]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-violet-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white tracking-tight text-sm">Ambient</span>
            </Link>

            <div className="flex items-center gap-1">
              {NAV.map(({ label, page, icon: Icon }) => (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    currentPageName === page
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              ))}

              {user ? (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/50">
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:block max-w-[80px] truncate">{user.full_name || user.email}</span>
                  </div>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">Sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-500 hover:bg-violet-400 text-white transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <div className="pt-14">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/6 py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-violet-600 flex items-center justify-center">
                <Layers className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/40 text-xs font-bold tracking-tight">Ambient</span>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link to={createPageUrl("Home")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Home</Link>
              <Link to={createPageUrl("Studio")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Studio</Link>
              <Link to={createPageUrl("Projects")} className="text-white/25 hover:text-white/50 text-xs transition-colors">My Designs</Link>
              <Link to={createPageUrl("Pricing")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Pricing</Link>
              <Link to={createPageUrl("Impressum")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Impressum</Link>
              <Link to={createPageUrl("Datenschutz")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Datenschutz</Link>
            </div>
            <p className="text-white/15 text-xs">© 2026 Ambient. All rights reserved.</p>
          </div>
        </footer>

        {/* Cookie banner */}
        {!consent && <CookieBanner onConsent={handleConsent} />}
      </div>
    </ConsentContext.Provider>
  );
}