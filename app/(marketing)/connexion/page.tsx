"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./connexion.module.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

type FieldErrors = {
  email?: string;
  password?: string;
};

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email) {
    errors.email = "L'email est requis.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "L'email n'est pas valide.";
  }

  if (!password) {
    errors.password = "Le mot de passe est requis.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  return errors;
}

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = validate(email, password);
  const isFormInvalid = Boolean(errors.email || errors.password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (isFormInvalid) {
      return;
    }

    setLoading(true);
    // eslint-disable-next-line no-console
    console.log({ email, password });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    router.push("/dashboard");
  }

  const showEmailError = submitted && Boolean(errors.email);
  const showPasswordError = submitted && Boolean(errors.password);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Augmenta.care</span>
        </div>

        <h1 className={styles.title}>Connexion à votre espace</h1>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={`${styles.input} ${showEmailError ? styles.inputError : ""}`}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {showEmailError ? (
              <span className={styles.error}>{errors.email}</span>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Mot de passe
            </label>
            <input
              className={`${styles.input} ${showPasswordError ? styles.inputError : ""}`}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {showPasswordError ? (
              <span className={styles.error}>{errors.password}</span>
            ) : null}
          </div>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isFormInvalid || loading}
          >
            {loading ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        <div className={styles.links}>
          <a className={styles.link} href="/mot-de-passe-oublie">
            Mot de passe oublié ?
          </a>
          <a className={styles.link} href="/inscription">
            Pas encore de compte ? Créer un compte
          </a>
        </div>
      </div>
    </main>
  );
}
