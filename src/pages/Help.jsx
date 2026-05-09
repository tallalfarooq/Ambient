import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Sparkles, ArrowLeft } from "lucide-react";
import ContactSalesModal from "@/components/ContactSalesModal";

/**
 * /Help — public FAQ stub.
 *
 * Day 11. QA-9 flagged that the product had no help/FAQ surface — users with
 * basic questions ("why did the walls change?", "how do I get a refund?",
 * "what does a credit cost?") had no answer reachable from inside the app.
 * This stub covers the top 8 questions we already see in feedback / sales
 * conversations. The "Talk to us" button at the bottom opens the same
 * ContactSalesModal used on /Pricing so support requests have a single path.
 *
 * Intentionally a stub — when we have a real KB, swap to Notion-embed or
 * something fancier. Until then, plain prose answers are better than
 * "no help page at all".
 */

const FAQ = [
  {
    q: "Why did the AI change my walls?",
    a: "We work hard to preserve walls, ceiling, floor, windows, and doors — that's the whole point of \"redesign, not replace\". We pre-read your room's actual paint colors with computer vision and lock them in the prompt. If the result still drifts, click \"Retry at no cost\" — that re-runs with the strongest preservation profile and doesn't burn another credit. If it's still wrong, message us with the source photo and we'll investigate.",
  },
  {
    q: "What does a credit cost?",
    a: "1 full AI generation = 2 credits. 1 fine-tune edit (e.g. \"make the sofa darker\") = 1 credit. So 20 credits buys up to 10 full generations, or up to 20 fine-tunes, or any mix in between. Credits never expire.",
  },
  {
    q: "How long does a render take?",
    a: "Typically 25–35 seconds for a single render. \"Compare 4 styles\" runs the four in parallel and finishes in roughly the same time, since the bottleneck is the model — not the network.",
  },
  {
    q: "Can I get a refund?",
    a: "We don't offer automatic refunds on credit packs because credits never expire — you can come back any time. If you bought a pack by mistake (e.g. wrong account) or your renders failed because of a problem on our side, message us within 30 days and we'll make it right.",
  },
  {
    q: "Do you ever train on my photos?",
    a: "No. Your photos are stored privately in our Supabase storage bucket so the renders can be retrieved later. They are not used to train any AI model. Renders you delete are removed from the bucket within 24 hours.",
  },
  {
    q: "What styles do you support?",
    a: "Eight: Japandi, Scandinavian, Mid-Century Modern, Industrial, Boho, Modern Minimal, Cottagecore, and Art Deco. You can also mix two styles together with the blend slider in the wizard.",
  },
  {
    q: "Why did my generation fail / score low?",
    a: "Most common causes: (1) the source photo was blurry or had unusual perspective; try a straight-on shot in good light. (2) The style you picked has very strong color priors that compete with your wall color (Industrial → cream/brick, Boho → terracotta) — try \"Modern Minimal\" or \"Scandinavian\" first as a sanity check. (3) Brief network glitch — click \"Retry at no cost\".",
  },
  {
    q: "Can I use this for my real-estate / e-commerce business?",
    a: "Yes — that's our B2B offering. We do bulk staging for real-estate platforms, and we have an embeddable widget for furniture retailers (\"see this sofa in your room\"). Use the Talk to sales link below or the form on /Pricing.",
  },
];

function FaqItem({ q, a, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/8 py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-6 text-left"
      >
        <h3 className="text-base sm:text-lg font-semibold text-white pr-2">{q}</h3>
        <ChevronDown
          className={`w-5 h-5 text-white/40 flex-shrink-0 mt-1 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-white/65 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function Help() {
  const [salesOpen, setSalesOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/Home"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.25)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#1B8FA0" }} />
            <span className="text-xs font-semibold" style={{ color: "#1B8FA0" }}>Help & FAQ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Common questions</h1>
          <p className="text-white/55 text-base leading-relaxed">
            Quick answers to what people usually ask. If yours isn't here, the
            "Talk to us" button at the bottom goes to a real human.
          </p>
        </div>

        <div className="rounded-3xl px-6 sm:px-8 py-2 mb-10"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />
          ))}
        </div>

        <div className="text-center">
          <p className="text-white/45 text-sm mb-4">Didn't find what you were looking for?</p>
          <button
            onClick={() => setSalesOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-opacity hover:opacity-90 text-sm text-white"
            style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
          >
            Talk to us
          </button>
        </div>
      </div>

      <ContactSalesModal
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        source="help_page"
      />
    </div>
  );
}
