import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import { Check, Sparkles, Crown, Zap, Loader2, Building2, ShoppingBag, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import ContactSalesModal from "@/components/ContactSalesModal";

export default function Pricing() {
  const { t } = useLanguage();
  // Day 9.11 — auth via shared useAuth() context (same as Layout).
  const { user: authUser } = useAuth();
  const user = authUser;
  const [credits,    setCredits]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  // Day 9.1 — Talk to sales modal. Replaces mailto: hrefs that were
  // wrapping the entire B2B card and silently failing in browsers without
  // a configured mail client.
  const [salesModal, setSalesModal] = useState({ open: false, source: null });
  const openSales = (source) => setSalesModal({ open: true, source });
  const closeSales = () => setSalesModal({ open: false, source: salesModal.source });

  // Paid plans only — Starter ($0) is granted automatically on signup and
  // shown as a banner above instead of a third card. This makes the page
  // a real two-option choice instead of a three-way analysis.
  //
  // Cost-per-render is computed live (1 generation = 2 credits, so
  // gens = credits / 2; pricePerRender = $price / gens). Display this on
  // each card so the value is one-glance obvious.
  const PLANS = [
    {
      id: "basic",
      name: "Basic",
      priceUsd: 5,
      credits: 20,
      icon: Zap,
      tagline: "Perfect for trying it out",
      popular: false, // Day 6.7 — removed "Most popular" from Basic. The MOST POPULAR + BEST VALUE pair on adjacent cards was reading as competing badges; "Best value" on Pro is the stronger anchor and Basic doesn't need a competing badge.
      features: [t("plan_basic_f1"), t("plan_basic_f2"), t("plan_basic_f3"), t("plan_basic_f4"), t("plan_basic_f5"), t("plan_basic_f6")],
    },
    {
      id: "pro",
      name: "Pro",
      priceUsd: 20,
      credits: 100,
      icon: Crown,
      tagline: "Best value — save 20% per render",
      bestValue: true, // visual highlight: better $/render math
      features: [t("plan_pro_f1"), t("plan_pro_f2"), t("plan_pro_f3"), t("plan_pro_f4"), t("plan_pro_f5"), t("plan_pro_f6"), t("plan_pro_f7"), t("plan_pro_f8")],
    },
  ];

  // Compute $/render once per plan. 1 full generation = 2 credits.
  const computePerRender = (plan) => {
    const gens = Math.floor(plan.credits / 2);
    return gens > 0 ? plan.priceUsd / gens : 0;
  };

  // Day 9.11 — credits-only fetch driven by authUser. Loading is just for
  // the credits call; auth state comes from useAuth().
  useEffect(() => {
    if (!authUser?.email) {
      setLoading(false);
      return;
    }
    apiClient.entities.UserCredits.filter({ user_email: authUser.email })
      .then((uc) => { if (uc.length > 0) setCredits(uc[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser?.email]);

  const handlePurchase = async (planId) => {
    if (!user) {
      apiClient.auth.redirectToLogin(window.location.href);
      return;
    }
    setPurchasing(planId);
    try {
      // Return to /Studio so the ?payment=success handler fires and shows the confirmation toast
      const returnUrl = `${window.location.origin}/Studio`;
      const response = await apiClient.functions.invoke("createCheckout", { plan: planId, returnUrl });
      const url = response?.data?.url || response?.url;
      if (url) {
        window.location.href = url;
        return; // navigation pending — keep button in "loading" state
      }
      // 200 but no url: don't leave the button stuck spinning
      console.error("Checkout response missing url:", response);
      toast.error("Payment setup failed. Please try again.");
      setPurchasing(null);
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error("Payment setup failed. Please try again.");
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-16">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.25)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "#1B8FA0" }} />
            <span className="text-sm font-semibold" style={{ color: "#1B8FA0" }}>{t("pricing_badge")}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">{t("pricing_title")}</h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">{t("pricing_subtitle")}</p>
        </div>

        {/* Credit cost legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(27,143,160,0.08)", border: "1px solid rgba(27,143,160,0.2)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#1B8FA0" }} />
            <span className="text-sm text-white/70"><strong className="text-white">2 credits</strong> {t("pricing_credits_per_gen")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#C9963A" }} />
            <span className="text-sm text-white/70"><strong className="text-white">1 credit</strong> {t("pricing_credits_per_tune")}</span>
          </div>
        </div>

        {/* Free credits banner — replaces the Starter card. Shows for everyone:
            unauthed visitors see "free credits on signup", authed users see
            their current credit balance. */}
        {!user ? (
          <div className="max-w-3xl mx-auto mb-10 px-6 py-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ background: "rgba(27,143,160,0.06)", border: "1px solid rgba(27,143,160,0.2)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(27,143,160,0.15)" }}>
                <Sparkles className="w-5 h-5" style={{ color: "#1B8FA0" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Your first design is free</p>
                <p className="text-xs text-white/45">No credit card required — try one full render on us.</p>
              </div>
            </div>
            <button
              onClick={() => apiClient.auth.redirectToLogin(window.location.href)}
              className="text-sm font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition-all hover:opacity-90"
              style={{ background: "rgba(27,143,160,0.18)", border: "1px solid rgba(27,143,160,0.4)", color: "#6EC6C6" }}
            >
              Sign up free
            </button>
          </div>
        ) : credits ? (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-sm text-white/50">{t("pricing_current_label")}</span>
              <span className="text-sm font-semibold text-white capitalize">{credits.plan_type}</span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-sm font-semibold" style={{ color: "#1B8FA0" }}>{credits.credits_remaining} {t("pricing_credits_remaining")}</span>
            </div>
          </div>
        ) : null}

        {/* Plans grid — 2 paid options (Basic + Pro). Centered with max-width
            so cards stay legible on wide screens. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrentPlan = credits?.plan_type === plan.id;
            const perRender = computePerRender(plan);
            const fullGens = Math.floor(plan.credits / 2);
            const highlighted = plan.popular || plan.bestValue;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-3xl p-8 border transition-all hover:border-white/25"
                style={highlighted
                  ? { borderColor: "rgba(27,143,160,0.45)", background: "rgba(27,143,160,0.05)" }
                  : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #1B8FA0, #6EC6C6)" }}>
                    {t("plan_popular")}
                  </div>
                )}
                {plan.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #C9963A, #d4a857)" }}>
                    BEST VALUE — SAVE 20%
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    {t("pricing_active")}
                  </div>
                )}

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: plan.popular
                      ? "linear-gradient(135deg, #1B8FA0, #6EC6C6)"
                      : "linear-gradient(135deg, #C9963A, #d4a857)",
                  }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-white/40 mb-5">{plan.tagline}</p>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-bold">${plan.priceUsd}</span>
                  <span className="text-white/40 text-sm">{t("pricing_one_time")}</span>
                </div>
                <p className="text-sm font-semibold mb-6" style={{ color: plan.popular ? "#6EC6C6" : "#C9963A" }}>
                  Just ${perRender.toFixed(2)} per render
                </p>

                <div className="mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wide">{t("pricing_includes")}</div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/60">{t("pricing_full_gens")}</span>
                    <span className="text-sm font-bold" style={{ color: "#1B8FA0" }}>{fullGens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{t("pricing_finetune_edits")}</span>
                    <span className="text-sm font-bold" style={{ color: "#C9963A" }}>{plan.credits}</span>
                  </div>
                  <div className="text-[10px] text-white/25 mt-2">({plan.credits} {t("pricing_credits_total")})</div>
                </div>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={isCurrentPlan || purchasing === plan.id}
                  className={`w-full py-3.5 rounded-2xl font-semibold mb-6 transition-all ${
                    isCurrentPlan
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : "text-white hover:opacity-90 active:opacity-75"
                  }`}
                  style={
                    isCurrentPlan
                      ? {}
                      : plan.popular
                      ? { background: "linear-gradient(135deg, #1B8FA0, #6EC6C6)" }
                      : { background: "linear-gradient(135deg, #C9963A, #d4a857)" }
                  }
                >
                  {purchasing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("pricing_loading")}
                    </span>
                  ) : isCurrentPlan ? t("pricing_current_plan")
                    : `${t("pricing_get")} ${plan.name}`
                  }
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white/70">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="text-center text-sm text-white/35 max-w-2xl mx-auto mb-16">
          <p>{t("pricing_note")}</p>
        </div>

        {/*
          For Businesses — section header above two B2B vertical cards.
          The cards use mailto: for now; real API/integration is roadmap.
          Personal pricing above is self-serve via Stripe; this is contact-led.
        */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{
              background: "rgba(201,150,58,0.08)",
              border: "1px solid rgba(201,150,58,0.25)",
            }}
          >
            <span className="text-eyebrow uppercase text-[#D4A857]">For Businesses</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Stage thousands of listings.
            <span className="block text-white/45">Or embed Ambient Space in your store.</span>
          </h2>
          <p className="text-white/55 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
            For real-estate platforms, e-commerce retailers, and home-decor brands.
            Volume pricing, API access, and white-label embeds available.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {/* Real Estate vertical */}
          <button
            type="button"
            onClick={() => openSales("pricing_real_estate")}
            className="group relative rounded-3xl p-8 border transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl text-left"
            style={{
              borderColor: "rgba(27,143,160,0.35)",
              background: "rgba(27,143,160,0.05)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(27,143,160,0.18)" }}
            >
              <Building2 className="w-6 h-6 text-accent-teal-light" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real Estate Platforms</h3>
            <p className="text-sm text-white/55 leading-relaxed mb-5">
              Stage every listing automatically. Show buyers what their future home
              could look like — not just empty walls.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Bulk staging — 100s of listings/month",
                "Multiple style variations per property",
                "Commercial license, no watermark",
                "API & CSV bulk upload",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/65">
                  <Check className="w-4 h-4 text-accent-teal-light mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-[11px] uppercase tracking-wider text-white/30 mb-4">
              Immowelt · ImmoScout · Zillow · Rightmove
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-teal-light group-hover:gap-3 transition-all">
              <span>Talk to sales</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </button>

          {/* E-commerce vertical */}
          <button
            type="button"
            onClick={() => openSales("pricing_retailer")}
            className="group relative rounded-3xl p-8 border transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl text-left"
            style={{
              borderColor: "rgba(201,150,58,0.35)",
              background: "rgba(201,150,58,0.05)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(201,150,58,0.18)" }}
            >
              <ShoppingBag className="w-6 h-6 text-[#D4A857]" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Retailers & E-commerce</h3>
            <p className="text-sm text-white/55 leading-relaxed mb-5">
              Embed Ambient Space on your product pages. Let shoppers see your sofa,
              lamp, or rug in their actual room before they buy.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "JavaScript SDK / iframe embed",
                "Branded with your logo + colors",
                "Volume-based per-render pricing",
                "Conversion analytics dashboard",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/65">
                  <Check className="w-4 h-4 text-[#D4A857] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-[11px] uppercase tracking-wider text-white/30 mb-4">
              Amazon · IKEA · Wayfair · Article
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#D4A857] group-hover:gap-3 transition-all">
              <span>Talk to sales</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </button>
        </div>

        {/* Generic contact fallback */}
        <div className="text-center text-sm text-white/35 max-w-xl mx-auto">
          <p>
            Different use case in mind?{" "}
            <button
              type="button"
              onClick={() => openSales("other")}
              className="text-accent-teal-light hover:text-white transition-colors underline-offset-2 hover:underline"
            >
              Talk to us
            </button>
          </p>
        </div>
      </div>

      {/* Day 9.1 — Talk to sales modal. Tailored title/subtitle per source. */}
      <ContactSalesModal
        open={salesModal.open}
        onClose={closeSales}
        source={salesModal.source || "other"}
        title={
          salesModal.source === "pricing_real_estate" ? "Talk to our real estate team" :
          salesModal.source === "pricing_retailer"    ? "Talk to our retail team" :
          "Talk to sales"
        }
        subtitle={
          salesModal.source === "pricing_real_estate" ? "Tell us about your platform and listing volume — we'll get back within one business day." :
          salesModal.source === "pricing_retailer"    ? "Tell us about your store and what you'd like to embed — we'll be in touch within one business day." :
          "Tell us about your use case — we'll get back within one business day."
        }
        accentColor={salesModal.source === "pricing_retailer" ? "#C9963A" : "#1B8FA0"}
      />
    </div>
  );
}