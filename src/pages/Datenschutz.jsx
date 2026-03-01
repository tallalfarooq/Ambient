export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Datenschutzerklärung</h1>
        <p className="text-white/40 text-sm mb-8">Gemäß DSGVO (EU) 2016/679</p>

        <div className="space-y-8 text-white/60 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold mb-2">1. Verantwortlicher</h2>
            <p>Project Ambient GmbH, Musterstraße 1, 10115 Berlin – hello@projectambient.de</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">2. Erhobene Daten</h2>
            <p>Wir verarbeiten nur die Daten, die Sie uns aktiv mitteilen (z. B. bei der Erstellung eines Designprojekts) sowie technisch notwendige Daten (z. B. IP-Adresse, Browser-Typ) für den Betrieb des Dienstes.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">3. Cookies & Tracking</h2>
            <p className="mb-3">Wir unterscheiden zwischen drei Kategorien:</p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-white/80">Notwendig:</strong> Technisch erforderlich für den Betrieb. Keine Zustimmung erforderlich.</li>
              <li><strong className="text-white/80">Funktional:</strong> Speichert Ihre Einstellungen und Designpräferenzen.</li>
              <li><strong className="text-white/80">Marketing:</strong> Affiliate-Tracking-Cookies von Amazon (Amazon Associates), IKEA (Partnerize) und eBay (eBay Partner Network). Diese werden nur geladen, wenn Sie Ihre ausdrückliche Einwilligung erteilt haben.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">4. Affiliate-Programme</h2>
            <p>Diese Website nimmt an folgenden Affiliate-Programmen teil:</p>
            <ul className="space-y-2 mt-2 list-disc list-inside">
              <li><strong className="text-white/80">Amazon Associates:</strong> Amazon.de setzt Cookies, um Käufe zu verfolgen. Datenschutzrichtlinie: amazon.de/privacy</li>
              <li><strong className="text-white/80">IKEA / Partnerize:</strong> prf.hn setzt Tracking-Cookies. Datenschutzrichtlinie: ikea.com/de/de/customer-service/privacy-policy/</li>
              <li><strong className="text-white/80">eBay Partner Network:</strong> eBay.de setzt Cookies zur Konversionsmessung. Datenschutzrichtlinie: ebay.de/help/policies/member-behaviour-policies/datenschutzerklarung</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">5. Einwilligungsprotokoll</h2>
            <p>Wir speichern einen anonymisierten Nachweis Ihrer Cookie-Entscheidung (ohne personenbezogene Daten) um unsere DSGVO-Pflichten zu erfüllen.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">6. Ihre Rechte</h2>
            <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontakt: hello@projectambient.de</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">7. Beschwerderecht</h2>
            <p>Sie haben das Recht, sich bei einer Datenschutzbehörde zu beschweren. Zuständig für Berlin: Berliner Beauftragte für Datenschutz und Informationsfreiheit, Alt-Moabit 59–61, 10555 Berlin.</p>
          </section>

        </div>
      </div>
    </div>
  );
}