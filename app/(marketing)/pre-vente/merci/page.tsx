import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import styles from "../pre-vente.module.css";

export const metadata: Metadata = {
  title: "Merci pour votre pré-vente",
  description:
    "Votre place fondateur Augmenta est réservée. Prochaines étapes dans votre boîte mail.",
  robots: { index: false, follow: false },
};

type SearchParams = { session_id?: string };

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <Navbar />
      <main className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <p className={styles.eyebrow}>PRÉ-VENTE VALIDÉE</p>
          <h1 className={styles.sectionTitle}>
            🎉 Bienvenue dans les 30 fondateurs Augmenta.
          </h1>
          <p className={styles.finalCtaText}>
            Votre paiement est en cours de traitement. Vous recevrez un email de
            confirmation dans les 5 prochaines minutes avec vos accès à
            l&apos;espace praticien et votre code FOUNDING20.
          </p>
          {params.session_id ? (
            <p className={styles.finalCtaText}>
              Référence session Stripe : <code>{params.session_id}</code>
            </p>
          ) : null}
          <Link href="/" className={styles.ctaPrimary}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
