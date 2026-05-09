import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";
// Day 11 — pull from canonical catalog so Home advertises the same 8 styles
// the server actually accepts. Removed "Coastal" (was advertised but not
// implemented) and added "Cottagecore" (was implemented but not advertised).
import { STYLES as CANON_STYLES } from "@/lib/styles";

/**
 * StyleGallery — 8-tile grid showing every supported design style.
 *
 * Layout: 2 columns on mobile, 4 columns on desktop. Each tile is an interior
 * photo with the style name overlaid. On hover the image scales 5% and the
 * descriptor text fades in. The whole grid is the "look at how diverse the
 * outputs are" proof point.
 */
const STYLES = CANON_STYLES.map((s) => ({
  name: s.label,
  descriptor: s.desc,
  // Galleries want larger thumbnails than the wizard does, so swap w=400→w=800.
  image: s.img.replace(/[?&]w=\d+/, '?auto=format&fit=crop&w=800&q=80'),
}));

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
