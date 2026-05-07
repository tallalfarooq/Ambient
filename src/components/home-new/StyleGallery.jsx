import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";

/**
 * StyleGallery — 8-tile grid showing every supported design style.
 *
 * Layout: 2 columns on mobile, 4 columns on desktop. Each tile is an interior
 * photo with the style name overlaid. On hover the image scales 5% and the
 * descriptor text fades in. The whole grid is the "look at how diverse the
 * outputs are" proof point.
 */

const STYLES = [
  {
    name: "Japandi",
    descriptor: "Minimal · Organic · Serene",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Mid-Century",
    descriptor: "Retro · Warm · Timeless",
    image:
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Scandinavian",
    descriptor: "Light · Airy · Functional",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Modern Minimal",
    descriptor: "Clean · Bold · Functional",
    image:
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Industrial",
    descriptor: "Raw · Urban · Textured",
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Bohemian",
    descriptor: "Warm · Layered · Earthy",
    image:
      "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Art Deco",
    descriptor: "Glamorous · Bold · Geometric",
    image:
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Coastal",
    descriptor: "Breezy · Soft · Natural",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  },
];

function StyleTile({ name, descriptor, image }) {
  return (
    <div className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/8 cursor-pointer transition-all duration-500 ease-apple hover:border-white/20 hover:shadow-2xl">
      <img
        src={image}
        alt={`${name} interior style`}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
      />
      {/* Always-visible bottom gradient + style name */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
      />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h3 className="text-white font-bold text-[18px] sm:text-[20px] tracking-tight">
          {name}
        </h3>
        <p className="text-caption text-white/0 group-hover:text-white/65 transition-colors duration-500 ease-apple mt-1">
          {descriptor}
        </p>
      </div>
    </div>
  );
}

export default function StyleGallery() {
  return (
    <section className="relative py-24 sm:py-section-mobile lg:py-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-2xl mb-16 sm:mb-20">
          <EyebrowText color="gold">Design styles</EyebrowText>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              Eight design styles.{" "}
              <span className="block text-white/40">Try them all in 5 minutes.</span>
            </DisplayHeading>
          </div>
          <p className="mt-6 text-body-lg text-white/55 max-w-xl leading-relaxed">
            From minimalist Japandi to glamorous Art Deco — Ambient Space gives you a
            fully-rendered version of your room in any style, side by side.
          </p>
        </MotionSection>

        <MotionSection
          stagger
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
        >
          {STYLES.map((style) => (
            <MotionSection.Item key={style.name}>
              <StyleTile {...style} />
            </MotionSection.Item>
          ))}
        </MotionSection>
      </div>
    </section>
  );
}
