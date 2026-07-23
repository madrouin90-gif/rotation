interface AuditEntryLike {
  action: string;
  metadata: Record<string, unknown>;
  memberPseudo: string | null;
}

/** Traduit une entrée du journal d'actions en phrase lisible pour le tableau de bord super-admin. */
export function formatAuditEntry(entry: AuditEntryLike): string {
  const who = entry.memberPseudo ?? "Quelqu'un";
  const m = entry.metadata ?? {};

  switch (entry.action) {
    case "group_created":
      return `${who} a créé le groupe « ${m.groupName ?? ""} »`;
    case "member_joined":
      return `${who} a rejoint le groupe`;
    case "join_requested":
      return `${who} a demandé à rejoindre le groupe`;
    case "member_approved":
      return `${who} a approuvé ${m.targetPseudo ?? "un membre"}`;
    case "member_rejected":
      return `${who} a rejeté la demande de ${m.targetPseudo ?? "un membre"}`;
    case "member_promoted":
      return `${who} a ${m.isAdmin ? "promu" : "rétrogradé"} un membre admin`;
    case "member_renamed":
      return `${who} a renommé un membre en « ${m.pseudo ?? ""} »`;
    case "member_toggled_active":
      return `${who} a ${m.isActive ? "réactivé" : "désactivé"} un membre`;
    case "member_removed":
      return `${who} a retiré un membre du groupe`;
    case "share_added":
      return `${who} a partagé « ${m.title ?? ""} »`;
    case "share_replaced":
      return `${who} a remplacé le slot #${m.rank ?? ""} par « ${m.title ?? ""} »`;
    case "share_removed":
      return `${who} a retiré un partage`;
    case "share_note_updated":
      return `${who} a modifié la note d'un partage`;
    case "share_genres_updated":
      return `${who} a modifié les genres d'un partage`;
    case "shares_reordered":
      return `${who} a réordonné ses partages`;
    case "reaction_added":
      return `${who} a réagi ${m.emoji ?? ""}`;
    case "reaction_removed":
      return `${who} a retiré sa réaction ${m.emoji ?? ""}`;
    case "rating_given":
      return `${who} a noté ${m.score ?? ""}/10`;
    case "comment_added":
      return `${who} a commenté une chanson`;
    case "comment_removed":
      return `${who} a retiré un commentaire`;
    case "favorite_added":
      return `${who} a ajouté un favori`;
    case "favorite_removed":
      return `${who} a retiré un favori`;
    case "password_changed":
      return `${who} a changé son mot de passe`;
    case "pseudo_changed":
      return `${who} a changé son pseudo en « ${m.pseudo ?? ""} »`;
    case "settings_updated":
      return `${who} a modifié les réglages du groupe`;
    case "group_renamed":
      return `${who} a renommé le groupe en « ${m.name ?? ""} »`;
    case "code_regenerated":
      return `${who} a régénéré le code du groupe`;
    default:
      return `${who} — ${entry.action}`;
  }
}
