# Creator Hub — décisions produit & business

> Compilé depuis la conversation de planification SEO du 21/07/2026, pour ne pas re-débattre ces points à chaque itération. Voir aussi [competitor-analysis.md](./competitor-analysis.md) pour le contexte marché.

## Le positionnement

Plutôt que de concurrencer sur l'extraction (segment commoditisé, cf. analyse concurrentielle) ou sur la distribution fermée (app/lien social, comme Dishy/KitChef), Croqly se différencie en construisant des **pages publiques indexables par créateur** (`/createurs/:handle`), riches en schema.org, pour capter la recherche organique ("recettes de X") — un canal qu'aucun des deux concurrents les plus proches n'exploite.

## Risque juridique — pourquoi le modèle est "opt-in a posteriori", pas du scraping silencieux

Republier les recettes/photos d'un compte Instagram sans l'accord du créateur pose un vrai risque, pas juste théorique :
- **Droit d'auteur** : les photos sont protégées à coup sûr ; le texte exact d'une recette (formulation, mise en forme) aussi souvent — mais la liste d'ingrédients brute et les étapes factuelles ne le sont pas, donc une fiche réécrite avec ses propres mots est nettement plus défendable qu'un copier-coller de la légende.
- **Parasitisme économique** (doctrine française établie) : utiliser le nom/la notoriété d'un créateur pour capter du trafic SEO sans son accord peut être qualifié de faute même sans contrefaçon stricte.
- **CGU Instagram** : le scraping de contenu est interdit contractuellement — pas pénal, mais expose à une mise en demeure/blocage.
- **Ce qui est plus sûr sans accord signé** : l'embed officiel Instagram (oEmbed) — la photo/vidéo reste hébergée chez Instagram, pas de reproduction ; ça inclut nativement pseudo/avatar/lien de profil, donc attribution de facto. Contrainte : si le créateur supprime le post ou passe en privé, l'embed casse — il garde un droit de retrait de fait.

**Décision actée : modèle "notifie puis publie", pas "publie puis attends la plainte".** Chaque page prévient (ou a un chemin direct de retrait) plutôt que de compter sur le silence du créateur. Concrètement :
1. Bandeau de claim sur chaque page ("Cette page est la tienne ? Viens la faire tienne") — transforme un créateur mécontent en utilisateur actif plutôt qu'en contentieux, et sert de canal d'acquisition.
2. SLA de retrait rapide et visible (24-48h) — la bonne foi démontrée est un facteur explicitement regardé par les tribunaux français dans les dossiers de parasitisme.
3. Formulation prudente : "Recette inspirée du compte X", jamais "le livre de recettes officiel de X" — évite toute confusion d'affiliation.
4. Rollout progressif (10-15 comptes d'abord), pas des centaines de pages d'un coup, pour observer les réactions avant de scaler.
5. **Ne pas monétiser directement (pub, affiliation) sur les pages non revendiquées** — voir monétisation ci-dessous.

## Monétisation — classement par ratio effort/risque/rendement

Le principe directeur : les pages SEO sont un **funnel gratuit** vers le vrai produit, pas la source de revenu elle-même — ça élimine le nœud du problème juridique (monétiser directement le contenu d'un tiers non consentant).

1. **Funnel vers l'app Croqly** (le plus solide). Le trafic "recettes de X" convertit en inscription app ; l'abonnement premium Croqly est le vrai revenu. Zéro tension légale.
2. **Liste de courses / meal-planning premium** — gratuit pour 1 recette, payant pour la fonction illimitée ou multi-recettes. Réutilise ce que le produit sait déjà faire.
3. **Affiliation e-commerce alimentaire à haute intention** (Monoprix/Carrefour/Amazon Fresh, ustensiles cités) — gain rapide à greffer sur les fiches existantes, intention d'achat plus forte qu'une pub display classique.
4. **Recettes sponsorisées par des marques alimentaires** une fois qu'il y a du volume — ne dépend pas de l'accord du créateur.
5. **Compilation payante (ebook) avec les créateurs opt-in** — sous-ensemble qui a formellement accepté, donc sans ambiguïté légale.
6. **Insights B2B pour marques** ("quelles recettes/ingrédients tendent ce mois-ci") — vendu comme veille tendance sur données agrégées, découplé du contenu republié lui-même.

Priorité : #1 et #2 réutilisent l'existant et évitent le nœud légal ; #3 est un gain rapide ; #4 et #6 sont de bons compléments une fois le volume atteint.

## Lecteur vidéo — stratégie à deux niveaux

Une expérience vidéo "avancée" (chapitrage, seek synchronisé par étape) implique de réhéberger la vidéo soi-même — c'est justement le réhébergement, pas le simple référencement, qui est le plus exposé légalement sans accord. Solution : en faire le levier de conversion du claim plutôt qu'un problème.

- **Niveau 1 — page non revendiquée** : lecteur = embed officiel Instagram (oEmbed), inchangé, donc aucune reproduction de vidéo. La valeur ajoutée vient d'autour : ingrédients structurés, étapes numérotées à cocher, minuteur, conversion de quantités, schema.org — déjà mieux que ce qu'Instagram propose nativement.
- **Niveau 2 — page revendiquée (post-claim)** : réhébergement possible (upload direct par le créateur ou droit d'usage explicite), débloque le lecteur avancé — chapitrage, seek synchronisé, mode "cuisine sans les mains". C'est l'argument numéro 1 pour convaincre un créateur de revendiquer sa page plutôt qu'un simple bouton de retrait.

*(Ce niveau 2 — réhébergement vidéo — n'est pas encore implémenté ; le claim actuel, cf. `server/routes/creators.ts`, ne fait que passer `claimed` à `true` via vérification de code dans la bio Instagram.)*
