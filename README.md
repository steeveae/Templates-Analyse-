# MedChat — Assistant médical IA

MedChat est une application web qui vous permet de **poser des questions sur vos propres documents médicaux** (PDF, Word, PowerPoint, Excel, etc.) grâce à des modèles IA gratuits via [OpenRouter](https://openrouter.ai).

> **Confidentialité** : le texte de vos documents est extrait **localement dans votre navigateur**. Rien n'est envoyé au serveur avant que vous ne posiez une question.

---

## Fonctionnalités

- 📄 **Import multi-formats** : PDF, DOCX, PPTX, XLSX, RTF, HTML, Markdown, CSV, JSON, code source, et tout fichier texte
- 🤖 **6 modèles IA gratuits** via OpenRouter (Llama, Gemma, Qwen, Nemotron, OpenRouter Auto)
- 🔍 **Recherche par pertinence** : TF-IDF pour prioriser les documents les plus utiles à chaque question
- 💾 **Persistance locale** : clé API, documents et historique sauvegardés dans localStorage
- 📱 **PWA installable** : fonctionne hors-ligne (UI disponible sans réseau)
- 🌙 **Interface sombre** adaptée à un usage médical

---

## Démarrage rapide

### 1. Ouvrir l'application

👉 [https://steeveae.github.io/templates-analyse-/](https://steeveae.github.io/templates-analyse-/)

### 2. Obtenir une clé API OpenRouter (gratuit)

1. Créez un compte sur [openrouter.ai](https://openrouter.ai)
2. Allez dans **Keys** et générez une clé `sk-or-v1-…`
3. Collez-la dans le champ **Clé API** de l'écran de configuration

### 3. Importer vos documents

Glissez vos fichiers dans la zone de dépôt ou cliquez pour parcourir. L'extraction du texte se fait immédiatement dans votre navigateur.

### 4. Poser vos questions

Cliquez sur **Lancer MedChat** puis posez vos questions. L'assistant cite toujours ses sources.

---

## Déploiement sur GitHub Pages

1. Allez dans **Settings → Pages** du dépôt
2. Source : **Deploy from a branch**, branche `main`, dossier racine `/`
3. Sauvegardez — l'URL devient disponible après quelques secondes

---

## Structure du projet

```
├── index.html          # Structure HTML
├── css/style.css       # Styles
├── js/
│   ├── config.js       # Constantes (modèles, limites)
│   ├── storage.js      # Persistance localStorage
│   ├── extractor.js    # Extraction texte multi-formats
│   ├── context.js      # TF-IDF + construction du prompt
│   ├── api.js          # Appels OpenRouter
│   ├── ui.js           # Rendu et composants UI
│   └── app.js          # Logique principale + PWA
├── manifest.json       # Manifeste PWA
├── sw.js               # Service Worker (cache hors-ligne)
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

---

## Avertissement médical

MedChat est un outil d'aide à la lecture de documents et **ne remplace pas l'avis d'un professionnel de santé**. Les réponses générées sont basées uniquement sur les documents fournis.
