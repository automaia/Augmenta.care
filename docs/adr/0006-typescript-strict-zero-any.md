# ADR-0006 — TypeScript strict, zéro `any`, ESLint `no-explicit-any` en error

- **Statut :** Accepté
- **Date :** 2026-06-30
- **Décision :** `tsconfig.json` active `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`.
  La règle ESLint `@typescript-eslint/no-explicit-any` est en `error`.
- **Conséquences :** `tsc --noEmit` (`npm run typecheck`) est exécuté en pre-commit
  et en CI. Aucun `any` n'est autorisé sans `eslint-disable` justifié en commentaire.
- **Référence :** Plan CTO [AUGA-7](/AUGA/issues/AUGA-7#document-plan) §2.5, ADR-0006.
