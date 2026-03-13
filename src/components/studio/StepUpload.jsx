import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Image as ImageIcon, Box, Loader2, Camera, Sparkles, X } from "lucide-react";
import ScaleCalibrator from "./ScaleCalibrator";

const TIPS = [
  {
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=120&q=70",
    label: "Living room",
  },
  {
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=120&q=70",
    label: "Kitchen",
  },
  {
    img: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=120&q=70",
    label: "Bedroom",
  },
];

export default function StepUpload({ data, update, onNext }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(data.room_image_url);
  const [dragOver, setDragOver] = useState(false);
  const fileRef   = useRef();
  const cameraRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const isImage = file.type.startsWith("image/");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (isImage) {
      update({ room_image_url: file_url });
      setPreview(file_url);
    } else {
      update({ room_file_url: file_url });
    }
    setUploading(false);
  };

  const clearPreview = (e) => {
    e.stopPropagation();
    setPreview(null);
    update({ room_image_url: null });
  };

  const canContinue = data.room_image_url || data.room_file_url;

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className="relative rounded-3xl cursor-pointer transition-all duration-300 min-h-[260px] flex flex-col items-center justify-center overflow-hidden"
        style={{
          border: `2px dashed ${dragOver ? "rgba(124,58,237,0.7)" : preview ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.12)"}`,
          background: dragOver
            ? "radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, rgba(0,0,0,0) 70%)"
            : preview
            ? "transparent"
            : "rgba(255,255,255,0.02)",
          boxShadow: dragOver ? "0 0 40px rgba(124,58,237,0.2)" : "none",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.obj,.gltf,.glb"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
              </div>
            </div>
            <p className="text-white/50 text-sm font-medium">Uploading…</p>
          </div>
        ) : preview ? (
          <>
            <img src={preview} alt="Room preview" className="w-full h-56 object-cover rounded-2xl" />
            <button
              onClick={clearPreview}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-white/80 text-xs font-medium">Ready to transform</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 py-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
              style={{ background: dragOver ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)" }}
            >
              <Upload className="w-7 h-7" style={{ color: dragOver ? "#a78bfa" : "rgba(255,255,255,0.3)" }} />
            </div>
            <div>
              <p className="text-white/70 font-semibold text-base">
                {dragOver ? "Drop it!" : "Drop your room photo here"}
              </p>
              <p className="text-white/30 text-xs mt-1">JPG, PNG · or OBJ / GLTF for 3D scans</p>
            </div>

            {/* Example thumbnails */}
            <div className="flex gap-2 mt-1">
              {TIPS.map((t) => (
                <div key={t.label} className="relative rounded-xl overflow-hidden w-[72px] h-[54px] opacity-50 group-hover:opacity-70 transition-opacity">
                  <img src={t.img} alt={t.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-1">
                    <span className="text-[9px] text-white/80 font-medium">{t.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-violet-300 text-[11px] font-medium">AI analyzes your space automatically</span>
            </div>
          </div>
        )}
      </div>

      {/* Scale calibration overlay */}
      {preview && (
        <ScaleCalibrator
          imageUrl={preview}
          calibration={data.scale_calibration || null}
          onCalibrate={(cal) => update({ scale_calibration: cal })}
        />
      )}

      {/* Action chips */}
      <div className="flex gap-2.5 mt-4 flex-wrap">
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium border transition-all"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Upload photo
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); cameraRef.current.click(); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium border transition-all"
          style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)", color: "#a78bfa" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; }}
        >
          <Camera className="w-3.5 h-3.5" /> Take a photo
        </button>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium border"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
        >
          <Box className="w-3.5 h-3.5" /> 3D scan file
        </div>
      </div>

      {/* Room dims */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {["width", "length", "height"].map((dim) => (
          <div key={dim}>
            <label className="text-[11px] font-semibold text-white/35 block mb-1.5 uppercase tracking-wider">{dim} (m)</label>
            <input
              type="number"
              step="0.1"
              value={data.room_dimensions[dim]}
              onChange={(e) =>
                update({ room_dimensions: { ...data.room_dimensions, [dim]: parseFloat(e.target.value) } })
              }
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="mt-7 w-full text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: canContinue ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(124,58,237,0.3)",
          boxShadow: canContinue ? "0 8px 24px rgba(124,58,237,0.35)" : "none",
        }}
      >
        {canContinue ? "Continue →" : "Upload a photo to continue"}
      </button>
    </div>
  );
}
