# CV Builder

Application Next.js / React / TypeScript pour créer des CV, enregistrer des versions, recevoir une aide IA, compiler un PDF LaTeX et publier un instantané. **Vercel reste l'hébergement de production.**

## Développement

Node.js 22.x (au moins 22.16) et pnpm 10.13.1 sont requis. La version majeure Node est fixée pour Vercel, et les scripts d'installation des dépendances nécessaires sont autorisés explicitement.

```sh
pnpm install --frozen-lockfile
```

Copier `.env.example` vers `.env.local`, renseigner les variables existantes, puis lancer `pnpm dev`. Le déploiement d'origine avec `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` est accepté. Une clé serveur configurée prend la priorité et reste exclusivement côté serveur. Le mode email `console` affiche un lien de connexion dans l'interface de développement ; utiliser SMTP ou Resend en production.

La base existante issue de 001/002 est reconnue automatiquement ; aucune nouvelle variable ni migration n'est imposée pour conserver ce déploiement. Les migrations 003/004 et leur clé serveur permettent d'opter pour le mode à permissions restreintes et opérations transactionnelles. Lire [la procédure de migration et de reprise](docs/hardening-deployment.md) avant de choisir ce mode : les anciens binaires ne doivent plus écrire après la migration de sécurité.

## Parcours et organisation

Galerie → connexion par email → tableau de bord → création → éditeur → versions → export et partage. Les seize modèles possèdent des structures et hiérarchies différentes. Le bouton **Style** permet de choisir une palette et une typographie ; ces préférences font partie du CV sauvegardé.

| Emplacement | Responsabilité |
| --- | --- |
| `lib/validation/cv.ts`, `lib/types/cv.ts` | Contrat de contenu validé à l'exécution et types TypeScript dérivés |
| `lib/db`, `scripts/003-*.sql`, `scripts/004-*.sql` | Accès serveur, propriétaires, transactions, brouillons et historique immuable |
| `lib/autosave.ts` | File de sauvegarde sérialisée et contrôle des révisions |
| `lib/templates.ts`, `lib/latex/generator.ts` | Catalogue, palettes et génération LaTeX des vingt-quatre modèles |
| `lib/pdf` | Compilation native, comptage des pages, débordement et cache borné |
| `lib/ai` | Fournisseur configurable, contrats JSON, recommandations factuelles et secours local explicite |
| `lib/server`, `proxy.ts` | Sessions, origines, validation des requêtes et quotas distribués |
| `tests` | Tests unitaires, PostgreSQL isolé, PDF réels et parcours navigateur |

Un brouillon n'est pas une version historique. Un partage publie une copie figée, pas les modifications privées suivantes. Restaurer copie une version vers le brouillon sans modifier l'historique. Les conflits interdisent l'écrasement automatique et permettent de télécharger une copie locale.

## Vérifications

```sh
pnpm typecheck
pnpm lint --max-warnings 0
pnpm test
pnpm test:pdf
pnpm build
pnpm check:bundles
pnpm test:e2e
pnpm test:production
pnpm test:production:legacy
pnpm audit --prod
```

Les tests applicatifs utilisent PostgreSQL embarqué et un serveur Supabase REST de test isolé ; ils n'utilisent ni la base de production ni ses emails. Installer Chromium avec `pnpm exec playwright install chromium` pour les parcours navigateur. Les tests PDF nécessitent un moteur LaTeX réellement fonctionnel et des polices/packages disponibles. La CI installe TeX Live et vérifie aussi les positions des caractères avec `scripts/check-pdf-layout.py`.

`pnpm templates:generate` régénère les aperçus WEBP à partir des PDF réels. Relancer cette commande après toute modification du générateur, du catalogue ou du CV de démonstration ; les tests détectent les aperçus périmés.

`pnpm test:ai:live` est un contrôle réseau volontaire : il utilise uniquement le CV fictif, vérifie analyse/adaptation/condensation et échoue si le secours local a remplacé le fournisseur. Groq est choisi si sa clé existe, sinon la configuration OpenRouter existante est utilisée. Les tests ordinaires désactivent les deux fournisseurs ou simulent leurs réponses HTTP.

## Production

Suivre [VERCEL.md](VERCEL.md) et [la documentation PDF](docs/deployment-latex.md). La présence de clés ou un endpoint de santé vert ne prouvent pas la réception d'emails, les permissions Supabase ou une compilation à froid sur Vercel. Le [rapport d'ingénierie](docs/engineering-report.md) distingue les vérifications réalisées des contrôles restant à exécuter sur le déploiement.
