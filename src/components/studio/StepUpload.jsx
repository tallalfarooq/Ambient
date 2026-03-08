import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Image as ImageIcon, Box, Loader2, Camera } from "lucide-react";
import ScaleCalibrator from "./ScaleCalibrator";

export default function StepUpload({ data, update, onNext }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(data.room_image_url);
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

  const canContinue = data.room_image_url || data.room_file_url;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Upload your room</h2>
      <p className="text-white/40 text-sm mb-8">
        Drop a photo or a 3D scan file (.obj / .gltf) from Magicplan or iOS RoomPlan.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        className="relative border-2 border-dashed border-white/15 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/50 hover:bg-white/3 transition-all duration-300 min-h-[260px]"
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.obj,.gltf,.glb"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {/* Camera capture input — opens rear camera on mobile */}
        <input
          ref={cameraRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        ) : preview ? (
          <img src={preview} alt="Room preview" className="w-full h-48 object-cover rounded-2xl" />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-white/40" />
            </div>
            <p className="text-white/60 font-medium">Click or drag & drop</p>
            <p className="text-white/25 text-xs mt-1">JPG, PNG, OBJ, GLTF, GLB</p>
          </>
        )}
      </div>

      {/* Scale calibration overlay — only shown after image upload */}
      {preview && (
        <ScaleCalibrator
          imageUrl={preview}
          calibration={data.scale_calibration || null}
          onCalibrate={(cal) => update({ scale_calibration: cal })}
        />
      )}

      {/* Or type labels */}
      <div className="flex gap-3 mt-4">
        <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white/50">
          <ImageIcon className="w-3.5 h-3.5" /> Room photo
        </div>
        <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white/50">
          <Box className="w-3.5 h-3.5" /> 3D scan file
        </div>
      </div>

      {/* Room dims */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {["width", "length", "height"].map((dim) => (
          <div key={dim}>
            <label className="text-xs text-white/40 block mb-1 capitalize">{dim} (m)</label>
            <input
              type="number"
              step="0.1"
              value={data.room_dimensions[dim]}
              onChange={(e) =>
                update({ room_dimensions: { ...data.room_dimensions, [dim]: parseFloat(e.target.value) } })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
            />
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="mt-8 w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors"
      >
        Continue
      </button>
    </div>
  );
}