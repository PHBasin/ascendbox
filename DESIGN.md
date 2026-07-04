# DESIGN.md — AscendBox Design System

Design system d'AscendBox, une app mobile-first destinée aux coachs de club d'escalade
pour parcourir des exercices d'entraînement. Ce document est la **source de vérité design**.

> **Contexte technique** : Tailwind CSS **v4** (moteur `tailwindcss@next`), config *CSS-first*
> dans [`src/assets/main.css`](src/assets/main.css) via le bloc `@theme` — il n'y a **pas** de
> `tailwind.config.js`. Les tokens ci-dessous sont donc des variables CSS exposées comme
> utilitaires Tailwind (`bg-force`, `text-mental`, etc.).

---

## 1. Principes

1. **Mobile-first** — tout est pensé pour le pouce d'abord (cibles tactiles ≥ 44px, feed sur une colonne, filtres en haut collés).
2. **Calme avant tout** — bordures plutôt qu'ombres lourdes, teintes douces (`/10`, `/20`) plutôt qu'aplats saturés, pas de halo.
3. **La couleur porte du sens** — chaque pilier a SA couleur, l'intensité a une échelle sémantique. La couleur n'est jamais décorative.
4. **Le mouvement guide, il ne distrait pas** — transitions courtes (200–300 ms), feedback tactile discret (`active:scale`), crossfade au changement de contexte.
5. **Sombre = confort, pas option** — le thème suit l'OS (`prefers-color-scheme`), aucun toggle manuel. Chaque token a sa variante sombre.

---

## 2. Couleurs

### 2.1 Piliers (catégories) — identité de marque

Source de vérité : `@theme` dans [`main.css`](src/assets/main.css). Les ids (`force`/`technique`/`mental`)
correspondent volontairement aux noms de tokens.

| Pilier | Token | Hex | Base Tailwind |
|---|---|---|---|
| **Force** | `--color-force` | `#f43f5e` | Rose 500 |
| **Technique** | `--color-technique` | `#06b6d4` | Cyan 500 |
| **Mental** | `--color-mental` | `#a855f7` | Purple 500 |

Utilisables comme `bg-force`, `text-technique`, `ring-mental`, et avec opacité `bg-force/10`.

### 2.2 Neutres (échelle Slate)

| Usage | Clair | Sombre |
|---|---|---|
| Fond page | `slate-50` | `slate-900` |
| Texte principal | `slate-800` | `slate-100` |
| Surface (carte) | `white` | `slate-800` |
| Bordure | `slate-200` | `slate-700` |
| Texte secondaire | `slate-500` | `slate-400` |
| Fond neutre (chip inactif) | `slate-100` | `slate-800` |

### 2.3 Sémantique — intensité de l'exercice

Échelle à 3 niveaux (`Intensity = 1 | 2 | 3`), **tokenisée** dans `@theme` ([`main.css`](src/assets/main.css))
comme les piliers. La map niveau → token vit dans [`ExerciseCard.vue`](src/components/ExerciseCard.vue) :

| Niveau | Label | Token | Hex | Base Tailwind | Utilitaires |
|---|---|---|---|---|---|
| 1 | Faible | `--color-intensity-low` | `#059669` | Emerald 600 | `bg-intensity-low`, `text-intensity-low` |
| 2 | Modérée | `--color-intensity-mid` | `#d97706` | Amber 600 | `bg-intensity-mid`, `text-intensity-mid` |
| 3 | Élevée | `--color-intensity-high` | `#e11d48` | Rose 600 | `bg-intensity-high`, `text-intensity-high` |

> Vert → ambre → rose : progression « facile → dur » universellement lisible.
> Un token unique par niveau sert à la fois la barre et le texte (même logique que les piliers) ;
> la teinte 600 est retenue pour préserver le contraste du label en mode clair.

---

## 3. Typographie

- **Famille** : `--font-sans: "Inter", system-ui, -apple-system, sans-serif`.
  Inter est chargé depuis Google Fonts dans [`index.html`](index.html) (poids 400/500/600/700,
  `display=swap` + `preconnect` pour ne pas bloquer le premier rendu). `system-ui` reste le
  fallback si la police n'est pas disponible.
- **Échelle en usage** (relevée dans les composants) :

| Rôle | Classes |
|---|---|
| Titre de carte | `text-lg font-bold leading-tight` |
| Description | `text-[15px] leading-relaxed` |
| Label pilier / durée / tags | `text-xs font-semibold` (ou `font-medium`) |
| Bouton de filtre | `font-bold capitalize` |

---

## 4. Espacement

### 4.1 Échelle

**Grille de 4px.** Tous les espacements (padding, margin, gap) sont des multiples de `4px`,
posés via les utilitaires natifs Tailwind (`--spacing` = `0.25rem`). On ne tokenise **pas**
l'espacement en `@theme` — contrairement aux couleurs, l'échelle numérique de Tailwind *est*
déjà la source de vérité. On se contente d'en **restreindre** les pas à ceux ci-dessous et de
leur donner un rôle.

| Pas | rem | px | Tailwind | Rôle |
|---|---|---|---|---|
| `3xs` | 0.125 | 2 | `-0.5` | micro-gap serré (barres d'intensité) |
| `2xs` | 0.25 | 4 | `-1` | gap icône↔texte, écart titre↔description |
| `xs` | 0.375 | 6 | `-1.5` | gap inline (dot↔label, mètre, tags) |
| `sm` | 0.5 | 8 | `-2` | gap entre chips / dans une rangée |
| `md` | 0.75 | 12 | `-3` | rythme **intra-carte** (blocs, header, footer), padding horizontal des chips |
| `lg` | 1 | 16 | `-4` | **padding de carte** (`p-4`), padding horizontal des filtres |
| `xl` | 1.5 | 24 | `-6` | **gouttière du feed** (`gap-6`) + padding du conteneur (`p-6`) |
| `2xl` | 2 | 32 | `-8` | rythme de **section** (`main py-8`, sentinelle `h-8`) |
| `3xl` | 3 | 48 | `-12` | respiration des états vides / erreur (`py-12`) |

### 4.2 Rythme (du plus fin au plus large)

1. **Inline** (`3xs`→`xs`) — ce qui vit sur une même ligne : icône et son texte, points, barres.
2. **Intra-carte** (`md`) — les blocs empilés d'une carte respirent à `12px` (`flex flex-col gap-3`).
3. **Carte** (`lg`) — padding interne à `16px`.
4. **Entre cartes / conteneur** (`xl`) — gouttière du feed *et* marge du conteneur partagent `24px`,
   pour que le feed « respire » du même pas à l'intérieur comme autour.
5. **Section** (`2xl`) — le décrochage vertical entre zones de page.
6. **Vide** (`3xl`) — un état vide/erreur prend deux fois le pas de section pour ne pas paraître cassé.

### 4.3 Règles

- **Rester sur les pas ci-dessus.** Pas de valeur arbitraire (`px-5`, `px-2.5`, `p-[13px]`…) :
  choisir le pas nommé le plus proche. *(Régularisé : les filtres passent de `px-5`→`px-4`,
  les chips de `px-2.5`→`px-3`.)*
- **Un rôle = un pas.** Deux éléments jouant le même rôle utilisent le même pas (ex. gouttière feed
  et padding conteneur = `xl`) — c'est ce qui rend le rythme lisible.
- **La cible tactile n'est pas un pas de rythme.** `min-h-11` (44px) est une contrainte
  d'accessibilité (§8), indépendante de l'échelle.
- **Dimensions (`w-*`/`h-*`) suivent la même grille** quand c'est possible (dot `w-2 h-2`,
  sentinelle `h-8`), sauf le dimensionnement d'icône, laissé pragmatique (`w-3.5 h-3.5`).

### 4.4 Rayons & surfaces

- **Rayons** : `rounded-3xl` (cartes), `rounded-full` (pastilles, chips, boutons de filtre).
- **Élévation** : **pas d'ombres** par défaut. La séparation se fait par `border` + contraste de surface (`white` vs `slate-50`).

---

## 5. Composants

### 5.1 `.card` — surface de base
Définie en `@layer components` dans [`main.css`](src/assets/main.css) :
```
bg-white dark:bg-slate-800
border border-slate-200 dark:border-slate-700
rounded-3xl p-4
transition-all duration-300
```
Interaction : les cartes cliquables ajoutent `active:scale-[0.98]`.

### 5.2 Chip / pastille de filtre — `CategoryFilter`
- **Actif** : `bg-{pilier}/10 dark:bg-{pilier}/20 text-{pilier} ring-{pilier}/30` (teinte douce + texte coloré + anneau fin).
- **Inactif** : `bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-transparent` + `hover:bg-slate-200 dark:hover:bg-slate-700`.
- Toujours `ring-1` pour éviter le saut de layout entre états.

### 5.3 Point de catégorie (dot)
`w-2 h-2 rounded-full bg-{pilier}` — repère couleur en tête de carte.

### 5.4 Tags
`text-xs font-semibold px-2.5 py-1 rounded-full` teintés à la couleur du pilier : `bg-{pilier}/10 text-{pilier}`.

### 5.5 Mètre d'intensité
3 barres de hauteur croissante (`h-2`, `h-3`, `h-4`), `w-1 rounded-full`.
Remplies (`n <= intensity`) → couleur du niveau ; vides → `bg-slate-200 dark:bg-slate-600`.
**Le niveau EST le nombre de barres pleines** (pas besoin de lire le label).

### 5.6 Skeleton de chargement
`animate-pulse` sur des blocs `bg-slate-200 dark:bg-slate-700` reproduisant la forme d'une carte.
Le shell reste interactif pendant le `fetch`.

### 5.7 Barre de filtres (nav)
`sticky top-0 z-20` + `bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md` — reste accessible au scroll, translucide.

---

## 6. Mouvement & transitions

| Contexte | Recette |
|---|---|
| Changement de couleur / thème | `transition-colors duration-300` |
| Feedback bouton | `active:scale-95` |
| Feedback carte | `active:scale-[0.98]` |
| Changement de catégorie | `<Transition mode="out-in">` — crossfade + léger `translate-y` (enter 300 ms, leave 200 ms) |
| Ajout de cartes (pagination) | `<TransitionGroup>` — entrée `opacity-0 translate-y-4` → visible (500 ms), `move` en 300 ms, **pas de `leave`** (évite le chevauchement) |

Principe : une transition par intention. On ne cumule pas les animations.

---

## 7. Thème sombre

- Piloté par `@media (prefers-color-scheme: dark)` (réglage OS), **jamais** par une classe `dark` togglée manuellement.
- Chaque token neutre a sa contrepartie `dark:*`. Les couleurs de pilier sont partagées mais leur opacité de fond monte (`/10` → `dark:/20`) pour rester visibles sur fond sombre.

---

## 8. Accessibilité

- **Cibles tactiles** ≥ 44px (`min-h-11` sur les filtres).
- **États annoncés** : `aria-pressed` (filtre actif), `aria-busy` + `aria-live="polite"` (skeleton), `aria-hidden` (décoratifs : dot, sentinelle, SVG).
- **Contraste** : texte principal `slate-800`/`slate-100` sur fonds `slate-50`/`slate-900`.
- **Redondance couleur** : l'intensité est aussi indiquée par le nombre de barres et un label texte, pas seulement par la teinte.

---

## 9. ⚠️ Contrainte critique — Tailwind v4 JIT

Le scanner JIT ne génère **que** les classes présentes sous forme de **chaînes statiques complètes**
dans le source. **Ne jamais construire un nom de classe par concaténation** :

```ts
// ❌ INVISIBLE pour le scanner — la classe ne sera pas générée
:class="'bg-' + pilier"

// ✅ Mapper chaque choix vers une chaîne complète et statique
const activeClasses: Record<CategoryId, string> = {
  force: 'bg-force/10 dark:bg-force/20 text-force ring-force/30',
  technique: 'bg-technique/10 dark:bg-technique/20 text-technique ring-technique/30',
  mental: 'bg-mental/10 dark:bg-mental/20 text-mental ring-mental/30',
};
```

Voir `activeClasses` dans [`CategoryFilter.vue`](src/components/CategoryFilter.vue) et `CATEGORY_STYLE`
dans [`ExerciseCard.vue`](src/components/ExerciseCard.vue).

---

## 10. Dette design connue / à faire

- [x] ~~**Charger réellement la police Inter**~~ — chargée depuis Google Fonts dans [`index.html`](index.html) (§3).
- [x] ~~**Tokeniser les couleurs sémantiques d'intensité**~~ — tokens `--color-intensity-*` dans `@theme` (§2.3).
- [x] ~~**Formaliser une échelle d'espacement**~~ — échelle nommée sur grille de 4px + rythme + règles (§4) ; `px-5` et `px-2.5` régularisés.
- [ ] **Self-hoster Inter** — le chargement actuel dépend de Google Fonts (requête tierce). Envisager un `@font-face` local pour la perf/confidentialité.

---

## 11. Où ajouter quoi

| Je veux… | Fichier |
|---|---|
| Ajouter/modifier une couleur de token | `@theme` dans [`main.css`](src/assets/main.css) |
| Ajouter une catégorie (pilier) | [`domain/exercise.ts`](src/domain/exercise.ts) (`CATEGORIES`) **+** token couleur en `@theme` |
| Créer une classe réutilisable (ex. `.card`) | `@layer components` dans [`main.css`](src/assets/main.css) |
| Changer un style de carte / chip | le composant concerné dans [`src/components/`](src/components/) |
| Choisir un espacement (padding/margin/gap) | l'échelle §4 — pas nommé le plus proche, jamais de valeur arbitraire |
