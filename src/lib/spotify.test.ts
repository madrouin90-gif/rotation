import { describe, expect, it } from "vitest";
import { parseSpotifyUrl, splitTitleArtist } from "@/lib/spotify";

describe("parseSpotifyUrl", () => {
  it("parse un lien track standard", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3");
    expect(result).toEqual({
      type: "track",
      spotifyId: "7qiZfU4dY1lWllzX7mPBI3",
      canonicalUrl: "https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3",
    });
  });

  it("parse un lien album et artist", () => {
    expect(parseSpotifyUrl("https://open.spotify.com/album/abc123")?.type).toBe("album");
    expect(parseSpotifyUrl("https://open.spotify.com/artist/abc123")?.type).toBe("artist");
  });

  it("gère le préfixe de langue intl-fr", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/intl-fr/track/7qiZfU4dY1lWllzX7mPBI3");
    expect(result?.spotifyId).toBe("7qiZfU4dY1lWllzX7mPBI3");
    expect(result?.canonicalUrl).toBe("https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3");
  });

  it("est insensible à la casse sur le type", () => {
    const result = parseSpotifyUrl("https://open.spotify.com/TRACK/abc123");
    expect(result?.type).toBe("track");
  });

  it("retourne null pour un lien invalide", () => {
    expect(parseSpotifyUrl("https://example.com/not-spotify")).toBeNull();
    expect(parseSpotifyUrl("n'importe quoi")).toBeNull();
    expect(parseSpotifyUrl("")).toBeNull();
  });

  it("rejette un type Spotify inconnu (playlist)", () => {
    expect(parseSpotifyUrl("https://open.spotify.com/playlist/abc123")).toBeNull();
  });
});

describe("splitTitleArtist", () => {
  it("sépare 'Titre - Artiste' pour une piste", () => {
    expect(splitTitleArtist("Shape of You - Ed Sheeran", "track")).toEqual({
      title: "Shape of You",
      artistName: "Ed Sheeran",
    });
  });

  it("garde le titre entier pour un artiste (pas de séparation)", () => {
    expect(splitTitleArtist("Ed Sheeran - Topic", "artist")).toEqual({
      title: "Ed Sheeran - Topic",
      artistName: null,
    });
  });

  it("laisse artistName à null quand il n'y a pas de séparateur", () => {
    expect(splitTitleArtist("Titre sans artiste", "album")).toEqual({
      title: "Titre sans artiste",
      artistName: null,
    });
  });

  it("gère plusieurs séparateurs ' - ' en gardant tout après le premier comme artiste", () => {
    expect(splitTitleArtist("A - B - C", "track")).toEqual({
      title: "A",
      artistName: "B - C",
    });
  });
});
