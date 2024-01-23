import {
  BaseGuildTextChannel,
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} from "discord.js";
import logging from "./logging.js";
import submissions from "./interactions/submissions.js";
import votes from "./interactions/votes.js";
import exchangeAutocomplete from "./interactions/exchangeAutocomplete.js";

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

  const pings: string[] = [];
  const eventMembers = await event.fetchSubscribers();

  eventMembers.map(member => {
    pings.push(`<@${member.user.id}>`);
  })

  await guildChannel.send({
    embeds: [embed],
    content: `${pings.join(" ")}`,
  });
});

// Button interaction
client.on(Events.InteractionCreate, async (event) => {
  if (!event.isButton()) return;

  if (event.customId.startsWith("submission_approve")) {
    submissions("approve", event);
  }

  if (event.customId.startsWith("submission_deny")) {
    submissions("deny", event);
  }

  if (event.customId.startsWith("submission_upvote")) {
    votes("upvote", event);
  }

  if (event.customId.startsWith("submission_downvote")) {
    votes("downvote", event);
  }
});
