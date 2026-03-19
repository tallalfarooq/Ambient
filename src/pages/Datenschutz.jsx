export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Privacy Notice (GDPR)</h1>
        <p className="text-white/40 text-sm mb-8">In accordance with GDPR (EU) 2016/679 — Last updated: March 2026</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Data Controller</h2>
            <p>AmbientSpace AI — <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>support@ambientspace.ai</a></p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Data We Collect</h2>
            <p>We only process data you actively provide (e.g. when creating a design project) and technically necessary data (e.g. IP address, browser type) required to operate the service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. Cookies & Tracking</h2>
            <p className="mb-3">We distinguish between three categories:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Necessary:</strong> Technically required to operate the service. No consent needed.</li>
              <li><strong className="text-white/80">Functional:</strong> Stores your settings and design preferences.</li>
              <li><strong className="text-white/80">Marketing:</strong> Affiliate tracking cookies from Amazon, IKEA, and eBay — only loaded with your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Affiliate Programs</h2>
            <p>This website participates in the following affiliate programs:</p>
            <ul className="space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-white/80">Amazon Associates:</strong> Amazon sets cookies to track purchases. Privacy policy: amazon.com/privacy</li>
              <li><strong className="text-white/80">IKEA / Partnerize:</strong> Partnerize sets tracking cookies. Privacy policy: ikea.com/privacy</li>
              <li><strong className="text-white/80">eBay Partner Network:</strong> eBay sets conversion tracking cookies. Privacy policy: ebay.com/help/policies/privacy-policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Consent Log</h2>
            <p>We store an anonymized record of your cookie consent choice (no personal data) to fulfill our GDPR obligations.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Your Rights</h2>
            <p>You have the right to access, rectify, delete, restrict processing, and object to processing of your data. Contact us at: <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>support@ambientspace.ai</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}