import Link from "next/link";

interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: "2.2.1",
    title: "Icône d'installation dédiée pour iPhone/iPad",
    items: [
      "L'ajout à l'écran d'accueil depuis Safari (iOS/iPadOS) utilise maintenant une vraie icône Rotation plutôt qu'une icône générique.",
    ],
  },
  {
    version: "2.2",
    title: "PWA et notifications push",
    items: [
      "Rotation est maintenant installable (icône sur l'écran d'accueil mobile/desktop).",
      "Active les notifications depuis ton profil pour être averti de l'activité de tes groupes.",
      "L'admin choisit, par groupe, quels événements envoient une notification : nouveau partage, chat, réaction reçue, demande d'adhésion.",
    ],
  },
  {
    version: "2.1.1",
    title: "Corrections d'affichage du mur",
    items: [
      "Le titre du slot #1 (top pick) ne paraît plus plus gros que les autres.",
      "Les nouveaux messages du chat de groupe apparaissent maintenant en haut.",
    ],
  },
  {
    version: "2.1",
    title: "Intégration Discord",
    items: [
      "Lie ton compte Discord depuis ton profil : tes liens Spotify postés dans le salon Discord relié au groupe sont ajoutés automatiquement à ton profil Rotation.",
      "L'admin peut relier un groupe à un serveur et un salon Discord depuis les réglages.",
      "Nouveau logo Rotation, sur la page d'accueil et dans l'onglet du navigateur.",
    ],
  },
  {
    version: "2.0",
    title: "Invitation, chat et filtres",
    items: [
      "Bouton « Inviter » qui copie un lien direct vers le groupe.",
      "La barre du haut n'affiche plus que les membres réellement connectés.",
      "Les dates affichent maintenant l'heure en plus du jour.",
      "Chat de groupe qui regroupe les commentaires laissés sur les chansons et les messages libres, en volet latéral (PC) ou en page dédiée (mobile).",
      "Le décompte de membres n'inclut plus les comptes désactivés.",
      "Le genre et la note d'un partage peuvent être modifiés depuis n'importe où, pas seulement ton propre profil.",
      "Les réactions reçues sont visibles directement sur les cartes du mur.",
      "Filtre par genre musical sur le mur principal, en plus du filtre par membre.",
      "Colonnes plus compactes pour une meilleure vue d'ensemble sur grand écran.",
    ],
  },
  {
    version: "1.9",
    title: "Rétention et courriel",
    items: [
      "Courriel optionnel (avec lien de vérification) pour recevoir un résumé hebdomadaire du groupe.",
      "Bannière « X nouveautés depuis ta dernière visite » à l'arrivée sur le mur.",
      "Compteur d'écoutes sur tes propres partages (« 🎧 N membres l'ont écouté »).",
      "Badge discret sur un partage resté inchangé depuis plus de 30 jours.",
      "Mots de passe plus longs exigés à la création, limite de fréquence sur les actions sensibles, sessions révocables à distance en cas de changement de mot de passe.",
    ],
  },
  {
    version: "1.8",
    title: "Super-admin, sécurité et mises à jour en direct",
    items: [
      "Les liens dans l'Historique et la barre « Activité récente » ouvrent maintenant directement Spotify.",
      "Le mur du groupe se met à jour automatiquement en arrière-plan — plus besoin de rafraîchir la page.",
      "L'admin peut rendre un groupe public ou privé, et activer l'approbation des demandes, dès sa création.",
      "En rejoignant un groupe, choix entre se connecter à un profil existant ou en créer un nouveau.",
      "Protection contre les tentatives de mot de passe répétées (blocage temporaire après 5 échecs).",
      "Ajout d'un guide d'utilisation et de ce changelog.",
    ],
  },
  {
    version: "1.7",
    title: "Thèmes visuels",
    items: [
      "5 thèmes d'affichage sélectionnables (dont clair et sombre) via une palette en bas de l'écran.",
      "Le choix de thème est mémorisé sur l'appareil utilisé.",
    ],
  },
  {
    version: "1.6",
    title: "Groupes publics et gestion des membres",
    items: [
      "Annuaire des groupes publics visible à la connexion.",
      "Approbation des nouvelles demandes d'adhésion par l'admin, avec badge de notification.",
      "Le créateur d'un groupe peut désigner d'autres membres comme admin.",
      "Chaque membre peut changer son propre pseudo.",
    ],
  },
  {
    version: "1.5",
    title: "Navigation et glisser-déposer améliorés",
    items: [
      "Défilement horizontal à la souris entre les colonnes de membres.",
      "Filtre multi-sélection par membre sur le mur principal.",
      "Correction du glisser-déposer : la zone de prise en main ne dépend plus de la pochette d'album.",
    ],
  },
  {
    version: "1.4",
    title: "Connexion multi-appareil",
    items: [
      "Un pseudo et un mot de passe permettent de retrouver son profil depuis un autre appareil.",
      "Confirmation demandée avant de se déconnecter.",
    ],
  },
  {
    version: "1.3",
    title: "Mur, notation et palmarès",
    items: [
      "Réorganisation des partages par glisser-déposer.",
      "Bouton d'écoute ouvrant directement l'app Spotify.",
      "Mur organisé en colonnes par membre, avec alignement des positions 1 à 5.",
      "Mise en évidence du top pick (position n°1) de chaque membre.",
      "Dates de partage visibles, notation sur 100, et palmarès de tous les temps.",
    ],
  },
  {
    version: "1.2",
    title: "Historique et activité récente",
    items: [
      "Page Historique avec filtres par membre, genre musical et plage de dates.",
      "Barre latérale « Activité récente » listant les derniers partages du groupe.",
    ],
  },
  {
    version: "1.1",
    title: "Pouvoirs d'admin",
    items: [
      "L'admin peut désactiver ou réactiver un membre.",
      "L'admin peut renommer un membre.",
    ],
  },
  {
    version: "1.0",
    title: "Lancement",
    items: [
      "Création et adhésion à un groupe via un code à 6 caractères.",
      "Partage de chansons, albums et artistes Spotify (sans clé API).",
      "5 emplacements de partage par membre, réactions, design sombre par défaut.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="max-w-2xl w-full flex flex-col gap-8 animate-fade-in-up">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground transition">
            ← Retour
          </Link>
          <h1 className="font-display text-4xl mt-4">Changelog</h1>
          <p className="text-muted mt-2">Les nouveautés de Rotation, dans l&apos;ordre.</p>
        </div>

        {ENTRIES.map((entry) => (
          <section key={entry.version} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-surface-2 text-muted px-2 py-0.5 rounded-full">
                v{entry.version}
              </span>
              <h2 className="font-display text-xl">{entry.title}</h2>
            </div>
            <ul className="list-disc list-inside text-muted text-sm leading-relaxed flex flex-col gap-1">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <Link href="/guide" className="text-accent hover:underline text-sm">
          ← Voir le guide d&apos;utilisation
        </Link>
      </div>
    </main>
  );
}
