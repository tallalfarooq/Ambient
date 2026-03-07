import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, ExternalLink, FileDown, Trash2, ShoppingBag } from "lucide-react";
import { jsPDF } from "jspdf";

const SOURCE_COLORS = {
  Amazon:  "text-orange-400 bg-orange-400/10 border-orange-400/20",
  IKEA:    "text-blue-400 bg-blue-400/10 border-blue-400/20",
  eBay:    "text-red-400 bg-red-400/10 border-red-400/20",
  Thrift:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export default function CartDrawer({ items, isOpen, onClose, onRemove }) {
  const [exporting, setExporting] = useState(false);

  const cartItems = items
    .filter((item) => item.selected_match_index != null && item.matches?.[item.selected_match_index])
    .map((item) => ({
      ...item,
      selectedMatch: item.matches[item.selected_match_index],
    }));

  const total = cartItems.reduce((sum, item) => sum + (item.selectedMatch?.price || 0), 0);

  const handleExportPDF = async () => {
    setExporting(true);
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text("Ambient – My Furniture List", 20, 22);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated ${new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}`, 20, 30);

    doc.setDrawColor(220, 220, 220);
    doc.line(20, 35, 190, 35);

    let y = 45;
    cartItems.forEach((item, i) => {
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(`${i + 1}. ${item.label}`, 20, y);
      y += 6;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const match = item.selectedMatch;
      doc.text(`${match.source}  ·  €${match.price?.toLocaleString() || "–"}`, 20, y);
      y += 5;

      doc.setTextColor(100, 100, 200);
      doc.textWithLink(match.url || match.title, 20, y, { url: match.url || "" });
      y += 10;

      if (i < cartItems.length - 1) {
        doc.setDrawColor(240, 240, 240);
        doc.line(20, y - 2, 190, y - 2);
      }
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Estimated Total: €${total.toLocaleString()}`, 20, y);

    y += 8;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("*Affiliate links. Prices are indicative and may change. Ambient earns a small commission.", 20, y);

    doc.save("ambient-furniture-list.pdf");
    setExporting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#111114] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-violet-400" />
                <h2 className="font-semibold text-sm">My Cart</h2>
                <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{cartItems.length}</span>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/30 text-sm max-w-[200px]">Select a match on a furniture item to add it here.</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const match = item.selectedMatch;
                  return (
                    <div key={item.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 flex gap-3">
                      {/* Image */}
                      {match.image_url && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0">
                          <img src={match.image_url} alt={match.title} className="w-full h-full object-contain p-1" onError={(e) => e.target.style.display = "none"} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-medium text-white/80 leading-snug line-clamp-2">{match.title}</p>
                          <button
                            onClick={() => onRemove(item.id)}
                            className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-white/35 mb-2">{item.label}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${SOURCE_COLORS[match.source] || "text-white/40 bg-white/5 border-white/10"}`}>
                              {match.source}
                            </span>
                            <span className="text-sm font-bold text-white">€{match.price?.toLocaleString()}</span>
                          </div>
                          {match.url && (
                            <a
                              href={match.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              Shop <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="px-5 py-4 border-t border-white/8 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Estimated total</span>
                  <span className="font-bold text-lg">€{total.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  {exporting ? "Generating PDF…" : "Export as PDF"}
                </button>
                <p className="text-white/20 text-xs text-center">*Affiliate links. Prices may change.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}