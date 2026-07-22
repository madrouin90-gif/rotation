# Rotation

Partage musical entre amis. Chaque membre d'un groupe dispose de quelques slots pour partager ses chansons, albums ou artistes du moment via des liens Spotify. Pas de scroll infini — une sélection curée par personne.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres) — accès uniquement côté serveur (clé `service_role`, jamais exposée au client)
- oEmbed public de Spotify (`https://open.spotify.com/oembed`) — aucune clé API Spotify nécessaire
- @dnd-kit pour le drag-and-drop (souris + tactile)

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte / connecte-toi.
2. Clique sur **New project**, choisis un nom, un mot de passe de base de données et une région, puis attends la fin du provisionnement (~2 min).
3. Une fois le projet prêt, ouvre l'onglet **SQL Editor** dans le menu de gauche.
4. Copie tout le contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) de ce dépôt, colle-le dans l'éditeur SQL, puis clique sur **Run**. Cela crée les tables `groups`, `members`, `items`, `shares`, `reactions` avec leurs contraintes et active la Row Level Security (RLS) sans policy publique — seule la clé `service_role`, utilisée uniquement côté serveur, peut lire/écrire.
5. Va dans **Project Settings > API**. Tu y trouveras :
   - **Project URL** → variable `SUPABASE_URL`
   - **service_role secret** (⚠️ à garder secrète, ne jamais l'exposer côté client) → variable `SUPABASE_SERVICE_ROLE_KEY`

## 2. Variables d'environnement

Copie le fichier d'exemple puis remplis-le avec les valeurs récupérées à l'étape précédente :

```bash
cp .env.local.example .env.local
```

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`.env.local` est ignoré par git (voir `.gitignore`) — ne le commite jamais.

## 3. Lancer le projet en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Crée un groupe, copie le code à 6 caractères généré, et ouvre un autre navigateur (ou une fenêtre de navigation privée) pour rejoindre le groupe avec un second profil et tester le partage entre plusieurs membres.

## 4. Déploiement sur Vercel

1. Pousse ce dépôt sur GitHub (`git remote add origin ...` puis `git push -u origin main`).
2. Va sur [vercel.com](https://vercel.com), clique sur **Add New > Project**, et importe le dépôt GitHub.
3. Dans les **Environment Variables** du projet Vercel, ajoute :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique sur **Deploy**. Vercel détecte automatiquement Next.js — aucune configuration supplémentaire n'est nécessaire.
5. Une fois déployé, partage l'URL Vercel à tes amis avec le code du groupe pour qu'ils puissent le rejoindre.

## Fonctionnement

- **Aucun mot de passe.** Créer ou rejoindre un groupe génère un token secret stocké dans le `localStorage` du navigateur, envoyé à chaque requête API pour identifier le membre côté serveur.
- **Tout le comportement du groupe est configurable** (nombre de slots, membres max, durée du badge « Nouveau », longueur des notes, emojis de réaction, tri par défaut, visibilité des archives, mise en évidence du top pick, types de contenus autorisés) via le panneau **Réglages**, accessible à l'admin du groupe. Les valeurs sont stockées en base (colonne `settings` JSONB de la table `groups`) — rien n'est codé en dur.
- **La date de 1er ajout d'un item est permanente** : si tu repartages en juillet un album déjà partagé en janvier, la date affichée reste celle de janvier.

## Structure du projet

```
supabase/schema.sql      Schéma SQL à exécuter dans Supabase
src/app/                 Pages (App Router) et routes API
src/components/          Composants React réutilisables
src/lib/                 Logique serveur (Supabase, auth, settings, Spotify...) et utilitaires partagés
src/hooks/               Hooks client (session membre, données de groupe)
src/types/               Types TypeScript partagés
```
