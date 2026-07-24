import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rotation",
    short_name: "Rotation",
    description: "Partage musical, en groupe.",
    start_url: "/",
    display: "standalone",
    background_color: "#1E1E1E",
    theme_color: "#1E1E1E",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    // Permet de choisir Rotation dans le menu "Partager" natif (ex. depuis l'app Spotify,
    // Android uniquement — iOS/Safari ne supporte pas cette API). Non typé dans
    // MetadataRoute.Manifest, d'où le cast.
    share_target: {
      action: "/partager-cible",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
