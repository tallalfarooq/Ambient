export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Who We Are</h2>
            <p>AmbientSpace AI is an AI-powered interior design platform operated by Project Ambient GmbH, Musterstraße 1, 10115 Berlin, Germany. Contact: hello@projectambient.de</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Data We Collect</h2>
            <p className="mb-2">We collect the following data when you use our service:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Account data:</strong> Name and email address provided when you sign in via Google.</li>
              <li><strong className="text-white/80">Room images:</strong> Photos you upload to generate AI room designs.</li>
              <li><strong className="text-white/80">Design preferences:</strong> Style, budget, and room type selections.</li>
              <li><strong className="text-white/80">Technical data:</strong> IP address, browser type, and usage logs necessary for operating the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. How We Use Your Data</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To generate AI-powered room design renders based on your inputs.</li>
              <li>To match furniture items to real products from online retailers.</li>
              <li>To save and manage your design projects.</li>
              <li>To process payments securely via Stripe.</li>
              <li>To improve and maintain the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Google Sign-In</h2>
            <p>We use Google OAuth for authentication. When you sign in with Google, we receive your name and email address. We do not receive or store your Google password. Your use of Google sign-in is subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1B8FA0" }}>Google's Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Cookies & Tracking</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Necessary:</strong> Required for the service to function. No consent needed.</li>
              <li><strong className="text-white/80">Functional:</strong> Stores your design preferences and settings.</li>
              <li><strong className="text-white/80">Marketing:</strong> Affiliate tracking cookies from Amazon, IKEA, and eBay — only loaded with your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Affiliate Partnerships</h2>
            <p>We participate in affiliate programs with Amazon Associates, IKEA/Partnerize, and eBay Partner Network. When you click a product link, these services may set cookies to track purchases. This does not affect the price you pay.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Data Sharing</h2>
            <p>We do not sell your personal data. We share data only with service providers necessary to operate the platform (e.g. Stripe for payments, AI providers for image generation). All providers are bound by data processing agreements.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Data Retention</h2>
            <p>We retain your account and design data for as long as your account is active. You may request deletion at any time by contacting us at hello@projectambient.de.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">9. Your Rights (GDPR)</h2>
            <p>You have the right to access, correct, delete, restrict processing of, and port your personal data. You also have the right to object to processing. Contact us at hello@projectambient.de to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">10. Contact</h2>
            <p>For privacy inquiries: hello@projectambient.de<br />Supervisory authority: Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59–61, 10555 Berlin.</p>
          </section>

        </div>
      </div>
    </div>
  );
}