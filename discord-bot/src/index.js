import { Client, GatewayIntentBits } from "discord.js";

const { DISCORD_BOT_TOKEN, ROTATION_API_BASE_URL, DISCORD_BOT_SECRET } = process.env;

if (!DISCORD_BOT_TOKEN || !ROTATION_API_BASE_URL || !DISCORD_BOT_SECRET) {
  console.error("Variables manquantes : DISCORD_BOT_TOKEN, ROTATION_API_BASE_URL, DISCORD_BOT_SECRET sont requises.");
  process.exit(1);
}

const SPOTIFY_LINK_RE = /https?:\/\/open\.spotify\.com\/(?:track|album|artist)\/[A-Za-z0-9]+(?:\?\S*)?/;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
  console.log(`Bot Rotation connecté en tant que ${client.user.tag}.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guildId) return;

  const match = message.content.match(SPOTIFY_LINK_RE);
  if (!match) return;

  try {
    const response = await fetch(`${ROTATION_API_BASE_URL}/api/discord/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DISCORD_BOT_SECRET}` },
      body: JSON.stringify({
        guildId: message.guildId,
        channelId: message.channelId,
        discordUserId: message.author.id,
        spotifyUrl: match[0],
      }),
    });

    const data = await response.json().catch(() => ({}));

    switch (data.status) {
      case "ok":
        await message.react("✅");
        break;
      case "slots_full":
        await message.react("⚠️");
        await message.reply(
          "Tes emplacements Rotation sont pleins — remplace un partage sur l'app pour que celui-ci soit pris en compte."
        );
        break;
      case "member_not_linked":
        await message.react("❓");
        break;
      case "not_linked_channel":
        // Ce salon n'est lié à aucun groupe Rotation — on ignore silencieusement.
        break;
      default:
        await message.react("❌");
        console.error("Réponse inattendue de /api/discord/share", data);
    }
  } catch (err) {
    console.error("Appel à /api/discord/share échoué", err);
  }
});

client.login(DISCORD_BOT_TOKEN);
