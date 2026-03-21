import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Sparkles, Crown, Zap, Loader2, Calculator, ChevronRight } from "lucide-react";
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

// Credit calculator logic
function CreditCalculator() {
  const [fullGens, setFullGens] = useState(5);
  const [fineTunes, setFineTunes] = useState(10);

  const totalCredits = fullGens * 2 + fineTunes * 1;

  const recommendedPlan = totalCredits <= 2
    ? PLANS[0]
    : totalCredits <= 20
    ? PLANS[1]
    : totalCredits <= 100
    ? PLANS[2]
    : null; // custom — needs pro+ multiple packs

  const estimatedCost = totalCredits <= 2
    ? "€0"
    : totalCredits <= 20
    ? "€5"
    : totalCredits <= 100
    ? "€20"
    : `€${Math.ceil(totalCredits / 100) * 20}`;

  return (
    <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.3)" }}>
          <Calculator className="w-4 h-4" style={{ color: "#1B8FA0" }} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Credit Calculator</h3>
          <p className="text-xs text-white/40">Estimate how many credits you need</p>
        </div>
      </div>

      <div className="px-8 py-6 grid md:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-7">
          {/* Full generations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">Full AI Generations</p>
                <p className="text-xs text-white/40 mt-0.5">New room renders from your photo</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" style={{ color: "#1B8FA0" }}>{fullGens}</span>
                <span className="text-xs text-white/30">× 2 credits</span>
              </div>
            </div>
            <input
              type="range" min={0} max={50} value={fullGens}
              onChange={(e) => setFullGens(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: "#1B8FA0" }}
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>0</span><span>50</span>
            </div>
          </div>

          {/* Fine-tune edits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">Fine-Tune Edits</p>
                <p className="text-xs text-white/40 mt-0.5">Wall color, sofa, floor, ceiling tweaks</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" style={{ color: "#C9963A" }}>{fineTunes}</span>
                <span className="text-xs text-white/30">× 1 credit</span>
              </div>
            </div>
            <input
              type="range" min={0} max={100} value={fineTunes}
              onChange={(e) => setFineTunes(parseInt(e.target.value))}
              className="w-full" style={{ accentColor: "#C9963A" }}
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>0</span><span>100</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col justify-center">
          <div className="rounded-2xl p-6 border border-white/8" style={{ background: "rgba(27,143,160,0.05)" }}>
            {/* Credit breakdown */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Full gens ({fullGens} × 2)</span>
                <span className="text-white font-semibold">{fullGens * 2} credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fine-tunes ({fineTunes} × 1)</span>
                <span className="text-white font-semibold">{fineTunes} credits</span>
              </div>
              <div className="h-px bg-white/10 my-3" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-white">Total credits needed</span>
                <span className="text-lg font-bold" style={{ color: "#1B8FA0" }}>{totalCredits}</span>
              </div>
            </div>

            {/* Recommendation */}
            {recommendedPlan ? (
              <div className="rounded-xl p-4 border" style={{ background: "rgba(27,143,160,0.1)", borderColor: "rgba(27,143,160,0.3)" }}>
                <p className="text-xs text-white/50 mb-1">Recommended plan</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{recommendedPlan.name}</p>
                    <p className="text-xs text-white/40">{recommendedPlan.credits} credits included</p>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "#1B8FA0" }}>{estimatedCost}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-4 border" style={{ background: "rgba(201,150,58,0.1)", borderColor: "rgba(201,150,58,0.3)" }}>
                <p className="text-xs text-white/50 mb-1">For heavy usage</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Multiple Pro packs</p>
                    <p className="text-xs text-white/40">{Math.ceil(totalCredits / 100)} × Pro = {Math.ceil(totalCredits / 100) * 100} credits</p>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "#C9963A" }}>{estimatedCost}</span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/25 mt-3 text-center">Credits never expire</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

        {/* Credit Calculator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.25)" }}>
            <Calculator className="w-4 h-4" style={{ color: "#C9963A" }} />
            <span className="text-sm font-semibold" style={{ color: "#C9963A" }}>Not sure which plan fits?</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Custom Credit Calculator</h2>
          <p className="text-white/40 text-sm">Tell us how much you plan to design — we'll show you exactly what you need.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <CreditCalculator />
        </motion.div>

        {/* FAQ note */}
        <div className="text-center text-sm text-white/35 max-w-2xl mx-auto">
          <p>
            Credits never expire. Full AI generation = 2 credits. Fine-tune edits (wall color, sofa, floor, ceiling) = 1 credit each.
            Pro users get AI product matching from generated renders.
          </p>
        </div>
      </div>
    </div>
  );
}
