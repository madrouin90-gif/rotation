# Rotation

Partage musical entre amis. Chaque membre d'un groupe dispose de quelques slots pour partager ses chansons, albums ou artistes du moment via des liens Spotify. Pas de scroll infini — une sélection curée par personne.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS 4
- Supabase (Postgres) — accès uniquement côté serveur (clé `service_role`, jamais exposée au client)
- oEmbed public de Spotify (`https://open.spotify.com/oembed`) — aucune clé API Spotify nécessaire
- @dnd-kit pour le drag-and-drop (souris + tactile)
- Vitest pour les tests unitaires
- Resend (courriels) et Upstash Redis (rate limiting) — optionnels, voir plus bas

## Fonctionnalités

- 5 slots par membre (configurable), partage de chansons/albums/artistes Spotify
- Réactions, notation entre membres (/10, agrégée /100) et palmarès du groupe (paginé)
- Historique filtrable (membre, genre, date) et barre d'activité récente
- Commentaires persistants et favoris privés par membre
- Groupes publics (annuaire) ou privés (code à 6 caractères), avec approbation optionnelle des nouvelles demandes
- 2 thèmes d'affichage (clair et sombre), persistants par appareil
- Compte super-admin plateforme (tableau de bord `/admin`, hors du parcours normal) avec journal d'audit
- Courriel optionnel par membre (vérifié par lien), digest hebdomadaire des nouveautés du groupe
- Intégration Discord optionnelle : un membre lie son compte (OAuth2), un groupe se relie à un salon, et un bot (déployé séparément, voir `discord-bot/`) ajoute automatiquement à son profil tout lien Spotify qu'il poste dans ce salon
- PWA installable (icône sur l'écran d'accueil) avec notifications push (Web Push/VAPID) : l'admin choisit par groupe quels événements notifient (partage, chat, réaction, demande d'adhésion), chaque membre active les notifications sur son appareil depuis son profil
- Sécurité : sessions révocables, mots de passe hachés (scrypt), verrouillage après tentatives de connexion répétées, rate limiting par IP
- Mises à jour quasi temps réel par polling (avec cache ETag/304 et repli progressif en cas d'erreur réseau)

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte / connecte-toi.
2. Clique sur **New project**, choisis un nom, un mot de passe de base de données et une région, puis attends la fin du provisionnement (~2 min).
3. Une fois le projet prêt, ouvre l'onglet **SQL Editor** dans le menu de gauche.
4. Copie tout le contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) de ce dépôt, colle-le dans l'éditeur SQL, puis clique sur **Run**. Le fichier est idempotent — tu peux le réexécuter en entier sans risque à chaque mise à jour du schéma (le dossier [`supabase/migrations/`](./supabase/migrations/) documente chaque delta individuellement, mais `schema.sql` seul suffit).
5. Va dans **Project Settings > API**. Tu y trouveras :
   - **Project URL** → variable `SUPABASE_URL`
   - **service_role secret** (⚠️ à garder secrète, ne jamais l'exposer côté client) → variable `SUPABASE_SERVICE_ROLE_KEY`

## 2. Variables d'environnement

Copie le fichier d'exemple puis remplis-le :

```bash
cp .env.local.example .env.local
```

**Obligatoires** :

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Optionnelles** — chacune dégrade silencieusement en no-op si absente, rien ne casse :

| Variable | Sert à | Sans elle |
|---|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Envoi des courriels (vérification, digest) | Aucun courriel envoyé, tout le reste fonctionne |
| `APP_BASE_URL` | Construire les liens dans les courriels | Retombe sur `http://localhost:3000` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting par IP | Aucune limite appliquée |
| `CRON_SECRET` | Sécurise `/api/cron/weekly-digest` | L'endpoint refuse toute requête (401) |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Lien de compte Discord (OAuth2) | Section Discord des réglages/profil non fonctionnelle |
| `DISCORD_BOT_SECRET` | Sécurise `/api/discord/share` (appelé par le bot) | L'endpoint refuse toute requête (401) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Notifications push (Web Push) | Personne ne peut activer les notifications, tout le reste fonctionne |

`.env.local` est ignoré par git (voir `.gitignore`) — ne le commite jamais.

## 3. Lancer le projet en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Crée un groupe, copie le code à 6 caractères généré, et ouvre un autre navigateur (ou une fenêtre de navigation privée) pour rejoindre le groupe avec un second profil et tester le partage entre plusieurs membres.

### Tests et vérifications

```bash
npm run lint    # ESLint
npm run build   # build de production + vérification TypeScript
npm run test    # tests unitaires (Vitest)
```

## 4. Déploiement sur Vercel

1. Pousse ce dépôt sur GitHub (`git remote add origin ...` puis `git push -u origin main`).
2. Va sur [vercel.com](https://vercel.com), clique sur **Add New > Project**, et importe le dépôt GitHub.
3. Dans les **Environment Variables** du projet Vercel, ajoute au minimum `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (et les variables optionnelles ci-dessus si tu veux activer les courriels/le rate limiting/le cron). Ces variables ne se transfèrent **pas** automatiquement depuis `.env.local` — il faut les ajouter séparément sur Vercel.
4. Clique sur **Deploy**. Vercel détecte automatiquement Next.js, ainsi que la tâche planifiée définie dans [`vercel.json`](./vercel.json) (digest hebdomadaire, vendredi 16h UTC).
5. Une fois déployé, partage l'URL Vercel à tes amis avec le code du groupe pour qu'ils puissent le rejoindre.

## 5. Intégration Discord (optionnelle)

Permet à un groupe d'être relié à un salon Discord : les membres qui lient leur compte voient
leurs liens Spotify postés dans ce salon automatiquement ajoutés à leur profil Rotation.

1. Crée une application sur le [Discord Developer Portal](https://discord.com/developers/applications), récupère son **Client ID** / **Client Secret**, et ajoute `${APP_BASE_URL}/api/account/discord/callback` comme redirect URI OAuth2 autorisée.
2. Renseigne `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXT_PUBLIC_DISCORD_CLIENT_ID` (même valeur que le Client ID) et un `DISCORD_BOT_SECRET` (valeur aléatoire longue) dans les variables d'environnement de l'app.
3. Déploie le bot séparément (processus toujours actif — Vercel ne peut pas maintenir de connexion Discord) : voir [`discord-bot/README.md`](./discord-bot/README.md) pour la configuration complète et le déploiement sur Railway.
4. Dans les réglages d'un groupe (admin), section **Discord**, invite le bot et renseigne l'ID du serveur et du salon à relier.
5. Chaque membre lie son compte Discord depuis sa page profil.

## 6. Notifications push (optionnelles)

1. Génère une paire de clés VAPID : `npx web-push generate-vapid-keys`.
2. Renseigne `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:toi@exemple.com`) et `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (même valeur que `VAPID_PUBLIC_KEY`) dans les variables d'environnement de l'app.
3. Dans les réglages d'un groupe (admin), section **Notifications push**, active les types d'événements souhaités.
4. Chaque membre active les notifications depuis sa page profil (bouton « Activer les notifications » — demande la permission du navigateur).
5. L'app est aussi installable (icône sur l'écran d'accueil mobile/desktop) : bouton d'installation natif sur Android/desktop Chrome, ou « Partager → Sur l'écran d'accueil » depuis Safari sur iOS/iPadOS (`src/app/apple-icon.png`, généré à partir du logo).

### Notifications sur iPhone/iPad (iOS)

iOS n'autorise le Web Push **que pour les apps installées sur l'écran d'accueil** (restriction d'Apple, iOS 16.4+ minimum) — impossible d'activer les notifications depuis un onglet Safari classique. Étapes :

1. Ouvre le site dans **Safari** (pas Chrome — sur iOS, tous les navigateurs utilisent le moteur Safari, mais l'installation doit passer par lui).
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Ouvre l'app depuis l'icône ajoutée à l'écran d'accueil (pas depuis un onglet Safari).
4. Va dans ton profil → « Activer les notifications » → accepte la permission.

## Fonctionnement

- **Authentification par sessions révocables.** Créer ou rejoindre un groupe génère un token secret stocké dans le `localStorage` du navigateur. Le serveur ne stocke jamais ce token en clair : seul son hash SHA-256 est conservé dans la table `sessions`, ce qui permet de révoquer une session précise (ex. changer son mot de passe déconnecte les autres appareils) sans invalider les autres. Le super-admin utilise le même mécanisme via un cookie httpOnly plutôt qu'un header.
- **Toutes les écritures multi-étapes passent par des fonctions Postgres atomiques** (`create_group_with_owner`, `place_share`, `delete_share_compact`, `reorder_shares`, `apply_slot_reduction`), appelées via `supabaseAdmin.rpc(...)`, pour éviter les incohérences en cas d'actions concurrentes (ex. deux ajouts simultanés dans le dernier slot libre).
- **Tout le comportement du groupe est configurable** (nombre de slots, membres max, durée du badge « Nouveau », longueur des notes, emojis de réaction, tri par défaut, visibilité des archives, mise en évidence du top pick, types de contenus autorisés, genres, visibilité publique/privée, approbation des adhésions) via le panneau **Réglages**, accessible à l'admin du groupe. Les valeurs sont stockées en base (colonne `settings` JSONB de la table `groups`) — rien n'est codé en dur.
- **La date de 1er ajout d'un item est permanente** : si tu repartages en juillet un album déjà partagé en janvier, la date affichée reste celle de janvier.

## Structure du projet

```
supabase/schema.sql       Schéma SQL complet (idempotent) à exécuter dans Supabase
supabase/migrations/      Deltas individuels documentant chaque changement de schéma
vercel.json                Configuration des tâches planifiées (cron)
src/app/                  Pages (App Router) et routes API
src/app/api/admin/         Routes du tableau de bord super-admin
src/app/api/cron/          Tâches planifiées (digest hebdomadaire)
src/app/api/discord/        Endpoint interne appelé par le bot Discord
src/app/manifest.ts         Manifest PWA (App Router)
public/sw.js                Service worker (push, notificationclick, cache hors-ligne minimal)
src/components/            Composants React réutilisables
src/lib/                   Logique serveur (Supabase, auth, sessions, email, rate limit, settings, Spotify, notifications push...) et utilitaires partagés
src/hooks/                 Hooks client (session membre, données de groupe avec polling)
src/types/                 Types TypeScript partagés
discord-bot/               Bot Discord — sous-projet Node à part, déployé séparément (Railway)
```
