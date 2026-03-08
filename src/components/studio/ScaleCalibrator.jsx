import { useState, useRef, useEffect, useCallback } from "react";
import { Ruler, X, Check, RotateCcw } from "lucide-react";

/**
 * ScaleCalibrator
 * Lets users draw a line on the room image and label it with a real-world measurement.
 * Calls onCalibrate({ pixels, meters, label }) when confirmed.
 */
export default function ScaleCalibrator({ imageUrl, calibration, onCalibrate }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const [mode, setMode]       = useState("idle"); // idle | drawing | done
  const [start, setStart]     = useState(null);
  const [end, setEnd]         = useState(null);
  const [meters, setMeters]   = useState("");
  const [label, setLabel]     = useState("door");
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  // Draw line on canvas whenever points change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!start) return;
    const current = end || start;

    // Line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(current.x, current.y);
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoint dots
    [start, current].forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#a78bfa";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Pixel length label (shown while drawing)
    if (end) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const px = Math.round(Math.sqrt(dx * dx + dy * dy));
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2 - 12;
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#c4b5fd";
      ctx.textAlign = "center";
      ctx.fillText(`${px}px`, mx, my);
    }
  }, [start, end]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // Scale from CSS size to canvas pixel size
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  const onMouseDown = (e) => {
    if (mode !== "drawing") return;
    setStart(getPos(e));
    setEnd(null);
  };

  const onMouseMove = (e) => {
    if (mode !== "drawing" || !start) return;
    setEnd(getPos(e));
  };

  const onMouseUp = () => {
    if (mode === "drawing" && start && end) setMode("done");
  };

  const handleConfirm = () => {
    if (!start || !end || !meters) return;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    onCalibrate({ pixels, meters: parseFloat(meters), label });
    setMode("idle");
  };

  const handleReset = () => {
    setStart(null);
    setEnd(null);
    setMode("idle");
    setMeters("");
    onCalibrate(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const pixelLength = start && end
    ? Math.round(Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2))
    : null;

  return (
    <div className="mt-5 rounded-2xl border border-white/10 overflow-hidden bg-white/3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2 text-sm font-medium text-white/70">
          <Ruler className="w-4 h-4 text-violet-400" />
          Scale calibration
          <span className="text-white/30 text-xs font-normal">(optional)</span>
        </div>
        {calibration && (
          <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" /> {calibration.meters}m = {Math.round(calibration.pixels)}px
          </span>
        )}
      </div>

      {/* Canvas overlay on image */}
      <div className="relative select-none">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Room"
          className="w-full h-auto block"
          onLoad={onImgLoad}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={imgSize.w}
          height={imgSize.h}
          className={`absolute inset-0 w-full h-full ${mode === "drawing" ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={(e) => { e.preventDefault(); onMouseDown(e); }}
          onTouchMove={(e)  => { e.preventDefault(); onMouseMove(e); }}
          onTouchEnd={onMouseUp}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-3 space-y-3">
        {mode === "idle" && (
          <button
            onClick={() => { setMode("drawing"); setStart(null); setEnd(null); }}
            className="w-full flex items-center justify-center gap-2 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 text-violet-300 text-sm py-2.5 rounded-xl transition-all"
          >
            <Ruler className="w-3.5 h-3.5" />
            Draw a reference line
          </button>
        )}

        {mode === "drawing" && (
          <p className="text-center text-white/40 text-xs py-1">
            Click and drag on the image to draw your reference line
          </p>
        )}

        {mode === "done" && (
          <div className="space-y-3">
            <p className="text-xs text-white/40">Line drawn: <span className="text-violet-400">{pixelLength}px</span>. Now enter the real-world length.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-white/40 block mb-1">Real length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  placeholder="e.g. 2.0"
                  value={meters}
                  onChange={(e) => setMeters(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-white/40 block mb-1">What is it?</label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="door">Door</option>
                  <option value="window">Window</option>
                  <option value="sofa">Sofa</option>
                  <option value="table">Table</option>
                  <option value="wall">Wall</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Redo
              </button>
              <button
                onClick={handleConfirm}
                disabled={!meters || parseFloat(meters) <= 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Confirm scale
              </button>
            </div>
          </div>
        )}

        {calibration && mode === "idle" && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/50 py-1 transition-colors"
          >
            <X className="w-3 h-3" /> Remove calibration
          </button>
        )}
      </div>
    </div>
  );
}