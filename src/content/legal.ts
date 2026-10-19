// Legal pages (German only). Company facts from qvinterio.de/impressum and
// qvinterio.de/datenschutz; the privacy text describes how this site works
// (static hosting, local fonts, login via Supabase, no analytics).

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalPage = { title: string; sections: LegalSection[] };

export const imprint: LegalPage = {
  title: "Impressum",
  sections: [
    {
      heading: "Angaben gemäß § 5 DDG",
      paragraphs: [
        "QVINTERIO GmbH\nFerdinand-Clasen-Straße 4-6\n41812 Erkelenz",
        "Weitere Standorte:\nLaufamholzstraße 116, 90482 Nürnberg\nBiebricher Allee 79, 65187 Wiesbaden",
      ],
    },
    { heading: "Vertreten durch", paragraphs: ["Jörg Hitschfel, Patrick Meister"] },
    {
      heading: "Kontakt",
      paragraphs: ["Ansprechpartner: Patrick Meister\nTelefon: +49 911 47550 103\nE-Mail: kontakt@qvinterio.de"],
    },
    { heading: "Registereintrag", paragraphs: ["Registergericht: Amtsgericht Nürnberg\nRegisternummer: HRB 35931"] },
    {
      heading: "Umsatzsteuer-ID",
      paragraphs: ["Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE322690095"],
    },
    {
      heading: "Haftung für Inhalte",
      paragraphs: [
        "Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.",
      ],
    },
    {
      heading: "Haftung für Links",
      paragraphs: [
        "Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte übernehmen wir keine Gewähr; verantwortlich ist stets der jeweilige Anbieter oder Betreiber der Seiten. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.",
      ],
    },
    {
      heading: "Urheberrecht",
      paragraphs: [
        "Die auf diesen Seiten erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung der QVINTERIO GmbH. Soweit Inhalte nicht von uns erstellt wurden, werden die Urheberrechte Dritter beachtet.",
        "Bildrechte: QVINTERIO GmbH, Shutterstock",
      ],
    },
  ],
};

export const privacy: LegalPage = {
  title: "Datenschutzerklärung",
  sections: [
    {
      heading: "1. Verantwortliche Stelle",
      paragraphs: [
        "QVINTERIO GmbH\nIn der Finstermail 20\n90482 Nürnberg\nTelefon: +49 911 47550-100\nE-Mail: kontakt@qvinterio.de",
      ],
    },
    {
      heading: "2. Datenschutzbeauftragter",
      paragraphs: [
        "Jörg Hitschfel, QVINTERIO GmbH\nIn der Finstermail 20, 90482 Nürnberg\nTelefon: +49 911 47550-100\nE-Mail: kontakt@qvinterio.de",
      ],
    },
    {
      heading: "3. Hosting und Server-Logfiles",
      paragraphs: [
        "Diese Website wird über GitHub Pages (GitHub, Inc., USA) bereitgestellt. Beim Aufruf der Seiten verarbeitet der Hoster automatisch technische Daten, die Ihr Browser übermittelt: IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene Seite, Referrer-URL, Browsertyp und -version sowie Betriebssystem. Diese Daten sind für die Auslieferung und Sicherheit der Website erforderlich und werden nicht mit anderen Datenquellen zusammengeführt.",
        "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einer stabilen und sicheren Website. Eine Übermittlung in die USA erfolgt auf Grundlage geeigneter Garantien (EU-U.S. Data Privacy Framework bzw. EU-Standardvertragsklauseln).",
      ],
    },
    {
      heading: "4. Bilder und Schriftarten",
      paragraphs: [
        "Referenzbilder werden von unserem eigenen Server qvinterio.de geladen; dabei wird Ihre IP-Adresse an diesen Server übertragen. Schriftarten sind lokal in die Website eingebunden, es findet keine Verbindung zu Servern von Google Fonts statt.",
      ],
    },
    {
      heading: "5. Kundenzugang und Mitarbeiter-Login",
      paragraphs: [
        "Für den passwortgeschützten Bereich (Kundenzugang, Mitarbeiter- und Verwaltungs-Login) nutzen wir den Dienst Supabase (Supabase, Inc.). Verarbeitet werden Ihre E-Mail-Adresse, ein verschlüsseltes Passwort sowie die Inhalte, die im Rahmen des Bauprojekts bereitgestellt werden, zum Beispiel Baufortschritt, Fotos und Bestellungen. Damit Sie angemeldet bleiben, wird ein Sitzungsschlüssel im lokalen Speicher Ihres Browsers abgelegt; er wird beim Abmelden gelöscht.",
        "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Kundenzugänge sind zeitlich befristet; die Daten werden gelöscht, sobald sie für das Projekt und gesetzliche Aufbewahrungspflichten nicht mehr erforderlich sind.",
      ],
    },
    {
      heading: "6. Kontakt per E-Mail oder Telefon",
      paragraphs: [
        "Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben zur Bearbeitung der Anfrage und für Anschlussfragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit einem Vertrag zusammenhängt, andernfalls Art. 6 Abs. 1 lit. f DSGVO. Die Daten werden nicht ohne Ihre Einwilligung weitergegeben und gelöscht, sobald der Zweck entfällt.",
      ],
    },
    {
      heading: "7. Cookies und Analyse",
      paragraphs: [
        "Diese Website setzt keine Analyse- oder Werbe-Tools und keine Tracking-Cookies ein. Gespeichert wird nur der für die Anmeldung notwendige Sitzungsschlüssel (siehe Abschnitt 5).",
      ],
    },
    {
      heading: "8. SSL- bzw. TLS-Verschlüsselung",
      paragraphs: [
        "Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an „https://“ in der Adresszeile Ihres Browsers.",
      ],
    },
    {
      heading: "9. Ihre Rechte",
      paragraphs: [
        "Sie haben jederzeit das Recht auf Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Sie können einer Verarbeitung auf Grundlage berechtigter Interessen widersprechen (Art. 21) und eine erteilte Einwilligung jederzeit widerrufen.",
        "Außerdem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Wenden Sie sich für alle Anliegen gern an die oben genannte verantwortliche Stelle.",
      ],
    },
    {
      heading: "10. Widerspruch gegen Werbe-E-Mails",
      paragraphs: [
        "Der Nutzung der im Impressum veröffentlichten Kontaktdaten zur Übersendung nicht ausdrücklich angeforderter Werbung wird hiermit widersprochen.",
      ],
    },
    { heading: "Stand", paragraphs: ["Oktober 2026"] },
  ],
};
