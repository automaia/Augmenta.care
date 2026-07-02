import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Augmenta.care",
    template: "%s — Augmenta.care",
  },
  description:
    "Plateforme de gestion de rendez-vous et de dossiers patients pour ostéopathes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr-FR">
      <body>{children}</body>
    </html>
  );
}
