import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

const buildPrompt = (data) => {
  const dims = data.room_dimensions;
  return `Interior design photograph, ${data.style} style, ${data.color_palette} color palette, ` +
    `photorealistic room render, ${dims.width}m x ${dims.length}m x ${dims.height}m room, ` +
    `natural lighting, high-end furniture, ultra-detailed, 8K, architectural photography style, ` +
    `ControlNet depth guidance, layered furniture placement, magazine quality`;
};

export default function StepGenerate({ data, update, onBack, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(data.generated_render_url || null);
  const [prompt, setPrompt] = useState(buildPrompt(data));

  const generate = async () => {
    setLoading(true);
    const fileUrls = [data.room_image_url].filter(Boolean);
    const result = await base44.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: fileUrls.length > 0 ? fileUrls : undefined,
    });
    setGenerated(result.url);
    update({ generated_render_url: result.url, generation_prompt: prompt });
    setLoading(false);
  };

  const handleProceed = () => {
    onComplete({ generated_render_url: generated, generation_prompt: prompt, status: "ready" });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Generate your design</h2>
      <p className="text-white/40 text-sm mb-6">
        Stable Diffusion 3 Medium will paint your room in the <strong className="text-white/70">{data.style}</strong> style.
      </p>

      {/* Prompt editor */}
      <div className="mb-6">
        <label className="text-xs text-white/40 block mb-2">Generation prompt (editable)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
        />
      </div>

      {/* Preview area */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 mb-6 min-h-[280px] flex items-center justify-center bg-white/3">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-white/40 text-sm">Generating with SD3 Medium…</p>
          </div>
        ) : generated ? (
          <img src={generated} alt="Generated room" className="w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 p-10">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-white/30 text-sm">Your AI render will appear here</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={onBack} className="bg-white/5 border border-white/10 text-white/70 px-6 py-4 rounded-2xl hover:bg-white/8 transition-colors font-medium">
          Back
        </button>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-white/8 border border-white/15 text-white/80 px-6 py-4 rounded-2xl hover:bg-white/12 transition-colors disabled:opacity-40 font-medium"
        >
          {generated ? <><RefreshCw className="w-4 h-4" /> Regenerate</> : <><Sparkles className="w-4 h-4" /> Generate</>}
        </button>
        {generated && (
          <button
            onClick={handleProceed}
            className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
          >
            Shop this look →
          </button>
        )}
      </div>
    </div>
  );
}