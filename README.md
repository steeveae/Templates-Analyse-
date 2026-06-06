# SCHAET + — Assistant IA documentaire

SCHAET + vous permet de **poser des questions sur vos propres documents** (PDF, Word, PowerPoint, Excel, etc.) grâce à des modèles IA gratuits via [OpenRouter](https://openrouter.ai).

> **Confidentialité** : le texte de vos documents est extrait **localement dans votre navigateur**. Rien n'est envoyé avant que vous ne posiez une question.

---

## Fonctionnalités

- **Import multi-formats** : PDF, DOCX, PPTX, XLSX, RTF, HTML, Markdown, CSV, JSON, code…
- **6 modèles IA gratuits** via OpenRouter (Gemma 4, Llama 3.3, Qwen3, Nemotron, OpenRouter Auto)
- **Thèmes par dossier** : organisez vos documents par thème, sélectionnez le thème actif en un clic
- **Recherche par pertinence** : TF-IDF pour prioriser les documents les plus utiles
- **Sync entre appareils** : uploadez sur PC, accédez depuis le téléphone via Supabase (gratuit)
- **PWA installable** : fonctionne hors-ligne (UI disponible sans réseau)

---

## Démarrage rapide

### 1. Ouvrir l'application

👉 [https://steeveae.github.io/templates-analyse-/](https://steeveae.github.io/templates-analyse-/)

### 2. Clé API OpenRouter (gratuit)

1. Créez un compte sur [openrouter.ai](https://openrouter.ai)
2. Allez dans **Keys** et générez une clé `sk-or-v1-…`
3. Collez-la dans le champ **Clé API** de l'écran de configuration

### 3. Importer vos documents

Glissez vos fichiers ou dossiers dans la zone de dépôt. L'extraction se fait instantanément dans votre navigateur.

### 4. Poser vos questions

Cliquez sur **Lancer SCHAET +** puis posez vos questions. L'assistant cite toujours ses sources.

---

## Sync entre appareils (optionnel)

La fonctionnalité **Sync** vous permet d'uploader des documents sur votre ordinateur et d'y accéder depuis votre téléphone. Elle repose sur [Supabase](https://supabase.com) (compte gratuit).

### Étape 1 — Créer un projet Supabase

1. Créez un compte gratuit sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet (choisissez une région proche de vous)
3. Dans **Settings → API**, copiez :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`)
   - **anon public** key (commence par `eyJ…`)

### Étape 2 — Créer la table des documents

Dans votre projet Supabase, allez dans **SQL Editor** et exécutez le script suivant :

```sql
CREATE TABLE IF NOT EXISTS schaet_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'DOC',
  text        TEXT NOT NULL DEFAULT '',
  size        BIGINT NOT NULL DEFAULT 0,
  truncated   BOOLEAN NOT NULL DEFAULT FALSE,
  included    BOOLEAN NOT NULL DEFAULT TRUE,
  theme       TEXT NOT NULL DEFAULT 'Général',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE schaet_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON schaet_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Étape 3 — Configurer dans SCHAET +

1. Dans l'écran de configuration, dépliez la section **Sync entre appareils**
2. Collez l'URL et la clé anon, puis cliquez **Enregistrer la configuration**
3. Créez un compte ou connectez-vous
4. Vos documents sont désormais synchronisés automatiquement

### Comment ça marche

| Action | Comportement |
|--------|-------------|
| Ajouter un document | Sauvegardé dans le cloud en temps réel |
| Supprimer un document | Supprimé du cloud |
| Se connecter sur un nouveau device | Récupère tous vos documents depuis le cloud |
| Bouton "↓ Récupérer mes docs" | Synchronisation manuelle cloud → local |
| Hors-ligne | Utilise les documents en cache local |

> Vos documents texte extraits sont stockés dans votre base Supabase privée. Chaque utilisateur ne voit que ses propres documents (Row Level Security activée).

---

## Structure du projet

```
├── index.html              # Structure HTML
├── css/style.css           # Styles
├── js/
│   ├── config.js           # Constantes (modèles, limites, clés LS)
│   ├── storage.js          # Persistance localStorage
│   ├── sync.js             # Authentification et sync Supabase
│   ├── extractor.js        # Extraction texte multi-formats
│   ├── context.js          # TF-IDF + construction du prompt
│   ├── api.js              # Appels OpenRouter (streaming)
│   ├── ui.js               # Rendu et composants UI
│   └── app.js              # Logique principale + PWA
├── manifest.json           # Manifeste PWA
├── sw.js                   # Service Worker (cache hors-ligne)
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

---

## Déploiement sur GitHub Pages

1. Allez dans **Settings → Pages** du dépôt
2. Source : **Deploy from a branch**, branche `main`, dossier racine `/`
3. Sauvegardez — l'URL devient disponible après quelques secondes

---

## Avertissement

SCHAET + est un outil d'aide à la lecture de documents. **Il ne remplace pas l'avis d'un professionnel.**
