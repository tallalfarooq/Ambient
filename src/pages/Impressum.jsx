export default function Impressum() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Impressum</h1>

        <section className="space-y-6 text-white/60 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-semibold mb-1">Angaben gemäß § 5 TMG</h2>
            <p>Project Ambient GmbH<br />
            Musterstraße 1<br />
            10115 Berlin<br />
            Deutschland</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Kontakt</h2>
            <p>E-Mail: hello@projectambient.de<br />
            Telefon: +49 (0) 30 000000</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Vertreten durch</h2>
            <p>Geschäftsführer: [Name eintragen]</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Handelsregister</h2>
            <p>Registergericht: Amtsgericht Berlin-Charlottenburg<br />
            Registernummer: HRB [Nummer eintragen]</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Umsatzsteuer-ID</h2>
            <p>USt-IdNr.: DE[Nummer eintragen] (gemäß § 27a UStG)</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Haftungshinweis</h2>
            <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-1">Affiliate-Links</h2>
            <p>Diese Website enthält Affiliate-Links zu Amazon, IKEA und eBay. Bei Käufen über diese Links erhalten wir eine kleine Provision, ohne dass für Sie Mehrkosten entstehen.</p>
          </div>
        </section>
      </div>
    </div>
  );
}