const AMAZON_TAG = "projectambient-21"; // UK Associates tag

/**
 * Takes a match object and returns an affiliate-ready URL.
 */
export function buildAffiliateUrl(match) {
  const { title, source, url } = match;
  const encoded = encodeURIComponent(title);

  switch (source) {
    case "Amazon": {
      if (url && url.includes("amazon")) {
        try {
          const u = new URL(url);
          u.searchParams.set("tag", AMAZON_TAG);
          return u.toString();
        } catch {
          // fall through
        }
      }
      return `https://www.amazon.co.uk/s?k=${encoded}&tag=${AMAZON_TAG}`;
    }

    case "IKEA": {
      const ikeaTarget = url || `https://www.ikea.com/gb/en/search/?q=${encoded}`;
      // Partnerize deep-link wrapper
      return `https://prf.hn/click/camref:1100lqLXl/destination:${encodeURIComponent(ikeaTarget)}`;
    }

    case "eBay": {
      const base = url && url.includes("ebay") ? url : `https://www.ebay.co.uk/sch/i.html?_nkw=${encoded}`;
      return base;
    }

    default:
      return url || `https://www.amazon.co.uk/s?k=${encoded}&tag=${AMAZON_TAG}`;
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