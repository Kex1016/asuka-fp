import { intervals } from "@/index.js";
import { PollType } from "@/types/polls.js";
import databaseConnection from "@/utils/database.js";
import { eventCommand } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";
import { ChannelType, EmbedBuilder, TextChannel } from "discord.js";

const db = databaseConnection.getDatabase();

export default eventCommand.slash({
  description: "Start a poll",
  options: {
    poll: options.string({
      description: "The poll you want to end.",
      required: true,
      async autoComplete(e) {
        const polls = new Promise(resolve => {
          db.all(`SELECT * FROM Poll WHERE enabled = 1;`, (err, rows) => {
            if (err) {
              resolve([]);
            } else {
              const retObj: { name: string; value: string }[] = [];

              for (const row of rows) {
                const _r = row as PollType;

                retObj.push({
                  name: _r.title,
                  value: _r.id.toString(),
                });
              }

              resolve(retObj);
            }
          })
        }) as Promise<{ name: string; value: string }[]>;

        e.respond(await polls);
      },
    }),
  },
  async execute({ event, options, ctx }) {
    // Check for guild
    if (ctx.message === "no_guild" || !event.guild) {
      await event.reply({
        content: "ERROR:\n> This command can only be used in GCC.",
        ephemeral: true,
      });
      return;
    }

    // Check for member
    if (ctx.message === "no_member" || !event.member) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member.",
        ephemeral: true,
      });
      return;
    }

    // Check for permissions
    if (ctx.message === "no_perms" || !event.member.permissions) {
      await event.reply({
        content: "ERROR:\n> You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    // This command makes the poll in the channel it was called in.
    // Check for channel
    if (!event.channel) {
      await event.reply({
        content: "ERROR:\n> Could not fetch channel.",
        ephemeral: true,
      });
      return;
    }

    // Check for channel type
    if (event.channel.type !== ChannelType.GuildText) {
      await event.reply({
        content: "ERROR:\n> This command can only be used in text channels.",
        ephemeral: true,
      });
      return;
    }

    // Check for poll
    if (!options.poll) {
      await event.reply({
        content: "ERROR:\n> Could not fetch poll.",
        ephemeral: true,
      });
      return;
    }

    // Fetch the poll
    const poll = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Poll WHERE id = ${options.poll};`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          const _r = row as PollType;

          resolve({
            id: _r.id,
            title: _r.title,
            description: _r.description,
            start: new Date((row as { start: string | number }).start),
            end: new Date((row as { end: string | number }).end),
            channel: (row as { channel: string }).channel,
            message: (row as { message: string }).message,
          });
        }
      });
    }) as PollType;

    // Check if poll exists
    if (!poll) {
      await event.reply({
        content: "ERROR:\n> Could not fetch poll.",
        ephemeral: true,
      });
      return;
    }

    // Check if poll is enabled
    if (new Date(poll.end).getTime() <= Date.now()) {
      await event.reply({
        content: "ERROR:\n> Poll is already over.",
        ephemeral: true,
      });
      return;
    }

    // Edit the message to show the results
    const channel = await event.guild.channels.fetch(poll.channel) as TextChannel;
    if (!channel) {
      await event.reply({
        content: "ERROR:\n> Could not fetch channel.",
        ephemeral: true,
      });
      return;
    };

    const message = await channel.messages.fetch(poll.message);
    if (!message) {
      await event.reply({
        content: "ERROR:\n> Could not fetch message.",
        ephemeral: true,
      });
      return;
    };

    // Update the database
    await new Promise(resolve => {
      db.all(`UPDATE Poll SET enabled = 0 WHERE id = ${poll.id};`, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        resolve(null);
      });
    });

    // Get the results from the reactions
    const reactions = message.reactions.cache;
    const results: { [key: string]: number } = {};

    for (const reaction of reactions) {
      results[reaction[0]] = reaction[1].count - 1;
    }

    // Sort the results
    const sortedResults = Object.entries(results).sort(([, a], [, b]) => b - a);

    // Create the embed
    const embed = message.embeds[0];
    if (!embed) {
      await event.reply({
        content: "ERROR:\n> Could not fetch embed.",
        ephemeral: true,
      });
      return;
    };

    const newEmbed = new EmbedBuilder(embed.data);
    newEmbed.setFooter({
      text: "Poll ended",
    });
    newEmbed.setTimestamp(new Date());

    // Add the results
    let resultsString = "";

    for (const result of sortedResults) {
      resultsString += `${result[0]}: ${result[1]}\n`;
    }

    newEmbed.addFields({
      name: "Results",
      value: resultsString,
    });

    // Edit the message
    await message.edit({
      embeds: [newEmbed],
    });

    await event.reply({
      content: "Poll ended!",
      ephemeral: true,
    });
  },
});