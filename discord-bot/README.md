# Bot Discord — Rotation

Petit bot qui surveille un salon Discord relié à un groupe Rotation : dès qu'un lien Spotify
(chanson, album ou artiste) est posté par un membre ayant lié son compte Discord, la chanson
est automatiquement ajoutée à son profil Rotation.

Ce bot est un processus **toujours actif**, séparé de l'app Next.js (qui tourne sur Vercel en
serverless et ne peut pas maintenir une connexion websocket Discord). Il ne touche jamais
Supabase directement — il appelle l'API publique de l'app via `POST /api/discord/share`.

## 1. Créer l'application Discord

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (`DISCORD_BOT_TOKEN`).
3. Toujours sous **Bot** → active l'intent privilégié **MESSAGE CONTENT INTENT** (indispensable,
   sinon le bot ne reçoit jamais le texte des messages).
4. Onglet **OAuth2** → note le **Client ID** : c'est la valeur à mettre dans
   `NEXT_PUBLIC_DISCORD_CLIENT_ID` / `DISCORD_CLIENT_ID` côté app Rotation (utilisé pour le lien
   de liaison de compte des membres ET le lien d'invitation du bot dans les réglages du groupe).

## 2. Configurer les variables d'environnement

Copie `.env.example` en `.env` et remplis :

- `DISCORD_BOT_TOKEN` — le token du bot (étape 1).
- `ROTATION_API_BASE_URL` — l'URL publique de l'app Rotation (ex. `https://rotation-gules.vercel.app`).
- `DISCORD_BOT_SECRET` — une valeur aléatoire longue, **identique** à `DISCORD_BOT_SECRET` dans
  les variables d'environnement de l'app Rotation (Vercel).

En local : `node --env-file=.env src/index.js`.

## 3. Déployer sur Railway

1. Nouveau projet Railway → **Deploy from GitHub repo** (ce dépôt).
2. Dans les réglages du service : **Root Directory** = `discord-bot/`.
3. Start command : `node src/index.js` (ou laisse Railway détecter `npm start`).
4. Ajoute les 3 variables d'environnement ci-dessus dans l'onglet **Variables**.
5. Déploie — les logs doivent afficher `Bot Rotation connecté en tant que ...`.

## 4. Inviter le bot et lier un salon

Depuis les réglages d'un groupe Rotation (admin), section **Discord** :
- clique sur "Inviter le bot" pour l'ajouter à ton serveur (permissions : voir les salons,
  envoyer des messages, lire l'historique, ajouter des réactions) ;
- copie l'ID du serveur et l'ID du salon voulu (mode développeur Discord requis pour "Copier
  l'ID") et enregistre-les dans les réglages du groupe.

Chaque membre lie ensuite son propre compte Discord depuis sa page profil Rotation.

## Comportement

- ✅ — chanson ajoutée avec succès.
- ⚠️ + réponse — les emplacements du membre sont pleins, il doit en remplacer un dans l'app.
- ❓ — l'auteur du message n'a pas encore lié son compte Discord à ce groupe.
- Rien — le salon n'est lié à aucun groupe Rotation (ignoré silencieusement).
- ❌ — erreur inattendue (type de contenu refusé par les réglages du groupe, etc.).
