import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Scan, Sparkles, ShoppingBag, Recycle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Scan,
    title: "3D Room Capture",
    desc: "Upload your Magicplan scan or a simple room photo to create your digital twin.",
    color: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-500",
  },
  {
    icon: Sparkles,
    title: "AI Style Generation",
    desc: "Pick a design style and watch Stable Diffusion paint your room with photorealistic furniture.",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-500",
  },
  {
    icon: ShoppingBag,
    title: "Visual Match Shopping",
    desc: "Every AI-generated piece is matched to real Amazon, IKEA & eBay listings by visual similarity.",
    color: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: Recycle,
    title: "Pre-Loved Toggle",
    desc: "Filter for thrift & second-hand options — great design doesn't have to cost the earth.",
    color: "from-sky-500/10 to-cyan-500/10",
    iconColor: "text-sky-500",
  },
];

const styles = [
  { name: "Japandi", emoji: "🪴", desc: "Calm. Natural. Intentional." },
  { name: "Industrial", emoji: "⚙️", desc: "Raw. Bold. Unfinished." },
  { name: "Boho", emoji: "🌿", desc: "Layered. Textured. Wanderlust." },
  { name: "Modern Minimal", emoji: "◻️", desc: "Clean. Purposeful. Airy." },
  { name: "Cottagecore", emoji: "🌸", desc: "Soft. Nostalgic. Cozy." },
  { name: "Mid-Century Modern", emoji: "🪑", desc: "Iconic. Warm. Timeless." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-hidden">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Powered by Stable Diffusion 3 Medium
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Your dream room,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              generated & shoppable
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            Scan your room. Pick a style. Watch AI design it — then shop every
            piece from Amazon, IKEA, or thrift stores in one click.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={createPageUrl("Studio")}
              className="group flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all duration-200 text-sm"
            >
              Start designing free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to={createPageUrl("Projects")}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/80 font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-200 text-sm"
            >
              View my projects
            </Link>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-12 bg-gradient-to-b from-white/0 to-white/20" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Scan. Design. Shop.
          </h2>
          <p className="text-white/40 text-lg">The entire interior design pipeline, condensed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`bg-gradient-to-br ${f.color} border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 ${f.iconColor}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Style Gallery */}
      <section className="px-6 py-24 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">6 design worlds to explore</h2>
            <p className="text-white/40">Each style is a fully trained LoRA model.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {styles.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                viewport={{ once: true }}
                className="group relative bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/20 hover:bg-white/6 transition-all duration-300 cursor-pointer"
              >
                <div className="text-3xl mb-3">{s.emoji}</div>
                <div className="font-semibold text-sm mb-1">{s.name}</div>
                <div className="text-white/35 text-xs">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
            From "I like this room" to{" "}
            <span className="text-violet-400">everything in my cart</span> — in 5 minutes.
          </h2>
          <Link
            to={createPageUrl("Studio")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-10 py-4 rounded-2xl hover:opacity-90 transition-opacity text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Open the Studio
          </Link>
        </motion.div>
      </section>
    </div>
  );
}