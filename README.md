# Augmenta.care

Plateforme de gestion de rendez-vous et de dossiers patients pour ostéopathes.

## Périmètre MVP

- **Public cible :** ostéopathes exclusivement
- **Hors périmètre :** SMS, IA, paiement en ligne
- **Infra cible :** Clever Cloud HDS / PostgreSQL (validé par le CTO — voir AUGA-7)

## Pré-requis

- Node.js 20+
- npm 10+

## Installation

```bash
git clone https://github.com/automaia/Augmenta.care.git
cd Augmenta.care
cp .env.example .env.local
npm install
```

## Scripts

| Script                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Démarre le serveur de développement       |
| `npm run build`        | Build de production                       |
| `npm run start`        | Démarre le serveur de production          |
| `npm run typecheck`    | Vérification des types TypeScript (`tsc`) |
| `npm run lint`         | Lint ESLint                               |
| `npm run lint:fix`     | Lint ESLint avec corrections automatiques |
| `npm run format`       | Formatage Prettier (`--write .`)          |
| `npm run format:check` | Vérification du formatage Prettier        |

## Stack technique

- **Next.js 15** (App Router)
- **TypeScript** strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, zéro `any`)
- **ESLint** + **Prettier**
- **Husky** + **lint-staged** (pre-commit)
- **CI GitHub Actions** : `typecheck` + `lint` + `format:check` + `build` sur PR/push

## Structure

```
app/
  (marketing)/    Pages publiques
  (praticien)/    Espace praticien
  (patient)/      Espace patient
  api/            Routes API
db/migrations/    Migrations PostgreSQL
docs/adr/         Architecture Decision Records
lib/              Bibliothèques partagées (auth, ...)
messages/         Fichiers de traduction (fr.json)
```
