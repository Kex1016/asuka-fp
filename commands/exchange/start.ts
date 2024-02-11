import { eventCommand } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";
import { genres, intervals } from "@/index.js";
import databaseConnection from "@/utils/database.js";
import logging from "@/utils/logging.js";
import {
  EmbedBuilder,
  TextChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";

const choices = await new Promise<ChoiceType>((resolve) => {
  let obj: ChoiceType = {};
  genres.map((genre) => {
    const name = genre.slice(0, 1) + genre.slice(1, genre.length).toLowerCase();
    obj = {
      ...obj,
      [genre]: {
        names: {
          "en-US": name,
        },
        value: genre,
      },
    };
  });
  resolve(obj);
});

type ChoiceType = {
  [name: string]: {
    names?: Partial<Record<"en-US", string | null>> | undefined;
    value: string;
  };
};

const db = databaseConnection.getDatabase();

export default eventCommand.slash({
  description: "Start an exchange",
  options: {
    name: options.string({
      description: "The name of the exchange. Make it catchy :D",
      required: true,
    }),
    description: options.string({
      description: `The description of the exchange. This will also be announced to everyone!`,
      required: true,
    }),
    duration: options.int({
      description: `The duration of the exchange, in days. This is a number.`,
      required: true,
    }),
    theme: options.string({
      description: `Theme of the exchange. This is a list of AL tags/genres separated by comma. ("tag1, tag2, etc.")`,
      required: false,
      choices,
    }),
  },
  async execute({ event, options, ctx }) {
    await event.deferReply({ ephemeral: true });

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

    if (!process.env.EXCHANGE_REGISTER_DAYS) {
      await event.editReply({
        content:
          "<a:EmuBoom:1129490106458308710> WEE WOO CONFIG FAIL, TELL THE CAKE TO SET `EXCHANGE_REGISTER_DAYS`. <a:EmuBoom:1129490106458308710>",
      });
      return;
    }

    const regDays = Number.parseInt(process.env.EXCHANGE_REGISTER_DAYS);

    // Check for the options
    if (options.duration < regDays) {
      await event.editReply({
        content: `<a:EmuBoom:1129490106458308710> WEE WOO USER ERROR. THE MINIMUM DURATION IS \`${regDays}\` DAYS. <a:EmuBoom:1129490106458308710>`,
      });
      return;
    }

    const daysAdded = intervals.DAY * options.duration;
    const currentDate = Date.now();
    const endDate = new Date(currentDate + daysAdded);

    // Add to db
    logging.log(
      logging.Severity.DEBUG,
      "Adding a new exchange to the database"
    );

    const endDateFormatted = `${endDate.getFullYear()}-${endDate.getMonth()}-${endDate.getDate()} ${endDate.getHours()}:${endDate.getMinutes()}:${endDate.getSeconds()}`;
    const dbResult = await new Promise((resolve) => {
      db.all(
        `INSERT INTO Exchange (name, theme, description, end, registerAccepted) VALUES (?, ?, ?, ?, ?)`,
        [options.name, options.theme, options.description, endDateFormatted, 1],
        (err) => {
          if (err) {
            logging.log(logging.Severity.ERROR, "Error:", err);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });

    if (!dbResult) {
      await event.editReply({
        content: "Sumn gone wrong man... <a:EmuBoom:1129490106458308710>",
      });
      return;
    }

    // Get the guild
    const guild = await event.client.guilds.fetch(process.env.GUILD_ID || "");
    if (!guild) {
      await event.editReply({
        content: "Couldn't fetch the guild... <a:EmuBoom:1129490106458308710>",
      });
      return;
    }
    // Get the announcement channel
    const channel = (await guild.channels.fetch(
      process.env.EXCHANGE_CHANNEL_ID || ""
    )) as TextChannel;
    if (!channel) {
      await event.editReply({
        content:
          "Couldn't fetch the announcement channel... <a:EmuBoom:1129490106458308710>",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "New exchange!",
        iconURL:
          event.user.avatarURL() || "https://safe.haiiro.moe/F0pt8Nwq6aNq.webp",
      })
      .setTitle(options.name || "Unknown title")
      .setDescription(options.description || "No description...")
      .setFields([
        {
          name: "Starts at",
          value: `<t:${Math.floor(currentDate / 1000)}:D>`,
          inline: true,
        },
        {
          name: "Ends at",
          value: `<t:${Math.floor(
            endDate.getTime() / 1000
          )}:D> (<t:${Math.floor(endDate.getTime() / 1000)}:R>)`,
          inline: true,
        },
      ])
      .setFooter({
        text: "Powered by sheer will",
      })
      .setTimestamp();

    if (options.theme) {
      embed.addFields([
        {
          name: "Theme",
          value: options.theme || "Unknown",
          inline: false,
        },
      ]);
    }

    await channel.send({
      content: `HEY, LISTEN! <@&${process.env.EXCHANGE_ROLE_ID}>`,
      embeds: [embed],
    });

    // Create a thread for the exchange
    const thread = await channel.threads.create({
      name: options.name,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: "New exchange",
    });

    const threadEmbed = new EmbedBuilder()
      .setAuthor({
        name: "Welcome to the exchange!",
        iconURL: "https://safe.haiiro.moe/F0pt8Nwq6aNq.webp",
      })
      .setTitle(options.name || "Unknown title")
      .setDescription(
        `This is the thread for the exchange. The exchange starts at <t:${Math.floor(
          currentDate / 1000
        )}:D> and ends at <t:${Math.floor(
          endDate.getTime() / 1000
        )}:D> (<t:${Math.floor(endDate.getTime() / 1000)}:R>).` +
          ((options.theme && `\n**The theme is:** ${options.theme}`) || "") +
          "\n\n" +
          options.description +
          "\n\n" +
          "You can use this thread to discuss the exchange, ask questions, and share your progress. Have fun!"
      )
      .setFooter({
        text: "Powered by sheer will",
      })
      .setTimestamp();

    thread.send({
      embeds: [threadEmbed],
    });

    await event.editReply({
      content: "The exchange has been started! <:yay:895412313174192188>",
    });
  },
});
