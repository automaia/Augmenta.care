"use client";

import { useState, type FormEvent } from "react";
import { createCheckoutSession, type CheckoutResult } from "./actions";
import styles from "./pre-vente.module.css";

type Props = {
  plan: "monthly" | "yearly";
  disabled: boolean;
  promo: string | undefined;
  testMode: boolean;
};

function trackEvent(name: string, props?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const paq = (window as unknown as { _paq?: Array<unknown[]> })._paq;
  if (Array.isArray(paq)) {
    paq.push(["trackEvent", "pre_vente", name, JSON.stringify(props ?? {})]);
  }
}

export function PreVenteCta({ plan, disabled, promo, testMode }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    setError(null);
    setPending(true);
    trackEvent("pre_vente_stripe_checkout_click", { plan });

    const formData = new FormData();
    formData.set("plan", plan);
    formData.set("email", email);
    if (firstName) formData.set("firstName", firstName);
    if (promo) formData.set("promo", promo);

    try {
      const result: CheckoutResult = await createCheckoutSession(formData);
      if (!result.ok) {
        setError(result.reason);
        setPending(false);
        return;
      }
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setPending(false);
    }
  }

  return (
    <form className={styles.ctaForm} onSubmit={onSubmit}>
      <label className={styles.ctaField}>
        <span className={styles.ctaLabel}>Email professionnel</span>
        <input
          className={styles.ctaInput}
          type="email"
          required
          autoComplete="email"
          placeholder="vous@cabinet-osteo.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={styles.ctaField}>
        <span className={styles.ctaLabel}>Prénom (optionnel)</span>
        <input
          className={styles.ctaInput}
          type="text"
          autoComplete="given-name"
          placeholder="Antoine"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </label>
      {error ? (
        <p className={styles.ctaError} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className={styles.ctaButton}
        disabled={pending || disabled}
        aria-label={`Réserver l'offre ${plan === "monthly" ? "29 €/mois" : "290 €/an"}`}
      >
        {pending
          ? "Redirection…"
          : plan === "monthly"
            ? "Réserver 29 €/mois →"
            : "Réserver 290 €/an →"}
      </button>
      {testMode ? (
        <p className={styles.ctaTestMode}>
          Mode test Stripe actif — utilisez la carte 4242 4242 4242 4242.
        </p>
      ) : null}
    </form>
  );
}
