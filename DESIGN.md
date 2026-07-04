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

## 4. Espacement, rayons & surfaces

- **Rayons** : `rounded-3xl` (cartes), `rounded-full` (pastilles, chips, boutons de filtre).
- **Padding carte** : `p-4`.
- **Chips / tags** : `px-2.5 py-1`.
- **Boutons de filtre** : `px-5 min-h-11` (⇒ cible tactile ≥ 44px).
- **Rythme vertical du feed** : `grid gap-6`.
- **Conteneur** : `max-w-2xl mx-auto p-6` — feed centré, lisible sur desktop comme mobile.
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
- [ ] **Formaliser une échelle d'espacement** (aujourd'hui les valeurs — `p-4`, `gap-6`, `px-5` — sont posées au cas par cas).
- [ ] **Self-hoster Inter** — le chargement actuel dépend de Google Fonts (requête tierce). Envisager un `@font-face` local pour la perf/confidentialité.

---

## 11. Où ajouter quoi

| Je veux… | Fichier |
|---|---|
| Ajouter/modifier une couleur de token | `@theme` dans [`main.css`](src/assets/main.css) |
| Ajouter une catégorie (pilier) | [`domain/exercise.ts`](src/domain/exercise.ts) (`CATEGORIES`) **+** token couleur en `@theme` |
| Créer une classe réutilisable (ex. `.card`) | `@layer components` dans [`main.css`](src/assets/main.css) |
| Changer un style de carte / chip | le composant concerné dans [`src/components/`](src/components/) |
