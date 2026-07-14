import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { PreVenteCta } from "./pre-vente-cta";
import { isStripeConfigured, getStripeMode } from "@/lib/stripe";
import styles from "./pre-vente.module.css";

export const metadata: Metadata = {
  title: "Pré-vente fondateur · IA vocale 24/7 pour cabinets",
  description:
    "Offre fondateur Augmenta : 29 €/mois les 3 premiers mois, puis 49 €/mois. IA vocale 24/7, dossiers patients HDS, télétransmission. 30 places.",
  alternates: { canonical: "https://www.augmenta.care/pre-vente" },
  openGraph: {
    title: "Augmenta — Votre cabinet sur pilote automatique",
    description:
      "L'IA vocale 24/7 qui décroche, qualifie vos patients et gère vos RDV. 30 places fondateur à 29 €/mois.",
    url: "https://www.augmenta.care/pre-vente",
    siteName: "Augmenta.care",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.augmenta.care/og-pre-vente.png",
        width: 1200,
        height: 630,
        alt: "Augmenta — Pré-vente fondateur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Augmenta — Votre cabinet sur pilote automatique",
    description:
      "L'IA vocale 24/7 qui décroche, qualifie vos patients et gère vos RDV.",
    images: ["https://www.augmenta.care/og-pre-vente.png"],
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Augmenta — Pré-vente fondateur",
  description:
    "Logiciel IA vocale 24/7 pour cabinets d'ostéopathes, chiropracteurs, sophrologues et naturopathes.",
  brand: { "@type": "Brand", name: "Augmenta" },
  offers: [
    {
      "@type": "Offer",
      name: "Mensuel fondateur",
      price: "29",
      priceCurrency: "EUR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/LimitedAvailability",
    },
    {
      "@type": "Offer",
      name: "Annuel fondateur",
      price: "290",
      priceCurrency: "EUR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/LimitedAvailability",
    },
  ],
};

const FEATURES = [
  {
    icon: "📞",
    title: "L'IA décroche à votre place",
    text: "Appel entrant → qualification motif (douleur, suivi, urgence) → proposition de créneau. Transféré à vous uniquement si nécessaire.",
  },
  {
    icon: "📋",
    title: "Vos dossiers se remplissent tout seuls",
    text: "Dossiers patients HDS, dictée vocale des comptes-rendus, rappel SMS automatiques 24h avant chaque RDV.",
  },
  {
    icon: "💶",
    title: "Vous êtes payé automatiquement",
    text: "Télétransmission FSE, suivi impayés, export comptable. Vous facturez, on encaisse.",
  },
] as const;

type TrustPillar = {
  icon: string;
  title: string;
  text: string;
  links?: ReadonlyArray<{ href: string; label: string }>;
};

const TRUST_PILLARS: ReadonlyArray<TrustPillar> = [
  {
    icon: "🏥",
    title: "HDS & RGPD santé",
    text: "Données stockées chez Clever Cloud, hébergeur certifié Hébergeur de Données de Santé. Conforme RGPD, audité ANSSI.",
    links: [
      {
        href: "https://www.clever-cloud.com/fr/hebergeur-de-donnees-de-sante/",
        label: "Voir l'attestation HDS",
      },
      { href: "/confidentialite", label: "Politique RGPD" },
    ],
  },
  {
    icon: "🩺",
    title: "Pensé pour les ostéos",
    text: "Co-construit avec 30+ praticiens pilotes : ostéopathes, chiropracteurs, sophrologues, naturopathes. Pas un logiciel Doctolib générique — un outil métier.",
  },
  {
    icon: "🛡️",
    title: "30 jours satisfait ou remboursé",
    text: "Activez, testez en cabinet, décidez. Si Augmenta ne vous fait pas gagner au moins 2h/semaine, on vous rembourse intégralement. Pas de questions.",
  },
];

const FAQ = [
  {
    q: "Quand commence la facturation ?",
    a: "Le jour où vous activez votre compte (J+0), pas avant. Annulable en 1 clic.",
  },
  {
    q: "Mes données patients sont-elles sécurisées ?",
    a: "Oui. Hébergement HDS Clever Cloud, France. Aucune donnée ne sort du territoire.",
  },
  {
    q: "Puis-je importer mes patients existants ?",
    a: "Oui. Import CSV depuis votre logiciel actuel + reprise manuelle assistée par notre équipe.",
  },
  {
    q: "La télétransmission FSE est incluse ?",
    a: "Inclus à partir du mois 9 (M9 roadmap). En attendant, on génère la facture et l'export SESAM-Vitale.",
  },
  {
    q: "Comment fonctionne l'IA vocale ?",
    a: "Elle décroche avec votre numéro, qualifie le motif, propose un créneau. Vous gardez la main sur les urgences.",
  },
  {
    q: "Puis-je garder mon numéro de téléphone ?",
    a: "Oui, portabilité incluse et offerte. On s'occupe de tout.",
  },
  {
    q: "L'IA peut-elle se tromper ?",
    a: "Oui, c'est pour ça qu'elle transfère au praticien en cas de doute, et que vous validez chaque RDV avant confirmation.",
  },
  {
    q: "Y a-t-il une formation ?",
    a: "30 min de visio offerte à l'activation + base de connaissances + support email sous 4h ouvrées.",
  },
  {
    q: "Le code FOUNDING20 fonctionne comment ?",
    a: "Il s'applique automatiquement sur la page Stripe si vous êtes dans la liste d'attente. 20% sur la 1ʳᵉ année.",
  },
  {
    q: "Que se passe-t-il après les 3 mois à 29 € ?",
    a: "Vous basculez sur le plan Essentiel à 49 €/mois, résiliable à tout moment. Aucun frais caché.",
  },
] as const;

type SearchParams = {
  cancelled?: string;
  error?: string;
  reason?: string;
  promo?: string;
  session_id?: string;
};

export default async function PreVentePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const stripeReady = isStripeConfigured();
  const stripeMode = getStripeMode();
  const foundersRemaining = 30;

  return (
    <>
      <Navbar />

      <div className={styles.trustBar} role="region" aria-label="Garanties">
        <div className={styles.trustBarInner}>
          🔒 <strong>30 jours satisfait ou remboursé</strong>
          <span className={styles.trustSeparator} aria-hidden="true">
            ·
          </span>
          Hébergement <strong>HDS</strong>
          <span className={styles.trustSeparator} aria-hidden="true">
            ·
          </span>
          <strong>30+ praticiens</strong> en liste d&apos;attente
        </div>
      </div>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <h1 className={styles.heroTitle}>
                Votre cabinet sur pilote automatique.
              </h1>
              <p className={styles.heroSubtitle}>
                L&apos;IA vocale d&apos;Augmenta décroche 24/7, gère vos
                dossiers patients HDS et prépare votre télétransmission. Pendant
                que vous soignez, votre cabinet tourne tout seul.
              </p>
              <div className={styles.heroActions}>
                <a
                  href="#pricing"
                  className={styles.ctaPrimary}
                  data-matomo-event="pre_vente_cta_hero_click"
                >
                  🚀 Réserver mon offre pré-vente
                </a>
                <span className={styles.heroSubCta}>
                  30 praticiens fondateurs seulement. Sans engagement,
                  résiliable à tout moment.
                </span>
              </div>
              {!stripeReady ? (
                <p className={styles.stripeNotice} role="status">
                  ⚠️ Stripe pas encore configuré (
                  {stripeMode === "missing"
                    ? "clés absentes"
                    : "prix manquants"}
                  ) — les paiements seront activés dès que le CTO injecte les
                  variables d&apos;environnement.
                </p>
              ) : stripeMode === "test" ? (
                <p className={styles.stripeNotice} role="status">
                  ⚠️ Stripe en mode test — utilisez la carte 4242 4242 4242 4242
                  pour tester.
                </p>
              ) : null}
              {params.error ? (
                <p className={styles.errorNotice} role="alert">
                  Impossible de démarrer le paiement :{" "}
                  {decodeURIComponent(params.reason ?? params.error ?? "")}
                </p>
              ) : null}
              {params.cancelled ? (
                <p className={styles.errorNotice} role="status">
                  Paiement annulé. Vous pouvez réessayer ci-dessous.
                </p>
              ) : null}
            </div>
            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.heroPhoneMockup}>
                <div className={styles.heroPhoneHeader}>
                  <span className={styles.heroPhoneDot} />
                  <span className={styles.heroPhoneDot} />
                  <span className={styles.heroPhoneDot} />
                </div>
                <div className={styles.heroPhoneBody}>
                  <p className={styles.heroPhoneLabel}>
                    Appel IA traité · RDV confirmé
                  </p>
                  <p className={styles.heroPhoneName}>
                    Mme Dupont · mardi 14h30
                  </p>
                  <p className={styles.heroPhoneTranscript}>
                    « Bonjour, l&apos;ostéopathe, que puis-je pour vous ? »
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.howItWorks}>
          <div className={styles.howItWorksInner}>
            <p className={styles.eyebrow}>EN 30 SECONDES</p>
            <h2 className={styles.sectionTitle}>
              Trois clics. Votre cabinet répond.
            </h2>
            <ol className={styles.steps}>
              {FEATURES.map((feature) => (
                <li key={feature.title} className={styles.stepCard}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3 className={styles.stepTitle}>{feature.title}</h3>
                  <p className={styles.stepText}>{feature.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="pricing"
          className={styles.pricing}
          data-matomo-section="pricing"
        >
          <div className={styles.pricingInner}>
            <p className={styles.eyebrow}>OFFRE FONDATEUR · 30 PLACES</p>
            <h2 className={styles.sectionTitle}>
              Le prix d&apos;un café par jour. Le cabinet que vous méritez.
            </h2>

            <div className={styles.pricingGrid}>
              <article
                className={`${styles.priceCard} ${styles.priceCardRecommended}`}
              >
                <span className={styles.priceBadge}>Le plus choisi</span>
                <h3 className={styles.pricePlan}>Mensuel</h3>
                <p className={styles.priceAmount}>
                  <span className={styles.priceBig}>29 €</span>
                  <span className={styles.priceUnit}>
                    / mois pendant 3 mois, puis 49 € / mois
                  </span>
                </p>
                <p className={styles.priceNote}>
                  soit 87 € la 1ʳᵉ trimestre, sans engagement
                </p>
                <ul className={styles.priceFeatures}>
                  <li>
                    ✓ Tout Augmenta inclus (IA vocale, agenda, dossiers HDS,
                    dictée, rappels)
                  </li>
                  <li>✓ Télétransmission FSE (à partir de M9)</li>
                  <li>✓ 30 jours satisfait ou remboursé</li>
                </ul>
                <PreVenteCta
                  plan="monthly"
                  disabled={!stripeReady}
                  promo={params.promo}
                  testMode={stripeMode === "test"}
                />
              </article>

              <article className={styles.priceCard}>
                <h3 className={styles.pricePlan}>Annuel</h3>
                <p className={styles.priceAmount}>
                  <span className={styles.priceBig}>290 €</span>
                  <span className={styles.priceUnit}>
                    / an — 2 mois offerts
                  </span>
                </p>
                <p className={styles.priceNote}>
                  soit 24,17 €/mois, paiement unique
                </p>
                <ul className={styles.priceFeatures}>
                  <li>✓ Tout ce que la carte Mensuelle inclut</li>
                  <li>✓ 2 mois gratuits (économie de 98 €)</li>
                  <li>✓ Accès direct au canal fondateur (influence roadmap)</li>
                </ul>
                <PreVenteCta
                  plan="yearly"
                  disabled={!stripeReady}
                  promo={params.promo}
                  testMode={stripeMode === "test"}
                />
              </article>
            </div>

            <p className={styles.promoBanner}>
              🎁 <strong>Code FOUNDING20</strong> : 20% de remise sur la 1ʳᵉ
              année — réservé aux 30 contacts de la liste d&apos;attente.
              <br />
              <em>
                Si vous l&apos;avez reçu par email, votre code s&apos;applique
                automatiquement sur la page de paiement Stripe.
              </em>
            </p>
            <p className={styles.promoFine}>
              Le code FOUNDING20 est personnel et non transférable. Au-delà des
              30 fondateurs, le prix standard de 49 €/mois s&apos;applique.
            </p>
          </div>
        </section>

        <section className={styles.trust}>
          <div className={styles.trustInner}>
            <h2 className={styles.sectionTitle}>
              Conçu avec des praticiens. Hébergé en France.
            </h2>
            <div className={styles.trustGrid}>
              {TRUST_PILLARS.map((pillar) => (
                <article key={pillar.title} className={styles.trustCard}>
                  <span className={styles.trustIcon} aria-hidden="true">
                    {pillar.icon}
                  </span>
                  <h3 className={styles.trustTitle}>{pillar.title}</h3>
                  <p className={styles.trustText}>{pillar.text}</p>
                  {pillar.links ? (
                    <ul className={styles.trustLinks}>
                      {pillar.links.map((link) => (
                        <li key={link.href}>
                          <a href={link.href} rel="noopener">
                            {link.label} →
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.faq}>
          <div className={styles.faqInner}>
            <h2 className={styles.sectionTitle}>
              Vos questions, nos réponses.
            </h2>
            <div className={styles.faqList}>
              {FAQ.map((item, index) => (
                <details
                  key={item.q}
                  className={styles.faqItem}
                  data-matomo-event="pre_vente_faq_open"
                  data-question-id={index + 1}
                >
                  <summary className={styles.faqQuestion}>{item.q}</summary>
                  <p className={styles.faqAnswer}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalCtaInner}>
            <h2 className={styles.sectionTitle}>
              Il reste <strong>{foundersRemaining} places fondateur</strong> sur
              30.
            </h2>
            <p className={styles.finalCtaText}>
              Au-delà, Augmenta repasse à 49 €/mois sans code promo.
            </p>
            <a href="#pricing" className={styles.ctaPrimary}>
              🚀 Réserver mon offre pré-vente
            </a>
          </div>
        </section>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      <Suspense>
        <MatomoTracker />
      </Suspense>
    </>
  );
}

function MatomoTracker() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            if (typeof window === 'undefined') return;
            window._paq = window._paq || [];
            window._paq.push(['trackPageView']);
            window._paq.push(['trackEvent', 'pre_vente', 'view', '/pre-vente']);
          })();
        `,
      }}
    />
  );
}
