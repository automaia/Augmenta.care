"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./sidebar.module.css";

const navItems = [
  { href: "/dashboard/agenda", label: "Agenda", icon: "\u{1F4C5}" },
  { href: "/dashboard/patients", label: "Patients", icon: "\u{1F465}" },
  { href: "/dashboard/dossiers", label: "Dossiers", icon: "\u{1F4CB}" },
  { href: "/dashboard/stats", label: "Statistiques", icon: "\u{1F4CA}" },
  { href: "/dashboard/reglages", label: "Réglages", icon: "\u2699\uFE0F" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.hamburger}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
        aria-label="Navigation principale"
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
