import { AsukaEvent } from "@/types/asuka.js";
import databaseConnection from "@/utils/database.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  EmbedBuilder,
  Interaction,
  TextChannel,
} from "discord.js";

export default {
  name: "submissions",
  type: "interactionCreate",
  handler: async (event: Interaction<CacheType>) => {
    if (!event.isButton()) return;
    if (!event.guild) return;

    // Get client
    const client = event.client;

    // Get message
    const message = event.message;
    if (!message) return;

    // Get type
    let type: "approve" | "deny" | null = null;
    if (event.customId.startsWith("submission_approve")) {
      type = "approve";
    }

    if (event.customId.startsWith("submission_deny")) {
      type = "deny";
    }

    if (!type) return;

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
    const listChannel = event.guild.channels.cache.get(
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
      .setTitle(
        "Your suggestion has been " + type === "approve" ? "approved" : "denied"
      )
      .setDescription(
        `Your suggestion has been ${
          type === "approve" ? "approved" : "denied"
        }d!${acceptMessage}\n\n` +
          `Server Name: Gakkou ${submission.serverName} Club\n` +
          `ID: ${submission.id}`
      )
      .setImage(submission.url)
      .setColor("Random");

    const submitterDM = await submitterUser.createDM();
    await submitterDM.send({ embeds: [submitterEmbed] });

    await message.edit({
      content: `<@${event.user.id}> ${
        type === "approve" ? "approved" : "denied"
      } this!`,
      embeds: message.embeds,
      components: [],
    });

    await event.reply({
      content: `You ${type === "approve" ? "approved" : "denied"} suggestion #${
        submission.id
      }!`,
      ephemeral: true,
    });
  },
} as AsukaEvent;
