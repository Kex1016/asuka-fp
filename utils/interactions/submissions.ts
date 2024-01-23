import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import databaseConnection from "../database.js";
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

  const updateResult = await new Promise((resolve) => {
    db.run(
      `UPDATE Submission SET status = ? WHERE id = ?`,
      [type, id],
      (err) => {
        if (err) {
          console.log(err);
          resolve(null);
        } else {
          resolve("done");
        }
      }
    );
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

  const listEmbed = new EmbedBuilder()
    .setTitle("Suggestion #" + submission.id)
    .setImage(submission.url)
    .setFooter({
      text: "Submitted by " + submitter?.username || "Unknown",
    })
    .setColor(0x00ff00)
    .addFields([
      {
        name: "Server name",
        value: `Gakkou ${submission.serverName} Club`,
      },
    ]);

  const upvoteButton = new ButtonBuilder()
    .setCustomId("submission_upvote_" + submission.id)
    .setEmoji("👍")
    .setStyle(ButtonStyle.Primary);
  const downvoteButton = new ButtonBuilder()
    .setCustomId("submission_downvote_" + submission.id)
    .setEmoji("👎")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    upvoteButton,
    downvoteButton,
  ]);

  if (type === "approve") {
    const submittedMessage = await listChannel.send({
      content: "**Score:** 0",
      embeds: [listEmbed],
      components: [row],
    });

    // Modify database
    const updateResult = await new Promise((resolve) => {
      db.run(
        `UPDATE Submission SET messageId = ? WHERE id = ?`,
        [submittedMessage.id, id],
        (err) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve("done");
          }
        }
      );
    });

    if (!updateResult) {
      await submittedMessage.delete();
      return;
    }
  }

  // Get the user that submitted the suggestion
  const submitterUser = client.users.cache.get(submission.ownerId);
  if (!submitterUser) return;

  // Send a message to the submitter
  const acceptMessage =
    type === "approve"
      ? ` It is now available for voting in <#${process.env.VOTING_LIST_CHANNEL_ID}>.`
      : "";
  const submitterEmbed = new EmbedBuilder()
    .setTitle("Your suggestion has been " + type + "d")
    .setDescription(
      `Your suggestion has been ${type}d!${acceptMessage}\n\n` +
        `Server Name: Gakkou ${submission.serverName} Club\n` +
        `ID: ${submission.id}`
    )
    .setImage(submission.url)
    .setColor("Random");

  const submitterDM = await submitterUser.createDM();
  await submitterDM.send({ embeds: [submitterEmbed] });

  await message.edit({
    content: `<@${event.user.id}> ${type}d this!`,
    embeds: message.embeds,
    components: [],
  });

  await event.reply({
    content: `You ${type}d suggestion #${submission.id}!`,
    ephemeral: true,
  });
};
