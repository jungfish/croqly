# Analyse de marché — Croqly & pistes de diversification

## Le système générique

Croqly repose sur un pipeline réutilisable :

```
Scraping vidéo social (Apify) → Transcription → Structuration LLM (Mistral/OpenAI)
→ Génération d'illustration IA → Page SEO (JSON-LD schema.org) → Hub créateurs
```

Ce qui se réutilise presque tel quel d'une verticale à l'autre : tout sauf le schema.org
spécifique et le prompt de structuration. Ce document compare le marché "recettes"
(actuel) à trois pistes de diversification en micro-SaaS low-effort : cocktails,
itinéraires de voyage, bricolage/DIY.

## Constat clé

Le schema.org `Recipe` reste l'un des derniers rich results encore valorisés par
Google (carrousels, étoiles, temps de cuisson). À l'inverse, `HowTo` a été
**totalement déprécié côté Google** (désactivé sur mobile en août 2023, sur
desktop en septembre 2023, confirmé toujours mort en 2026) — un schema valide
selon schema.org mais qui ne produit plus aucun gain SERP. Ce point élimine une
grande partie de l'avantage SEO attendu de la piste bricolage.

## Tableau comparatif

| Critère | **Croqly (actuel — recettes)** | **Cocktails** | **Voyage / itinéraires** | **Bricolage / DIY** |
|---|---|---|---|---|
| Reuse technique du pipeline | — (baseline) | ~95% — même schema `Recipe`, même transcription | ~50-60% — modèle de données à refaire (jours/lieux/coordonnées vs étapes/ingrédients), intégration cartes probable | ~85% — étapes + liste de matériel proche du modèle recette |
| Rich results Google | ✅ Recipe — encore fort | ✅ Recipe — même bénéfice | ⚠️ Pas d'équivalent natif solide (ItemList/TouristTrip, faible lift) | ❌ HowTo mort depuis 2023 — zéro gain SEO structuré |
| Monétisation réaliste | Display ads (Mediavine/Raptive) : $15-40 RPM, seuil 50k sessions/mois requis | Ads probablement OK, mais affiliation alcool très restreinte (Google/Meta limitent la pub, mentions légales obligatoires) → repli sur affiliation ustensiles/sirops | Affiliation correcte mais commissions faibles et cookies courts (Booking 7,2%/24h, GetYourGuide 8-10%) | Amazon Associates ~3-4,5% sur outillage/déco, marché >1000 Md$ mais sans levier SEO structuré |
| Volume de contenu source (Reels/TikTok) | Énorme | Solide mais plus petit | Énorme | Solide |
| Concurrence | Très saturée (AllRecipes, Marmiton, Tasty...) — wedge = auto-génération + créateurs | Moins saturée (Liquor.com, Punch, Difford's) | Féroce + multiplication des IA travel planners (Wonderplan, Layla...) | Modérée, marché énorme mais dispersé |
| Friction légale / compliance | Faible | Réelle — vérification d'âge, mentions "consommer avec modération", restrictions pub par pays | Faible | Réelle — responsabilité si conseil DIY mal exécuté (élec/structure), disclaimers nécessaires |

## Verdict par piste

- **Cocktails** — le fork le plus simple à construire (quasi un clone du pipeline
  actuel), mais le canal de monétisation le plus naturel pour ce contenu —
  l'affiliation avec des marques d'alcool — est le plus verrouillé légalement.
  Reste jouable via ads + affiliation accessoires (verrerie, sirops, bitters),
  mais moins évident que prévu au premier abord.
- **Voyage** — marché et commissions réels, mais c'est la piste qui demande le
  plus de travail d'adaptation (modèle de données différent, pas de rich
  snippet natif solide) sur un terrain déjà saturé d'outils IA de planification
  de voyage.
- **Bricolage** — la dépréciation de HowTo change la donne : sans rich results,
  il faut driver le trafic uniquement par contenu/backlinks/réseaux sociaux,
  sans le boost SEO structuré qui fait la force du modèle recette. L'affiliation
  Amazon reste correcte mais à des taux plus bas qu'anticipé.

## Conclusion

Aucune des trois pistes ne bat le modèle recette sur le rapport effort/résultat,
précisément parce que `Recipe` reste l'un des rares schémas encore récompensés
par Google. Si diversification il y a en gardant l'avantage SEO structuré et un
effort de fork minimal, **cocktails reste le meilleur candidat malgré la
friction légale** — à condition de monétiser via ads/affiliation non-alcool
plutôt que via les marques de spiritueux.

## Sources

- [Food Blog Income Streams in 2026](https://www.jupiter.co/blog/how-food-bloggers-make-money)
- [How Much Do Food Bloggers Make? (2026 Data)](https://recipecard.io/blog/how-much-do-food-bloggers-make/)
- [17 Best Alcohol Affiliate Programs (2026)](https://uppromote.com/affiliate-programs/alcohol/)
- [Restricted Content: Alcohol – AdRoll](https://help.adroll.com/hc/en-us/articles/360031225551-Restricted-Content-and-Practices-Alcohol)
- [GetYourGuide Affiliate Program Commissions](https://uppromote.com/affiliate-directory/getyourguide/)
- [Decoding Affiliate Commission Rates for Travel Creators](https://trekguider.com/insights/decoding-affiliate-commission-rates-benchmarks-for-travel-creators)
- [The 19 Best Home Improvement Affiliate Programs of 2025](https://getlasso.co/niche/home-improvement/)
- [Amazon Affiliate Program Guide 2025](https://www.greatinspire.com/amazon-affiliate-program-complete-guide-to-earning-passive-income-in-2025/)
- [FAQ Rich Results Deprecated: Google's May 2026 Change](https://www.getpassionfruit.com/blog/what-changed-with-google-drops-faq-rich-results-and-what-to-do-now)
- [Google Structured Data Removals: 2026 Guide](https://www.relevantaudience.com/seo/google-removes-structured-data-2025-guide-for-websites/)
