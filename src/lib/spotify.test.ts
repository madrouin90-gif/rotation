import { describe, expect, it } from "vitest";
import { parseSpotifyUrl, extractArtistFromOgDescription } from "@/lib/spotify";

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

describe("extractArtistFromOgDescription", () => {
  it("extrait l'artiste (premier segment) pour une piste", () => {
    expect(extractArtistFromOgDescription("Rick Astley · Whenever You Need Somebody · Song · 1987", "track")).toBe(
      "Rick Astley"
    );
  });

  it("extrait l'artiste (premier segment) pour un album", () => {
    expect(extractArtistFromOgDescription("Miles Davis · album · 1959 · 5 songs", "album")).toBe("Miles Davis");
  });

  it("retourne toujours null pour un artiste (le titre oEmbed est déjà son nom)", () => {
    expect(extractArtistFromOgDescription("Artist · 101M monthly listeners.", "artist")).toBeNull();
  });

  it("retourne null si la description est absente", () => {
    expect(extractArtistFromOgDescription(null, "track")).toBeNull();
  });
});
