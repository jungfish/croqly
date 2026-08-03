# Croqly — Design System

> Traduit du brand book de référence : [Croqly — Univers de marque](https://claude.ai/code/artifact/b9a85770-5de2-45ce-bae1-1fbd0eb60184) (publié le 21/07/2026, veille du renommage Cookify → Croqly). Voir aussi l'[audit de conformité du 03/08/2026](#audit-du-03082026) en bas de page. Ce doc est la référence à suivre pour toute nouvelle surface UI — pas le brand book lui-même, qui reste la source d'intention mais pas toujours le nommage exact des fichiers/tokens.

## Concept

**Croqly transforme une vidéo de cuisine en recette qu'on peut vraiment suivre.** Le nom vient de « croquer » : le signe de marque reprend la trace d'une bouchée dans un cercle plein, avec quelques miettes qui s'en échappent.

Tagline : *« Le reel devient recette — prête à croquer. »*

## Couleurs

Cinq couleurs, un appétit. Chaque couleur a un rôle précis — ne pas piocher une couleur brand pour autre chose que son rôle (ex : basil est réservé à la validation/fraîcheur, pas un accent décoratif).

| Nom | Rôle | Light | Dark | Tailwind |
|---|---|---|---|---|
| Crunch | Accent principal, CTA | `#FF4B3E` | `#FF6A5A` | `bg-crunch` / `bg-primary` |
| Basilic | Fraîcheur, validation | `#1F9D55` | `#35CD82` | `bg-basil` / `bg-secondary` |
| Jaune d'œuf | Pop, miettes, highlights | `#FFC93C` | `#FFD666` | `bg-yolk` / `bg-accent` |
| Papier | Fond clair | `#FFFAF1` | — | `bg-paper` / `bg-background` |
| Encre | Texte, fond sombre | `#241A2C` | — | `bg-ink` / `text-foreground` |

**Deux façons d'utiliser ces couleurs dans le code :**
- Tokens sémantiques (`bg-primary`, `bg-secondary`, `bg-accent`, `bg-background`, `text-foreground`, etc.) — **à préférer par défaut**. Ils pointent vers les variables HSL de `src/index.css` et gèrent automatiquement le light/dark.
- Couleurs brutes (`bg-crunch`, `bg-basil`, `bg-yolk`, `bg-paper`, `bg-ink` dans `tailwind.config.ts`) — réservées aux accents ponctuels qui ne correspondent à aucun slot sémantique (ex : le ruban `laser-ring`, les crumbs du logo). Ne pas les utiliser pour du texte/fond courant qui doit s'adapter au thème.

Ne jamais introduire un hex à la volée dans un composant — passer par l'un des deux systèmes ci-dessus.

## Typographie

**Fredoka** pour la voix (titres, logo, chips) · **Karla** pour le texte courant.

- `font-display` (Fredoka, 600–700) → tous les `h1`–`h6`, logo, gros titres de section
- `font-sans` (Karla, 400–700) → body text, labels, repères (`font-bold` pour les étiquettes type "Préparation 10 min · Cuisson 15 min")

Les deux fonts sont auto-hébergées (`public/fonts/fredoka.woff2`, `karla.woff2`), déclarées en `@font-face` dans `src/index.css` — pas de dépendance Google Fonts en runtime.

## Logo

Signe (la bouchée + 3 miettes) + mot, dans les deux sens. Trois variantes, une par fond :

| Variante | Fichier | Usage |
|---|---|---|
| `color` | `/croqly-mark.svg` | Fond papier ou neutre — crunch + miettes jaunes |
| `paper` | `/croqly-mark-paper.svg` | Fond sombre/coloré — signe en papier |
| `ink` | `/croqly-mark-ink.svg` | Fond clair, contexte discret — signe en encre |

Toujours passer par `<Logo variant="..." />` (`src/components/Logo.tsx`) plutôt que d'importer un SVG directement, pour garder le lockup icône+mot cohérent.

**Règles :**
- Espace de respiration minimum autour du signe = la hauteur d'une miette. Rien d'autre n'entre dans cette zone.
- Taille minimum : 24px en UI, 16px en favicon.
- Le favicon (`public/favicon.svg`) et le `theme-color` meta (`#FF4B3E`) doivent rester le crunch — c'est la couleur de reconnaissance de la marque en dehors de l'app (onglet navigateur, app switcher).

## Motif — le ruban croqué

Le même contour que le signe, répété, devient un séparateur ou une bordure de carte — **jamais un fond texturé plein, toujours un bord.**

> **Statut : pas encore implémenté dans l'UI actuelle.** Le brand book le prévoit comme séparateur entre sections / bordure de carte recette, mais aucun composant du repo ne le reprend aujourd'hui (voir audit). À considérer pour une prochaine itération visuelle plutôt qu'à imposer rétroactivement partout — mais si un nouveau motif de séparation/bordure est nécessaire quelque part, c'est celui-ci qu'il faut utiliser, pas un nouveau motif inventé sur le moment.

## Voix & ton

**Directe, jamais mielleuse.** Deuxième personne (« tu »), phrases courtes, jamais de tournure marketing gonflée. Une erreur explique ce qui s'est passé et quoi faire ensuite — pas juste "Une erreur est survenue".

| Contexte | Exemple |
|---|---|
| CTA principal | *Croquer la recette* |
| Confirmation | *Ajoutée à tes recettes.* |
| État vide | *Aucune recette pour l'instant — colle un lien Instagram ou TikTok pour commencer.* |
| Erreur | *Pas de recette repérable dans ce lien. Essaie avec un reel de cuisine.* |
| Chargement | *On croque la vidéo…* |
| Partage | *Envoyer cette recette* |

Ce ton est déjà bien installé dans les toasts et états vides existants (`toast.error(...)`, pages `recipes.tsx`, `decouvrir.tsx`, `laser-croq.tsx`, etc.) — s'aligner sur leur formulation plutôt que d'improviser un nouveau registre à chaque feature.

## Avatars / illustrations de profil

Le set d'avatars "brigade" (`public/avatars/*.svg` — bocuse, casanova, grillmaster, etc.) est un système illustratif à part : traits noir/blanc (`#171310` / `#FFFFFF`), sans référence à la palette crunch/basil/yolk ni au motif de la bouchée. C'est un choix assumé (style "line art" distinct pour les personnages), pas un token à réconcilier avec les couleurs de marque — mais ne pas piocher dans crunch/basil/yolk pour de futurs avatars sous prétexte de "coller à la marque" : garder ce set visuellement cohérent avec lui-même.

---

## Audit du 03/08/2026

Comparaison du brand book (21/07/2026) avec l'implémentation actuelle. Verdict global : **très bonne conformité** — le book a visiblement servi de référence directe au moment du renommage Cookify → Croqly (commit `b4880c1`, 22/07/2026), pas juste d'inspiration lointaine.

| Élément | Statut | Détail |
|---|---|---|
| Palette (crunch/basil/yolk/paper/ink) | ✅ Conforme | `tailwind.config.ts` reprend les hex exacts, light + dark. Les tokens sémantiques HSL de `index.css` correspondent aux mêmes couleurs. Un commentaire dans le config indique déjà la bonne pratique ("préférer bg-primary/bg-accent aux couleurs brutes"). |
| Typographie (Fredoka/Karla) | ✅ Conforme | Auto-hébergées, mappées sur `font-display`/`font-sans`, appliquées correctement (`h1`–`h6` en Fredoka, body en Karla). |
| Logo & lockups | ✅ Conforme | Les 3 variantes (`color`/`paper`/`ink`) existent en SVG et reproduisent exactement le tracé bouchée + miettes du book. Centralisées dans un composant `Logo.tsx` unique. |
| Favicon / theme-color | ✅ Conforme | `favicon.svg` + `theme-color` meta sur `#FF4B3E` (crunch). |
| Voix & ton | ✅ Conforme | Tagline reprise mot pour mot dans `URLInput.tsx`. Toasts, états vides et CTA collent au registre "directe, jamais mielleuse" du book. |
| Motif "ruban croqué" | ❌ Absent | Aucune occurrence de scallop/pattern dans `src/` — jamais implémenté en dehors du brand book lui-même. Pas un défaut de conformité (rien ne le contredit), juste une pièce du système jamais construite. |
| Avatars "brigade" | ⚠️ Système parallèle | Palette et style totalement indépendants de la marque (noir/blanc vs. crunch/basil/yolk). À documenter comme choix assumé plutôt que dérive, mais à surveiller si un jour on veut unifier. |
| `src/App.css` | 🧹 Mort | Fichier résiduel du template Vite (couleurs `#646cff`/`#61dafb` hors-marque) — jamais importé nulle part, aucun impact visuel, mais à supprimer plutôt qu'à laisser traîner. |
| Écart mineur book ↔ code | ℹ️ Note | Le book affiche "Papier — #FFF4E3" dans sa planche de swatches, alors que le token réellement implémenté (et cohérent partout dans le code) est `#FFFAF1`. Le code fait foi ci-dessus ; le book n'a pas été corrigé rétroactivement.
