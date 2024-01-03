import { command } from "@/utils/dfp.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";
import {
  ActionRowBuilder,
  BaseGuildTextChannel,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  GuildMemberRoleManager,
  GuildTextChannelResolvable,
  TextChannel,
} from "discord.js";

import databaseConnection from "@/utils/database.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default command.slash({
  description: "Suggest the next server icon!",
  options: {
    icon: options.attachment({
      description: "The icon to suggest",
      required: true,
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

    // Check if member has the role or above it
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Checking roles");
    const memberRoleManager = event.member.roles as GuildMemberRoleManager;
    const memberRole = memberRoleManager.highest;
    const requiredRole = event.guild.roles.cache.get(
      process.env.VOTING_MINIMUM_ROLE_ID || ""
    );

    if (!requiredRole) {
      await event.reply({
        content: "ERROR:\n> Could not fetch required role.",
        ephemeral: true,
      });
      return;
    }

    if (!memberRole) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member role.",
        ephemeral: true,
      });
      return;
    }

    if (memberRole.comparePositionTo(requiredRole) < 0) {
      await event.reply({
        content:
          "ERROR:\n> You do not have permission to use this command.\n" +
          "> You must be at least a " +
          requiredRole.name +
          ".",
        ephemeral: true,
      });
      return;
    }

    if (!options.icon.name) {
      await event.reply({
        content: "ERROR:\n> Could not fetch image.",
        ephemeral: true,
      });
      return;
    }

    // Get the mod channel
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Getting mod channel");
    const modChannel = event.guild.channels.cache.get(
      process.env.VOTING_MOD_CHANNEL_ID || ""
    ) as TextChannel;

    if (!modChannel) {
      await event.reply({
        content: "ERROR:\n> Could not fetch mod channel.",
        ephemeral: true,
      });
      return;
    }

    // Add the submission to the database
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Adding to database");
    const db = databaseConnection.getDatabase();
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO Submission (type, status, data, url, ownerId) VALUES (?, ?, ?, ?, ?)`,
        [
          "icon",
          "pending",
          `${options.icon.id}.${options.icon.name!.split(".").pop()}`,
          options.icon.url,
          event.user.id,
        ],
        (err) => {
          if (err) {
            logging.log(logging.Severity.ERROR, "Error:", err);
            resolve(null);
          } else {
            resolve(null);
          }
        }
      );
    });

    // Get the submission ID
    logging.log(
      logging.Severity.DEBUG,
      "[/suggest icon] Getting submission ID"
    );

    const submission = (await new Promise((resolve) => {
      db.get(
        `SELECT id FROM Submission WHERE url = ?`,
        [options.icon.url],
        (err, row) => {
          if (err) {
            logging.log(logging.Severity.ERROR, "Error:", err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    })) as any;

    if (!submission) {
      await event.reply({
        content: "ERROR:\n> Could not fetch submission ID.",
        ephemeral: true,
      });
      return;
    }

    // Send the suggestion
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Sending suggestion");
    const embed = new EmbedBuilder()
      .setTitle("New icon suggestion")
      .setDescription(
        "A new icon suggestion has been submitted by <@" +
          event.member.user.id +
          ">!"
      )
      .setImage(options.icon.url)
      .setColor("Random");

    const approveButton = new ButtonBuilder()
      .setCustomId(`icon_approve_${submission.id}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
      .setCustomId(`icon_deny_${submission.id}`)
      .setLabel("Deny")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      approveButton,
      denyButton
    );

    await modChannel.send({
      embeds: [embed],
      components: [row],
    });

    // Download the image
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Downloading image");

    // Create the directory if it doesn't exist
    const dir = path.join(__dirname, "../../public/icons");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const filePath = path.join(
      dir,
      `${options.icon.id}.${options.icon.name.split(".").pop()}`
    );
    const res = await fetch(options.icon.url);

    if (!res.ok) {
      await event.reply({
        content: "ERROR:\n> Could not download image.",
        ephemeral: true,
      });
      return;
    }

    if (res.status !== 200) {
      await event.reply({
        content: "ERROR:\n> Could not download image.",
        ephemeral: true,
      });
      return;
    }

    if (!res.body) {
      await event.reply({
        content: "ERROR:\n> Could not download image.",
        ephemeral: true,
      });
      return;
    }

    const dest = fs.createWriteStream(filePath);
    res.body.pipe(dest);

    // Send the response
    logging.log(logging.Severity.DEBUG, "[/suggest icon] Sending response");
    await event.reply({
      content:
        "Your suggestion has been submitted! (ID: " + submission.id + ")",
      ephemeral: true,
    });
  },
});
