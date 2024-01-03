import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import databaseConnection from "../database.js";
import fs from "fs";
import path from "path";
import { client } from "../discord.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default async (
  type: "approve" | "deny",
  event: ButtonInteraction<CacheType>
) => {
  // Get message
  const message = event.message;
  if (!message) return;

  // Modify database
  const db = databaseConnection.getDatabase();
  const id = event.customId.split("_")[2];
  const sql = `UPDATE Submission SET status = ? WHERE id = ?`;

  const updateResult = await new Promise((resolve) => {
    db.run(sql, [type, id], (err) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else {
        resolve("done");
      }
    });
  });
  if (!updateResult) return;

  // Get list channel
  const listChannel = event.guild?.channels.cache.get(
    process.env.VOTING_LIST_CHANNEL_ID || ""
  ) as TextChannel;
  if (!listChannel) return;

  // Get submission
  const submission = (await new Promise((resolve) => {
    db.get(`SELECT * FROM Submission WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else {
        resolve(row);
      }
    });
  })) as any;

  if (!submission) return;

  const submitter = client.users.cache.get(submission.ownerId);

  const embed = new EmbedBuilder()
    .setTitle("Suggestion #" + submission.id)
    // image in base64
    .setImage(submission.url)
    .setFooter({
      text: "Submitted by " + submitter?.username || "Unknown",
    })
    .setColor(0x00ff00);

  const upvoteButton = new ButtonBuilder()
    .setCustomId("icon_upvote_" + submission.id)
    .setEmoji("👍")
    .setStyle(ButtonStyle.Primary);
  const downvoteButton = new ButtonBuilder()
    .setCustomId("icon_downvote_" + submission.id)
    .setEmoji("👎")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    upvoteButton,
    downvoteButton,
  ]);

  await listChannel.send({
    embeds: [embed],
    components: [row],
  });

  await message.edit({
    content: `Approved by <@${event.user.id}>!`,
    embeds: message.embeds,
    components: [],
  });

  await event.reply({
    content: `You ${type}d this suggestion!`,
    ephemeral: true,
  });
};
