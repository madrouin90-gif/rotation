import Link from "next/link";

const SECTIONS = [
  {
    title: "Les slots et le top pick",
    body: [
      "Chaque membre dispose d'un nombre fixe de « slots » (par défaut 5, réglable par l'admin) pour partager des chansons, albums ou artistes Spotify. C'est volontairement limité : pas de scroll infini, juste ce qui compte vraiment pour toi en ce moment.",
      "Quand tu ajoutes un nouveau partage alors que tes slots sont pleins, le plus ancien est archivé automatiquement pour faire de la place.",
      "Le slot n°1 de chaque membre est mis en évidence (« top pick ») si l'admin a activé cette option dans les réglages.",
      "Tu peux réorganiser tes partages par glisser-déposer directement sur le mur du groupe.",
    ],
  },
  {
    title: "Réactions",
    body: [
      "Les autres membres du groupe peuvent réagir à tes partages avec un des emojis définis par l'admin (par défaut 🔥 ❤️ 🎯 😭 🤯).",
      "Une réaction par personne par partage — clique à nouveau pour la retirer.",
    ],
  },
  {
    title: "Notation et palmarès",
    body: [
      "Chaque chanson/album/artiste peut être noté de 0 à 10 par chaque membre du groupe. La note affichée est la moyenne de tous les votes, sur 100.",
      "La note est attachée à l'item lui-même (pas au partage) : si quelqu'un repartage la même chanson plus tard, les votes précédents restent visibles.",
      "Le Palmarès (icône 🏆) classe tous les items du groupe par note moyenne, tous partages confondus.",
    ],
  },
  {
    title: "Historique et filtres",
    body: [
      "L'Historique (icône 🕒) liste tous les partages du groupe dans l'ordre chronologique, avec un lien direct vers Spotify sur chaque ligne.",
      "Tu peux filtrer par membre (sélection multiple), par genre musical et par plage de dates.",
      "La barre latérale « Activité récente » montre en continu les ~30 derniers partages du groupe, avec liens cliquables également.",
      "La page se met à jour automatiquement toutes les quelques secondes tant que l'onglet est actif — inutile de rafraîchir manuellement.",
    ],
  },
  {
    title: "Réglages du groupe (admin)",
    body: [
      "L'admin d'un groupe peut ajuster : le nombre de slots par membre, le nombre maximum de membres, la durée du badge « Nouveau », la longueur max des notes, le jeu de réactions disponibles, le tri par défaut du mur, les types de contenu autorisés (chansons/albums/artistes) et la liste des genres musicaux.",
      "L'admin choisit aussi si le groupe est public (listé dans l'annuaire à la connexion) ou privé (accessible seulement avec le code à 6 caractères), et si les nouvelles demandes d'adhésion doivent être approuvées manuellement.",
      "Le créateur original du groupe (le « owner ») peut désigner d'autres membres comme admin.",
      "Un admin peut désactiver ou renommer un membre ; un membre désactivé perd l'accès mais son historique de partages reste intact.",
    ],
  },
  {
    title: "Mot de passe et connexion",
    body: [
      "Ta vraie session est un jeton secret gardé sur cet appareil (dans le navigateur) — c'est ce qui te garde connecté sans avoir à te réidentifier à chaque visite.",
      "Le pseudo + mot de passe ne sert qu'à récupérer cette session depuis un autre appareil (ou après avoir vidé les données du navigateur) — ce n'est pas un compte séparé.",
      "En rejoignant un groupe (par code ou depuis l'annuaire), tu peux choisir « J'ai déjà un compte » pour te reconnecter avec ton pseudo/mot de passe existant, ou « Créer un nouveau profil » pour rejoindre en tant que nouveau membre.",
      "Après 5 tentatives de mot de passe incorrectes, la connexion est bloquée 15 minutes par sécurité.",
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="max-w-2xl w-full flex flex-col gap-8 animate-fade-in-up">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground transition">
            ← Retour
          </Link>
          <h1 className="font-display text-4xl mt-4">Guide d&apos;utilisation</h1>
          <p className="text-muted mt-2">Comment fonctionne Rotation, section par section.</p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="font-display text-xl">{section.title}</h2>
            {section.body.map((paragraph, i) => (
              <p key={i} className="text-muted text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <Link href="/changelog" className="text-accent hover:underline text-sm">
          Voir le changelog →
        </Link>
      </div>
    </main>
  );
}
