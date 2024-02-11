import {
  BaseGuildTextChannel,
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
} from "discord.js";
import submissions from "./interactions/submissions.js";
import votes from "./interactions/votes.js";
import spotifyLinks from "./checks/spotifyLinks.js";
import exchangeSubmission from "./interactions/exchangeSubmission.js";
import embedFixer from "./checks/embedFixer.js";

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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
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

  eventMembers.map((member) => {
    pings.push(`<@${member.user.id}>`);
  });

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

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  spotifyLinks(message);
  embedFixer(message);
});

// DM events
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.guild) return;

  exchangeSubmission(message);
});
