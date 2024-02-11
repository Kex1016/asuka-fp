import { intervals } from "@/index.js";
import databaseConnection from "@/utils/database.js";
import { eventCommand } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";
import { ChannelType, ColorResolvable, EmbedBuilder } from "discord.js";

const db = databaseConnection.getDatabase();

export default eventCommand.slash({
  description: "Start a poll",
  options: {
    title: options.string({
      description: "The title of the poll.",
      required: true,
    }),
    description: options.string({
      description: "The description of the poll.",
      required: true,
    }),
    duration: options.int({
      description: "The duration of the poll, in hours.",
      required: true,
    }),
    choices: options.string({
      description: 'The choices of the poll, separated by ";".',
      required: true,
    }),
    color: options.string({
      description: "The color of the poll.",
      required: false,
    }),
  },
  async execute({ event, options, ctx }) {
    await event.deferReply({
      ephemeral: true,
    });

    // Check for guild
    if (ctx.message === "no_guild" || !event.guild) {
      await event.editReply({
        content: "ERROR:\n> This command can only be used in GCC.",
      });
      return;
    }

    // Check for member
    if (ctx.message === "no_member" || !event.member) {
      await event.editReply({
        content: "ERROR:\n> Could not fetch member.",
      });
      return;
    }

    // Check for permissions
    if (ctx.message === "no_perms" || !event.member.permissions) {
      await event.editReply({
        content: "ERROR:\n> You do not have permission to use this command.",
      });
      return;
    }

    // This command makes the poll in the channel it was called in.
    // Check for channel
    if (!event.channel) {
      await event.editReply({
        content: "ERROR:\n> Could not fetch channel.",
      });
      return;
    }

    // Check for channel type
    if (
      event.channel.type !== ChannelType.GuildText &&
      event.channel.type !== ChannelType.GuildAnnouncement
    ) {
      await event.editReply({
        content: "ERROR:\n> This command can only be used in text channels.",
      });
      return;
    }

    // Add poll to database
    const endDate = new Date(
      Date.now() + intervals.HOUR * options.duration
    ).toISOString();

    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO Poll (title, description, end, channel) VALUES (?, ?, ?, ?)",
        [options.title, options.description, endDate, event.channel!.id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });

    // Add the options to the database
    const optionsSplit = options.choices.split(";");
    const pollId = (await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM Poll WHERE end = ?",
        [endDate],
        function (err, row) {
          if (err) {
            reject(err);
          } else {
            resolve((row as { id: number }).id);
          }
        }
      );
    })) as number;

    for (const option of optionsSplit) {
      let index = optionsSplit.indexOf(option);

      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO PollOption (pollId, name, indexNum) VALUES (?, ?, ?)",
          [pollId, option, index],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          }
        );
      });
    }

    // Send the poll

    const emojiNumbers = {
      1: "1️⃣",
      2: "2️⃣",
      3: "3️⃣",
      4: "4️⃣",
      5: "5️⃣",
      6: "6️⃣",
      7: "7️⃣",
      8: "8️⃣",
      9: "9️⃣",
    };

    // The poll description. This is the description of the poll, followed by the options.
    // The options are numbered with the emoji numbers. Max 9 options.
    const userDescription = options.description.replace(/\\n/g, "\n");
    const pollDescription = `${userDescription}\n\n${optionsSplit
      .map((option, index) => `${emojiNumbers[index + 1]} ${option}`)
      .join("\n")}`;

    // Validate hex color
    let color = options.color;
    if (!color) {
      color = "#000FF0";
    }

    if (color && !color.startsWith("#")) {
      color = `#${color}`;
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      color = "#000FF0";
    }

    const colorResolved: `#${string}` = color as `#${string}`;

    const embed = new EmbedBuilder()
      .setTitle(options.title)
      .setDescription(pollDescription)
      .setFooter({
        text: `Poll ends`,
      })
      .setTimestamp(new Date(endDate))
      .setColor(colorResolved);

    const msg = await event.channel.send({
      embeds: [embed],
    });

    // Add the reactions
    for (const option of optionsSplit) {
      await msg.react(emojiNumbers[optionsSplit.indexOf(option) + 1]);
    }

    // Add message id to database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE Poll SET message = ? WHERE id = ?",
        [msg.id, pollId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });

    await event.editReply({
      content: "Poll created!",
    });
  },
});
