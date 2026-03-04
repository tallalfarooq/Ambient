const AMAZON_TAG = "ambient019-21";

/**
 * Takes a match object and returns a working URL for the German market.
 * Always uses search-based links to avoid broken ASIN/article number links from AI hallucinations.
 */
export function buildAffiliateUrl(match) {
  const { title, source, asin } = match;
  const encoded = encodeURIComponent(title);

  switch (source) {
    case "Amazon":
      // Use direct /dp/ link when we have a real ASIN — tag stays on product page
      if (asin) return `https://www.amazon.de/dp/${asin}?tag=${AMAZON_TAG}`;
      // Fallback to search with tag + linkCode so tag is preserved
      return `https://www.amazon.de/s?k=${encoded}&tag=${AMAZON_TAG}&linkCode=ur2`;

    case "IKEA":
      return `https://www.ikea.com/de/de/search/?q=${encoded}`;

    case "eBay":
      return `https://www.ebay.de/sch/i.html?_nkw=${encoded}`;

    default:
      return `https://www.amazon.de/s?k=${encoded}&tag=${AMAZON_TAG}&linkCode=ur2`;
  }
}

/**
 * Returns CTA label and Tailwind classes per retailer.
 */
export function getSourceCTA(source) {
  switch (source) {
    case "Amazon": return { label: "View on Amazon", className: "bg-[#FF9900] hover:bg-[#e68a00] text-black font-bold" };
    case "IKEA":   return { label: "Shop at IKEA",   className: "bg-[#0058A3] hover:bg-[#004a8a] text-white font-bold" };
    case "eBay":   return { label: "Find on eBay",   className: "bg-[#E53238] hover:bg-[#c62a2f] text-white font-bold" };
    default:       return { label: "Shop Now",        className: "bg-violet-500 hover:bg-violet-400 text-white font-bold" };
  }
}