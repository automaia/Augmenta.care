import Link from "next/link";

const NAV_LINKS = [
  { href: "/#features", label: "Fonctionnalités" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#contact", label: "Contact" },
] as const;

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link href="/" className="navbar__logo">
          Augmenta.care
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="navbar__links">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="navbar__actions">
          <Link href="/connexion" className="btn btn--secondary">
            Connexion
          </Link>
        </div>
      </div>
    </header>
  );
}
