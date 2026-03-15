import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Sparkles, Crown, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    credits: 2,
    icon: Sparkles,
    color: "from-gray-500 to-gray-600",
    features: [
      "1 free AI generation",
      "All 8 design styles",
      "HD image download",
      "Basic support"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    price: "€5",
    credits: 20,
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    popular: true,
    features: [
      "20 AI generations",
      "All 8 design styles",
      "HD image download",
      "Priority support",
      "Before/after comparison",
      "Custom prompts"
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
      "100 AI generations",
      "All 8 design styles",
      "HD image download",
      "Priority support",
      "Before/after comparison",
      "Custom prompts",
      "AI product matching from renders",
      "Unlimited saves & shares"
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
      const response = await base44.functions.invoke('createCheckout', { plan: planId });
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Start free, upgrade when you need more. Each generation costs 2 credits.
          </p>
        </div>

        {/* Current plan indicator */}
        {credits && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-sm text-white/50">Current plan:</span>
              <span className="text-sm font-semibold text-white capitalize">{credits.plan_type}</span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-sm text-violet-400 font-semibold">{credits.credits_remaining} credits remaining</span>
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
                className={`relative rounded-3xl p-8 border transition-all ${
                  plan.popular
                    ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-purple-500/5"
                    : "border-white/10 bg-white/3 hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold">
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

                <div className="mb-6">
                  <div className="text-sm text-white/60 mb-1">Credits included:</div>
                  <div className="text-2xl font-bold text-violet-400">{plan.credits}</div>
                  <div className="text-xs text-white/40 mt-1">= {Math.floor(plan.credits / 2)} AI generations</div>
                </div>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={isCurrentPlan || purchasing === plan.id || (plan.id === "free" && user)}
                  className={`w-full py-3 rounded-2xl font-semibold mb-6 transition-all ${
                    isCurrentPlan
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : plan.popular
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {purchasing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </span>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : plan.id === "free" && user ? (
                    "Already Used"
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

        {/* Info note */}
        <div className="text-center text-sm text-white/40 max-w-2xl mx-auto">
          <p>
            Each AI design generation costs 2 credits. Credits never expire and can be used anytime.
            Pro users get exclusive access to AI product matching from their generated renders.
          </p>
        </div>
      </div>
    </div>
  );
}