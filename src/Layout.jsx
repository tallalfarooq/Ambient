import { useState, useEffect, createContext } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Layers, Home, BookImage, LogIn, LogOut, User, Sparkles, Heart } from "lucide-react";
import CookieBanner from "@/components/consent/CookieBanner";

export const ConsentContext = createContext(null);

const NAV = [
  { labelKey: "nav_home",      page: "Home",      icon: Home,     mobileLabel: "Home"      },
  { labelKey: "nav_studio",    page: "Studio",    icon: Sparkles, mobileLabel: "Studio"   },
  { labelKey: "nav_projects",  page: "Projects",  icon: BookImage,mobileLabel: "Designs"  },
  { labelKey: "nav_favorites", page: "Favorites", icon: Heart,    mobileLabel: "Favorites"},
  { labelKey: "nav_pricing",   page: "Pricing",   icon: Layers,   mobileLabel: "Pricing"  },
];

const CONSENT_KEY = "ambient_consent";

export default function Layout({ children, currentPageName }) {
  const [consent, setConsent] = useState(null);
  const [user, setUser] = useState(null);
  const [planType, setPlanType] = useState(null);
  const { lang, setLanguage, t } = useLanguage();

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) setConsent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      // Fire welcome email once per user — guarded by localStorage so it never runs twice
      if (u?.email) {
        // Fetch plan
        base44.entities.UserCredits.filter({ user_email: u.email })
          .then((uc) => { if (uc.length > 0) setPlanType(uc[0].plan_type); })
          .catch(() => {});
        const key = `ambient_welcomed_${u.email}`;
        if (!localStorage.getItem(key)) {
          base44.functions.invoke("sendWelcomeEmail", {})
            .then((res) => {
              // Mark as sent when the server confirms sent or says already skipped
              if (res?.data?.sent || res?.data?.skipped) {
                localStorage.setItem(key, "1");
              }
            })
            .catch((err) => console.error("[Welcome email] Error:", err));
        }
      }
    }).catch(() => setUser(null));
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
            <Link to={createPageUrl("Home")} className="flex items-center gap-2.5 group">
              <img src="https://media.base44.com/images/public/69a33ae1bd1ae899284f21e8/c8bd4ea0c_251dc708f_logo.png" alt="AmbientSpace logo" className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex items-baseline gap-0">
                <span className="font-black text-white text-sm tracking-tight">Ambient</span>
                <span className="font-semibold text-sm tracking-tight ml-1" style={{ color: "#6EC6C6" }}>Space</span>
              </div>
            </Link>

            <div className="flex items-center gap-0.5">
              {/* Language switcher */}
              <div className="flex items-center mr-1 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                {["en", "de"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase transition-all"
                    style={lang === l
                      ? { background: "rgba(27,143,160,0.25)", color: "#6EC6C6" }
                      : { background: "transparent", color: "rgba(255,255,255,0.3)" }
                    }
                  >
                    {l}
                  </button>
                ))}
              </div>
              {NAV.map(({ labelKey, page, icon: Icon }) => (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    currentPageName === page
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:block">{t(labelKey)}</span>
                </Link>
            ))}

              {user ? (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/50">
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:block max-w-[80px] truncate">{user.full_name || user.email}</span>
                    {planType && (
                      <span
                        className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        style={planType === 'pro'
                          ? { background: 'rgba(201,150,58,0.18)', color: '#C9963A', border: '1px solid rgba(201,150,58,0.35)' }
                          : planType === 'basic'
                          ? { background: 'rgba(27,143,160,0.18)', color: '#6EC6C6', border: '1px solid rgba(27,143,160,0.35)' }
                          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)' }
                        }
                      >
                        {planType}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">{t("sign_out")}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t("sign_in")}</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <div className="pt-14 pb-16 sm:pb-0">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/6 py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <img src="https://media.base44.com/images/public/69a33ae1bd1ae899284f21e8/c8bd4ea0c_251dc708f_logo.png" alt="AmbientSpace logo" className="w-6 h-6 rounded-md object-cover opacity-60" />
              <div className="flex items-baseline gap-0">
                <span className="font-black text-white/30 text-xs tracking-tight">Ambient</span>
                <span className="font-semibold text-xs tracking-tight ml-1" style={{ color: "rgba(110,198,198,0.4)" }}>Space</span>
              </div>
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link to={createPageUrl("Home")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Home</Link>
              <Link to={createPageUrl("Studio")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Studio</Link>
              <Link to={createPageUrl("Projects")} className="text-white/25 hover:text-white/50 text-xs transition-colors">My Designs</Link>
              <Link to={createPageUrl("Pricing")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Pricing</Link>
              <Link to={createPageUrl("Impressum")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Impressum</Link>
              <Link to={createPageUrl("Datenschutz")} className="text-white/25 hover:text-white/50 text-xs transition-colors">Datenschutz</Link>
              <Link to="/privacy-policy" className="text-white/25 hover:text-white/50 text-xs transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-white/25 hover:text-white/50 text-xs transition-colors">Terms of Service</Link>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/ambientspace_ai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/25 hover:text-white/60 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>

              <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="text-white/25 hover:text-white/60 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
              </a>
            </div>
            <p className="text-white/15 text-xs">© 2026 AmbientSpace.ai. All rights reserved.</p>
          </div>
        </footer>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0A0A0B]/95 backdrop-blur-xl">
          <div className="flex items-center justify-around px-2 py-2">
            {NAV.map(({ page, icon: Icon, mobileLabel }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  currentPageName === page ? "text-white" : "text-white/35"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{mobileLabel}</span>
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => base44.auth.logout()}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-white/35"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[9px] font-semibold tracking-wide">Logout</span>
              </button>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"
                style={{ color: "#1B8FA0" }}
              >
                <LogIn className="w-5 h-5" />
                <span className="text-[9px] font-semibold tracking-wide">{t("sign_in")}</span>
              </button>
            )}
          </div>
        </nav>

        {/* Cookie banner */}
        {!consent && <CookieBanner onConsent={handleConsent} />}
      </div>
    </ConsentContext.Provider>
  );
}