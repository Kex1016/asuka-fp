import {
  BaseGuildTextChannel,
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} from "discord.js";
import logging from "./logging.js";
import iconSubmissions from "./interactions/iconSubmissions.js";
import iconVote from "./interactions/iconVote.js";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
});

client.on(Events.GuildScheduledEventCreate, async (event) => {
  if (!process.env.GROUPWATCH_CHANNEL_ID) return;

  if (!event.name.startsWith("[GW]")) return;

  const channel = await client.channels.fetch(
    process.env.GROUPWATCH_CHANNEL_ID
  );
  if (!channel) return;
  if (!event.creator) return;

  // Send message to channel
  const guildChannel = channel as BaseGuildTextChannel;
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "New Groupwatch!",
      iconURL: event.creator.avatarURL() || event.creator.defaultAvatarURL,
    })
    .setTitle(event.name)
    .setURL(event.url)
    .setDescription(
      `A new groupwatch has been created. Join it [here](${event.url}).`
    )
    .setFooter({
      text: `Starts at`,
    })
    .setTimestamp(event.scheduledStartAt)
    .setColor(0x00ff00);

  embed.addFields([
    {
      name: "Host",
      value: event.creator.username,
      inline: false,
    },
    {
      name: "Description",
      value: `${event.description || "No description"}`,
      inline: false,
    },
    {
      name: "Note",
      value:
        "> *By joining the groupwatch, you agree to be in the yearly rewind.*",
    },
  ]);

  await guildChannel.send({
    embeds: [embed],
    content: `<@&${process.env.GROUPWATCH_ROLE_ID}>`,
  });
});

// Button interaction
// TODO: unify with name submissions
client.on(Events.InteractionCreate, async (event) => {
  if (!event.isButton()) return;

  if (event.customId.startsWith("icon_approve")) {
    iconSubmissions("approve", event);
  }

  if (event.customId.startsWith("icon_deny")) {
    iconSubmissions("deny", event);
  }

  if (event.customId.startsWith("icon_upvote")) {
    iconVote("upvote", event);
  }

  if (event.customId.startsWith("icon_downvote")) {
    iconVote("downvote", event);
  }
});
