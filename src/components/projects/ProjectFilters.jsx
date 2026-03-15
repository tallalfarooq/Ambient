import { X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STYLES = ["Japandi", "Industrial", "Boho", "Modern Minimal", "Cottagecore", "Scandi", "Art Deco", "Mid-Century Modern"];
const ROOM_TYPES = ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Home Office", "Bathroom", "Hallway", "Kids Room", "Outdoor"];
const BUDGET_RANGES = [
  { label: "Under €500", min: 0, max: 500 },
  { label: "€500 - €1,000", min: 500, max: 1000 },
  { label: "€1,000 - €2,500", min: 1000, max: 2500 },
  { label: "€2,500 - €5,000", min: 2500, max: 5000 },
  { label: "€5,000+", min: 5000, max: 999999 },
];

export default function ProjectFilters({ filters, onFiltersChange, totalCount, filteredCount }) {
  const activeFilterCount = 
    (filters.styles?.length || 0) + 
    (filters.roomTypes?.length || 0) + 
    (filters.budgetRange ? 1 : 0);

  const toggleStyle = (style) => {
    const current = filters.styles || [];
    const updated = current.includes(style)
      ? current.filter((s) => s !== style)
      : [...current, style];
    onFiltersChange({ ...filters, styles: updated });
  };

  const toggleRoomType = (type) => {
    const current = filters.roomTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, roomTypes: updated });
  };

  const setBudgetRange = (range) => {
    onFiltersChange({ ...filters, budgetRange: range });
  };

  const clearFilters = () => {
    onFiltersChange({ styles: [], roomTypes: [], budgetRange: null });
  };

  return (
    <div className="mb-6">
      {/* Filter summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <SlidersHorizontal className="w-4 h-4" />
            <span>
              Showing {filteredCount} of {totalCount} design{totalCount !== 1 ? 's' : ''}
            </span>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="space-y-4">
        {/* Style filters */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Design Style</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((style) => {
              const isActive = filters.styles?.includes(style);
              return (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Room type filters */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Room Type</label>
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map((type) => {
              const isActive = filters.roomTypes?.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleRoomType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget range filters */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Budget Range</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_RANGES.map((range) => {
              const isActive = 
                filters.budgetRange?.min === range.min && 
                filters.budgetRange?.max === range.max;
              return (
                <button
                  key={range.label}
                  onClick={() => setBudgetRange(isActive ? null : range)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}