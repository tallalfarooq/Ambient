export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. About This Service</h2>
            <p>AmbientSpace AI is an AI-powered interior design platform. This privacy policy explains what data we collect and how we use it.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Data We Collect</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Account data:</strong> Your name and email address when you sign in with Google.</li>
              <li><strong className="text-white/80">Room images:</strong> Photos you upload to generate AI designs.</li>
              <li><strong className="text-white/80">Design preferences:</strong> Style, budget, and room type selections you make.</li>
              <li><strong className="text-white/80">Technical data:</strong> Basic usage and browser data required to operate the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. How We Use Your Data</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To generate AI room design renders based on your inputs.</li>
              <li>To save and manage your design projects.</li>
              <li>To process payments via Stripe.</li>
              <li>To maintain and improve the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Google Sign-In</h2>
            <p>We use Google OAuth for authentication. We receive only your name and email — never your password. Your use of Google sign-in is also subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1B8FA0" }}>Google's Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Cookies</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Necessary:</strong> Required for the service to function.</li>
              <li><strong className="text-white/80">Functional:</strong> Remembers your preferences.</li>
              <li><strong className="text-white/80">Marketing:</strong> Affiliate tracking from Amazon, IKEA, and eBay — only with your consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Affiliate Links</h2>
            <p>Some product links are affiliate links. We may earn a small commission if you purchase through them, at no extra cost to you.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Data Sharing</h2>
            <p>We do not sell your data. We only share data with service providers needed to run the platform (e.g. Stripe for payments, AI providers for image generation).</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Contact</h2>
            <p>For any privacy questions, contact us at: <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>support@ambientspace.ai</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}