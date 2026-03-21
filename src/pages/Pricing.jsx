import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Sparkles, Crown, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "free",
    name: "Starter",
    price: "€0",
    credits: 2,
    icon: Sparkles,
    color: "from-gray-500 to-gray-600",
    features: [
      "1 free AI generation (2 credits)",
      "All 8 design styles",
      "Watermarked renders",
      "Basic support"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    price: "€5",
    credits: 20,
    icon: Zap,
    color: "from-teal-500 to-cyan-600",
    popular: true,
    features: [
      "10 full AI generations",
      "20 fine-tune edits",
      "All 8 design styles",
      "HD download (no watermark)",
      "Before/after comparison",
      "Priority support"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: "€20",
    credits: 100,
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    features: [
      "50 full AI generations",
      "100 fine-tune edits",
      "All 8 design styles",
      "HD download (no watermark)",
      "AI product matching from renders",
      "Before/after comparison",
      "Unlimited saves & shares",
      "Priority support"
    ]
  }
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const userCredits = await base44.entities.UserCredits.filter({ user_email: currentUser.email });
        if (userCredits.length > 0) {
          setCredits(userCredits[0]);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handlePurchase = async (planId) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setPurchasing(planId);
    try {
      const response = await base44.functions.invoke('createCheckout', { plan: planId, returnUrl: window.location.origin });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
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
            <span className="text-sm font-semibold" style={{ color: "#1B8FA0" }}>Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Your first AI design is free. Buy credits when you need more — they never expire.
          </p>
        </div>

        {/* Credit cost legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(27,143,160,0.08)", border: "1px solid rgba(27,143,160,0.2)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#1B8FA0" }} />
            <span className="text-sm text-white/70"><strong className="text-white">2 credits</strong> per full generation</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#C9963A" }} />
            <span className="text-sm text-white/70"><strong className="text-white">1 credit</strong> per fine-tune edit</span>
          </div>
        </div>

        {/* Current plan indicator */}
        {credits && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-sm text-white/50">Current plan:</span>
              <span className="text-sm font-semibold text-white capitalize">{credits.plan_type}</span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-sm font-semibold" style={{ color: "#1B8FA0" }}>{credits.credits_remaining} credits remaining</span>
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrentPlan = credits?.plan_type === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-3xl p-8 border transition-all hover:border-white/20"
                style={plan.popular
                  ? { borderColor: "rgba(27,143,160,0.4)", background: "rgba(27,143,160,0.05)" }
                  : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }
                }
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
                    MOST POPULAR
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    Active
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.id !== "free" && <span className="text-white/40 text-sm">one-time</span>}
                </div>

                <div className="mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wide">Includes</div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/60">Full generations</span>
                    <span className="text-sm font-bold" style={{ color: "#1B8FA0" }}>{Math.floor(plan.credits / 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Fine-tune edits</span>
                    <span className="text-sm font-bold" style={{ color: "#C9963A" }}>{plan.credits}</span>
                  </div>
                  <div className="text-[10px] text-white/25 mt-2">({plan.credits} credits total)</div>
                </div>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={isCurrentPlan || purchasing === plan.id || (plan.id === "free" && user)}
                  className={`w-full py-3 rounded-2xl font-semibold mb-6 transition-all ${
                    isCurrentPlan || (plan.id === "free" && user)
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : plan.popular
                      ? "text-white hover:opacity-90"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                  style={plan.popular && !isCurrentPlan ? { background: "linear-gradient(135deg, #1B8FA0, #C9963A)" } : {}}
                >
                  {purchasing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </span>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : plan.id === "free" && user ? (
                    "Sign up to claim"
                  ) : plan.id === "free" ? (
                    "Get started free"
                  ) : (
                    `Get ${plan.name}`
                  )}
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

        {/* Bottom note + business contact */}
        <div className="text-center text-sm text-white/35 max-w-2xl mx-auto mb-6">
          <p>Credits never expire. Full AI generation = 2 credits. Fine-tune edits = 1 credit each.</p>
        </div>

        <div className="rounded-2xl border border-white/8 px-8 py-6 text-center max-w-xl mx-auto" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-sm font-semibold text-white mb-1">Need custom credits or a business plan?</p>
          <p className="text-sm text-white/40 mb-4">For high-volume usage, agencies, or enterprise — reach out and we'll sort you out.</p>
          <a
            href="mailto:support@ambientspace.ai"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(27,143,160,0.12)", border: "1px solid rgba(27,143,160,0.3)", color: "#1B8FA0" }}
          >
            support@ambientspace.ai
          </a>
        </div>
      </div>
    </div>
  );
}
