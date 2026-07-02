import styles from "./header.module.css";

type HeaderProps = {
  cabinetName?: string;
  practitionerName?: string;
};

export function Header({
  cabinetName = "Cabinet Augmenta",
  practitionerName = "Dr. Praticien",
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.cabinet}>{cabinetName}</div>
      <div className={styles.profile}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {practitionerName.charAt(0)}
          </span>
          <span className={styles.name}>{practitionerName}</span>
        </div>
        <button type="button" className={styles.logout}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
