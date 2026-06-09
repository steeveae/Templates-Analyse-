# Gabon Occaz – Guide de déploiement Cloudflare Pages

## Prérequis
- Node.js 18+ installé
- Un compte Cloudflare (gratuit)
- Un projet Supabase (gratuit)

---

## Étape 1 — Initialiser le projet en local

```bash
npm install
cp .env.local.example .env.local
```

Éditez `.env.local` avec vos clés Supabase (dashboard → Settings → API).

## Étape 2 — Créer les tables Supabase

1. Dashboard Supabase → **SQL Editor**
2. Collez le contenu de `supabase/schema.sql`
3. Cliquez **Run**

## Étape 3 — Déployer sur Cloudflare Pages

### Option A : Via CLI Wrangler (recommandé)

```bash
npx wrangler login
npm run deploy
```

Puis ajoutez les variables d'environnement dans le dashboard Cloudflare
(Workers & Pages → votre projet → Settings → Environment variables) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option B : Via le dashboard (connexion Git)

1. Poussez ce dossier sur un dépôt GitHub
2. Cloudflare → **Workers & Pages** → onglet **Pages** → *Connect to Git*
3. Paramètres de build :
   - **Build command** : `npx @cloudflare/next-on-pages`
   - **Build output directory** : `.vercel/output/static`
4. Ajoutez les 2 variables d'environnement ci-dessus
5. **Save and Deploy**

---

## Lancer en local

```bash
npm run dev
# → http://localhost:3000
```

## Notes

- La page d'accueil fonctionne sans Supabase (données fictives intégrées)
- Le formulaire d'alertes nécessite Supabase pour persister les données
- Aucun paiement n'est traité – zéro risque légal COBAC
