import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

const FEATURES = [
  {
    icon: "📅",
    title: "Prise de rendez-vous",
    text: "Agenda en ligne 24/7, rappels automatiques, sync calendrier",
  },
  {
    icon: "👤",
    title: "Dossiers patients",
    text: "Historique complet, documents, notes de consultation",
  },
  {
    icon: "💊",
    title: "Ordonnances",
    text: "Modèles pré-remplis, export PDF, signature numérique",
  },
] as const;

export default function MarketingPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="container hero__content">
            <h1 className="hero__title">
              Gérez votre cabinet d&apos;ostéopathie en toute simplicité
            </h1>
            <p className="hero__subtitle">
              Rendez-vous, dossiers patients, facturation — tout réuni dans une
              plateforme intuitive.
            </p>
            <div className="hero__actions">
              <Link href="/connexion" className="btn btn--primary">
                Démarrer gratuitement
              </Link>
              <Link href="/#features" className="btn btn--ghost">
                Voir une démo
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="container">
            <div className="features__head">
              <h2 className="features__title">
                Tout ce dont votre cabinet a besoin
              </h2>
              <p className="features__subtitle">
                Une suite complète d&apos;outils pensés pour les praticiens.
              </p>
            </div>
            <div className="features__grid">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="feature-card">
                  <div className="feature-card__icon" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3 className="feature-card__title">{feature.title}</h3>
                  <p className="feature-card__text">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-final">
          <div className="container">
            <h2 className="cta-final__title">
              Prêt à digitaliser votre cabinet&nbsp;?
            </h2>
            <Link href="/connexion" className="btn btn--light">
              Créer mon compte
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
