import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Image as ImageIcon, Box, Loader2, Camera, Sparkles, X, CheckCircle2 } from "lucide-react";

const ROOM_TYPES = ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Home Office", "Bathroom", "Hallway", "Kids Room", "Outdoor"];

const ROOM_ICONS = {
  "Living Room": "🛋️", "Bedroom": "🛏️", "Kitchen": "🍳", "Dining Room": "🍽️",
  "Home Office": "💻", "Bathroom": "🚿", "Hallway": "🚪", "Kids Room": "🧸", "Outdoor": "🌿",
};

export default function StepUpload({ data, update, onNext }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(data.room_image_url);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef   = useRef();
  const cameraRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const isImage = file.type.startsWith("image/");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (isImage) { update({ room_image_url: file_url }); setPreview(file_url); }
    else          { update({ room_file_url: file_url }); }
    setUploading(false);
  };

  const clearPreview = (e) => {
    e.stopPropagation();
    setPreview(null);
    update({ room_image_url: null });
  };

  const canContinue = data.room_image_url || data.room_file_url;

  return (
    <div className="space-y-6">

      {/* ── Drop zone ── */}
      <div
        onClick={() => !uploading && fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
        style={{
          minHeight: 240,
          border: `1.5px dashed ${dragOver ? "rgba(27,143,160,0.8)" : preview ? "rgba(27,143,160,0.5)" : "rgba(255,255,255,0.1)"}`,
          background: dragOver
            ? "radial-gradient(ellipse at center, rgba(27,143,160,0.1) 0%, rgba(0,0,0,0) 80%)"
            : preview ? "transparent" : "rgba(255,255,255,0.015)",
        }}
      >
        <input ref={fileRef} type="file" className="hidden" accept="image/*,.obj,.gltf,.glb"
          onChange={(e) => handleFile(e.target.files[0])} />
        <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment"
          onChange={(e) => handleFile(e.target.files[0])} />

        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(27,143,160,0.15)" }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#1B8FA0" }} />
            </div>
            <p className="text-white/40 text-sm">Uploading your photo…</p>
          </div>
        ) : preview ? (
          <>
            <img src={preview} alt="Room" className="w-full h-60 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              onClick={clearPreview}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-xs font-semibold">Photo uploaded</span>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
              style={{ background: dragOver ? "rgba(27,143,160,0.2)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Upload className="w-6 h-6" style={{ color: dragOver ? "#1B8FA0" : "rgba(255,255,255,0.35)" }} />
            </div>
            <div>
              <p className="text-white/80 font-semibold text-base mb-1">
                {dragOver ? "Release to upload" : "Drop your room photo here"}
              </p>
              <p className="text-white/30 text-xs">JPG, PNG, HEIC · Up to 20MB</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.2)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "#1B8FA0" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(110,198,198,0.8)" }}>AI analyzes your space automatically</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload actions ── */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.6)" }}
        >
          <ImageIcon className="w-4 h-4" /> Upload photo
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); cameraRef.current.click(); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(27,143,160,0.12)", border: "1px solid rgba(27,143,160,0.3)", color: "#6EC6C6" }}
        >
          <Camera className="w-4 h-4" /> Take a photo
        </button>
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
          title="3D scan coming soon"
        >
          <Box className="w-4 h-4" />
        </div>
      </div>

      {/* ── Room type ── */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Room Type</p>
        <div className="grid grid-cols-3 gap-2">
          {ROOM_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => update({ room_type: type })}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
              style={{
                background: data.room_type === type ? "rgba(27,143,160,0.18)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${data.room_type === type ? "rgba(27,143,160,0.45)" : "rgba(255,255,255,0.07)"}`,
                color: data.room_type === type ? "#6EC6C6" : "rgba(255,255,255,0.45)",
              }}
            >
              <span>{ROOM_ICONS[type]}</span>
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        style={{
          background: canContinue ? "linear-gradient(135deg, #1B8FA0, #C9963A)" : "rgba(27,143,160,0.25)",
          boxShadow: canContinue ? "0 8px 28px rgba(27,143,160,0.3)" : "none",
        }}
      >
        {canContinue ? "Continue to Style →" : "Upload a photo to continue"}
      </button>

    </div>
  );
}