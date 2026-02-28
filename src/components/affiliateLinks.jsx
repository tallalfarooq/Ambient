const AMAZON_TAG = "projectambient-21";
const EBAY_DE_MKRID = "707-53477-19255-0";
const EBAY_CAMPID = "YOUR_EBAY_CAMP_ID"; // Replace with your eBay Partner Network campaign ID
const IKEA_DE_CAMREF = "YOUR_DE_CAMREF";  // Replace with your Partnerize DE camref

/**
 * Takes a match object and returns an affiliate-ready URL for the German market.
 */
export function buildAffiliateUrl(match) {
  const { title, source, url } = match;
  const encoded = encodeURIComponent(title);

  switch (source) {
    case "Amazon": {
      const baseUrl = url && url.includes("amazon")
        ? url.replace("amazon.co.uk", "amazon.de").replace("amazon.com", "amazon.de")
        : `https://www.amazon.de/s?k=${encoded}`;
      try {
        const u = new URL(baseUrl);
        u.searchParams.set("tag", AMAZON_TAG);
        return u.toString();
      } catch {
        return `https://www.amazon.de/s?k=${encoded}&tag=${AMAZON_TAG}`;
      }
    }

    case "IKEA": {
      const ikeaTarget = url
        ? url.replace("/gb/en/", "/de/de/")
        : `https://www.ikea.com/de/de/search/?q=${encoded}`;
      return `https://prf.hn/click/camref:${IKEA_DE_CAMREF}/destination:${encodeURIComponent(ikeaTarget)}`;
    }

    case "eBay": {
      const base = url && url.includes("ebay")
        ? url.replace("ebay.co.uk", "ebay.de")
        : `https://www.ebay.de/sch/i.html?_nkw=${encoded}`;
      return `${base}&mkevt=1&mkcid=1&mkrid=${EBAY_DE_MKRID}&campid=${EBAY_CAMPID}&toolid=10050`;
    }

    default:
      return `https://www.amazon.de/s?k=${encoded}&tag=${AMAZON_TAG}`;
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