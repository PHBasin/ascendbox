<div align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="Logo AscendBox" />
  <h1>AscendBox</h1>
  <p><em>La boîte à exercices des coachs d'escalade.</em></p>
</div>

---

**AscendBox** est une application web *mobile-first* qui permet aux coachs de club d'escalade
de parcourir un catalogue d'exercices d'entraînement, filtrés par pilier
(**Force**, **Technique**, **Mental**) et qualifiés par intensité et durée.

> Le contenu des exercices est en français ; le code et les commentaires sont en anglais.

## ✨ Fonctionnalités

- 🎯 **Filtrage par pilier** — Force, Technique, Mental, chacun avec sa couleur d'identité.
- 📊 **Lecture rapide** — chaque carte affiche durée, tags et un mètre d'intensité visuel (1 à 3 barres).
- ♾️ **Défilement infini** — pagination automatique au scroll (chargement anticipé).
- 🌗 **Thème clair / sombre** — automatique, suit le réglage du système d'exploitation.
- 📱 **Pensée mobile** — cibles tactiles ≥ 44px, feed sur une colonne, barre de filtres collée en haut.

## 🚀 Démarrage

**Prérequis** : Node.js **24.18.0** (voir [`.nvmrc`](.nvmrc)) et npm.

```bash
nvm use          # aligne la version de Node sur .nvmrc
npm install      # installe les dépendances
npm run dev      # lance le serveur de dev sur http://localhost:3000
```

## 📜 Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite (port **3000**). |
| `npm run type-check` | Vérification des types via `vue-tsc` (n'émet aucun fichier). |
| `npm run build` | Type-check **puis** build de production dans `dist/`. |
| `npm run preview` | Sert le build de production localement. |

> ℹ️ Il n'y a **ni tests ni linter**. La sûreté est assurée par `vue-tsc` (`strict: true`).
> Le `type-check` n'est **pas** exécuté par `dev` — seulement par `build`. Un type invalide
> casse le build, pas le dev.

## 🧱 Stack technique

- [Vue 3](https://vuejs.org/) (`<script setup>` + Composition API)
- [Vite 6](https://vitejs.dev/) (bundler & serveur de dev)
- [TypeScript](https://www.typescriptlang.org/) (mode `strict`)
- [Tailwind CSS v4](https://tailwindcss.com/) (config *CSS-first*, sans `tailwind.config.js`)

## 🏗️ Architecture

Le projet suit une **architecture en couches** (inspirée de la Clean Architecture) pour que la
source de données puisse être remplacée sans toucher à l'UI. Les dépendances vont dans un seul sens :

```
domain  →  data  →  application  →  presentation
```

| Couche | Fichier | Rôle |
|---|---|---|
| **Domain** | [`src/domain/exercise.ts`](src/domain/exercise.ts) | Entités & types métier purs. Source de vérité des catégories (`CATEGORIES`). Zéro dépendance framework. |
| **Data** | [`src/data/exerciseRepository.ts`](src/data/exerciseRepository.ts) | Seul module qui connaît la source. `fetch` le JSON, le fige (`Object.freeze`) et le met en cache. À remplacer pour passer à une API. |
| **Application** | [`src/application/useExercises.ts`](src/application/useExercises.ts) | Composable d'état (singleton partagé) : filtrage, pagination, chargement/erreur. Le comportement vit ici. |
| **Présentation** | [`src/components/`](src/components/) | Composants purement visuels : `App`, `CategoryFilter`, `ExerciseFeed`, `ExerciseCard`. |

- **Alias de chemin** : `@` → `./src` (déclaré dans `vite.config.ts` **et** `tsconfig.json`).
- **Design system** : voir [DESIGN.md](DESIGN.md).

## 📂 Données

Les exercices vivent dans [`public/data/exercises.json`](public/data/exercises.json), **fetché
au runtime** (hors bundle JS pour un meilleur *time-to-interactive* ; préchargé via
`<link rel="preload">` dans [`index.html`](index.html)).

Chaque entrée respecte l'interface `Exercise` :

```json
{
  "id": 1,
  "title": "Suspensions Max (Morts)",
  "description": "Tenir 7 secondes sur réglette 15mm. 3 minutes de repos. 5 séries.",
  "categoryId": "force",
  "tags": ["poutre"],
  "intensity": 3,
  "duration": 20
}
```

- `categoryId` : `"force"` | `"technique"` | `"mental"`.
- `intensity` : `1` (faible) | `2` (modérée) | `3` (élevée).
- `duration` : en minutes.

> ⚠️ Le JSON étant *fetché* (et non importé), une dérive de schéma **n'est pas détectée** par
> `vue-tsc` — elle échoue au runtime. Garder le fichier aligné avec l'interface `Exercise`
> manuellement.

## 🗂️ Structure du projet

```
ascendbox/
├── public/
│   ├── data/exercises.json   # le catalogue d'exercices
│   └── favicon.svg           # logo (cube isométrique + chevron)
├── src/
│   ├── domain/               # entités & types
│   ├── data/                 # accès aux données
│   ├── application/          # état & logique (composables)
│   ├── components/           # composants Vue
│   ├── assets/main.css       # tokens Tailwind v4 (@theme)
│   └── main.ts               # point d'entrée
├── index.html
├── CLAUDE.md                 # guide pour l'assistant IA
└── DESIGN.md                 # design system
```

## 🚧 Améliorations possibles

Pistes d'évolution, regroupées par thème. Aucune n'est bloquante — le projet fonctionne en l'état.

### Qualité & robustesse
- **Tests** — il n'y a aujourd'hui aucun test. Ajouter [Vitest](https://vitest.dev/) pour la
  logique ([`useExercises.ts`](src/application/useExercises.ts) : filtrage, pagination) et
  [Vue Test Utils](https://test-utils.vuejs.org/) pour les composants.
- **Linter / formatter** — pas d'ESLint ni de Prettier. Les mettre en place uniformiserait le style
  et attraperait des erreurs que `vue-tsc` ne voit pas.
- **Validation du JSON au runtime** — le schéma des exercices n'est pas vérifié (une dérive échoue
  silencieusement au runtime). Valider avec [Zod](https://zod.dev/) dans
  [`exerciseRepository.ts`](src/data/exerciseRepository.ts) donnerait des erreurs claires.
- **CI** — un workflow GitHub Actions lançant `type-check` + `build` (+ tests) à chaque push.

### Fonctionnalités
- **Recherche** par mot-clé (titre, tags) en complément du filtre par pilier.
- **Filtres combinés** — intensité et/ou durée, en plus de la catégorie.
- **Favoris** des exercices (persistés en `localStorage`).
- **Vue détail** d'un exercice (route dédiée, partage par URL).
- **Composition de séances** — sélectionner des exercices pour bâtir un entraînement.

### Technique
- **Passage à une API** — l'architecture est déjà prête : il suffit de réécrire
  [`exerciseRepository.ts`](src/data/exerciseRepository.ts), le reste ne bouge pas.
- **PWA / hors-ligne** — service worker + manifeste pour une utilisation au pied du mur, sans réseau.
- **Tests d'accessibilité** automatisés (axe-core) et audit Lighthouse dans la CI.

### Design (voir [DESIGN.md](DESIGN.md#10-dette-design-connue--à-faire))
- **Self-hoster la police Inter** — aujourd'hui chargée via Google Fonts (requête tierce).
- **Formaliser une échelle d'espacement** plutôt que des valeurs posées au cas par cas.
