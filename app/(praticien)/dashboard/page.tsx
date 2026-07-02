import styles from "./page.module.css";

const cards = [
  { title: "Rendez-vous du jour", value: "—" },
  { title: "Patients actifs", value: "—" },
  { title: "Revenus du mois", value: "—" },
  { title: "Taux d\u2019occupation", value: "—" },
] as const;

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Tableau de bord</h1>
      <div className={styles.grid}>
        {cards.map((card) => (
          <article key={card.title} className={styles.card}>
            <h2 className={styles.cardTitle}>{card.title}</h2>
            <p className={styles.cardValue}>{card.value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
