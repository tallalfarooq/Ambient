import { useState, useEffect, createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, FolderOpen, Home, BookImage, LogIn, LogOut, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CookieBanner from "@/components/consent/CookieBanner";

export const ConsentContext = createContext({ necessary: true, functional: false, marketing: false });
export const useConsent = () => useContext(ConsentContext);

const NAV = [
  { label: "Home", page: "Home", icon: Home },
  { label: "Studio", page: "Studio", icon: Sparkles },
  { label: "My Designs", page: "MyDesigns", icon: BookImage },
  { label: "Projects", page: "Projects", icon: FolderOpen },
];

const CONSENT_KEY = "ambient_consent";

export default function Layout({ children, currentPageName }) {
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) setConsent(JSON.parse(stored));
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
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
            </div>
          </div>
        </nav>

        {/* Page content */}
        <div className="pt-14">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t border-white/6 py-4 px-6 flex items-center justify-center gap-6">
          <Link to={createPageUrl("Impressum")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Impressum</Link>
          <Link to={createPageUrl("Datenschutz")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Datenschutz</Link>
        </div>

        {/* Cookie banner */}
        {!consent && <CookieBanner onConsent={handleConsent} />}
      </div>
    </ConsentContext.Provider>
  );
}