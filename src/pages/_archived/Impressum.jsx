export default function Impressum() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Legal Notice</h1>
        <p className="text-white/40 text-sm mb-8">Information pursuant to § 5 TMG</p>

        <section className="space-y-6 text-white/60 text-sm leading-relaxed">

          <div>
            <h2 className="text-white font-semibold mb-1">Service Provider</h2>
            <p>AmbientSpace AI<br />ambientspace.ai</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Contact</h2>
            <p>Email: <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>support@ambientspace.ai</a></p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Disclaimer</h2>
            <p>Despite careful review, we accept no liability for the content of external links. The operators of linked pages are solely responsible for their content.</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Affiliate Links</h2>
            <p>This website contains affiliate links to Amazon, IKEA, and eBay.</p>
          </div>

        </section>
      </div>
    </div>
  );
}