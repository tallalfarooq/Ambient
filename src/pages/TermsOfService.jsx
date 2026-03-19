export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Acceptance</h2>
            <p>By using AmbientSpace AI, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. What We Offer</h2>
            <p>AmbientSpace AI lets you upload room photos, generate AI-powered design renders, and discover furniture products from third-party retailers.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. Accounts</h2>
            <p>You sign in using your Google account. You must be at least 16 years old to use the service. You are responsible for activity under your account.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Credits & Payments</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>AI generations require credits. Each generation costs 2 credits.</li>
              <li>Credits are purchased as one-time payments and do not expire.</li>
              <li>Payments are processed by Stripe. We do not store payment details.</li>
              <li>Used credits are non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Your Content</h2>
            <p>You own the images you upload. By uploading, you give us permission to process them solely to provide the service. We do not share your images or use them to train AI models.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. AI Designs</h2>
            <p>Generated room renders are for inspiration only — not professional design or architectural advice. Product prices and availability are sourced from third parties and may vary.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Affiliate Links</h2>
            <p>Some product links are affiliate links. We may earn a commission on purchases at no extra cost to you.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Prohibited Use</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Do not upload illegal or offensive content.</li>
              <li>Do not abuse or attempt to reverse-engineer the AI system.</li>
              <li>Do not resell generated designs without permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">9. Disclaimer</h2>
            <p>The service is provided "as is". We are not liable for any damages arising from use of AI-generated designs or third-party product links.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">10. Changes</h2>
            <p>We may update these terms at any time. Continued use of the service means you accept the updated terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">11. Contact</h2>
            <p>Questions? Contact us at: <a href="mailto:support@ambientspace.ai" className="underline" style={{ color: "#1B8FA0" }}>support@ambientspace.ai</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}