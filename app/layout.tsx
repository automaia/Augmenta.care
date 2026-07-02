import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="fr-FR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
