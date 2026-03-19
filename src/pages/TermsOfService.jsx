export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using AmbientSpace AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. The Service is operated by Project Ambient GmbH, Berlin, Germany.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Description of Service</h2>
            <p>AmbientSpace AI provides an AI-powered interior design platform that allows users to upload room photos, generate design renders, and discover furniture products from third-party retailers.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. User Accounts</h2>
            <p>You may sign in using your Google account. You are responsible for maintaining the security of your account and for all activities that occur under your account. You must be at least 16 years old to use the Service.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Credits & Payments</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Credits are required to generate AI room designs. Each generation costs 2 credits.</li>
              <li>Credits are purchased as one-time payments and do not expire.</li>
              <li>All payments are processed securely by Stripe. We do not store your payment details.</li>
              <li>Credits are non-refundable once used for a generation.</li>
              <li>We reserve the right to change credit pricing with reasonable notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. User Content</h2>
            <p>You retain ownership of any images you upload. By uploading content, you grant us a limited licence to process that content solely to provide the Service (e.g. generating your design render). We do not use your images to train AI models or share them with third parties.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. AI-Generated Content</h2>
            <p>AI-generated room renders are provided for inspiration purposes only. They are not architectural plans or professional design advice. Product matches and prices are sourced from third-party retailers and may not always be accurate or available.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Affiliate Links</h2>
            <p>Some product links are affiliate links. We may earn a commission if you purchase through these links, at no extra cost to you. This does not influence our product recommendations.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">8. Prohibited Use</h2>
            <p>You may not use the Service to:</p>
            <ul className="space-y-2 list-disc list-inside mt-2">
              <li>Upload illegal, offensive, or infringing content.</li>
              <li>Attempt to reverse-engineer or abuse the AI generation system.</li>
              <li>Resell or redistribute generated renders without our written consent.</li>
              <li>Use automated tools to access the Service at scale.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">9. Limitation of Liability</h2>
            <p>The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the Service, including reliance on AI-generated designs or product recommendations.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of significant changes by email where possible.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">11. Governing Law</h2>
            <p>These Terms are governed by the laws of Germany. Any disputes shall be subject to the jurisdiction of the courts of Berlin.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">12. Contact</h2>
            <p>For questions about these Terms: hello@projectambient.de</p>
          </section>

        </div>
      </div>
    </div>
  );
}