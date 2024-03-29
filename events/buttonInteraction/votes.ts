import { AsukaEvent } from "@/types/asuka.js";
import databaseConnection from "@/utils/database.js";
import { CacheType, Interaction } from "discord.js";

export default {
  name: "votes",
  type: "interactionCreate",
  handler: async (event: Interaction<CacheType>) => {
    if (!event.isButton()) return;

    // Get message
    const message = event.message;
    if (!message) return;

    // Get type
    let type: "upvote" | "downvote" | null = null;
    if (event.customId.startsWith("submission_upvote")) {
      type = "upvote";
    }

    if (event.customId.startsWith("submission_downvote")) {
      type = "downvote";
    }

    if (!type) return;

    const submissionID = event.customId.split("_")[2];
    if (!submissionID) return;

    // Insert or update vote
    const db = databaseConnection.getDatabase();
    const existingVote = (await new Promise((resolve) => {
      db.get(
        `SELECT * FROM Vote WHERE userId = ? AND submissionId = ?`,
        [event.user.id, submissionID],
        (err, row) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    })) as any;

    if (
      existingVote &&
      String(existingVote.submissionId) === String(submissionID)
    ) {
      // Delete vote
      const sql = `DELETE FROM Vote WHERE userId = ? AND submissionId = ?`;
      const updateResult = await new Promise((resolve) => {
        db.run(sql, [event.user.id, submissionID], (err) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve("done");
          }
        });
      });
      if (!updateResult) return;
    }

    const sql = `INSERT INTO Vote (userId, submissionId, voteValue) VALUES (?, ?, ?)`;
    const updateResult = await new Promise((resolve) => {
      db.run(
        sql,
        [event.user.id, submissionID, type === "upvote" ? 1 : -1],
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

    // Update message
    const submission = (await new Promise((resolve) => {
      db.get(
        `SELECT * FROM Submission WHERE id = ?`,
        [submissionID],
        (err, row) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    })) as any;

    const votes = (await new Promise((resolve) => {
      db.all(
        `SELECT * FROM Vote WHERE submissionId = ?`,
        [submissionID],
        (err, rows) => {
          if (err) {
            console.log(err);
            resolve([]);
          } else {
            resolve(rows);
          }
        }
      );
    })) as any[];

    if (!submission) return;
    if (!votes) return;

    await message.edit({
      content: `**Score:** ${votes.reduce((a, b) => a + b.voteValue, 0)}`,
      embeds: message.embeds,
      components: message.components,
    });

    await event.reply({
      content: `You ${type}d suggestion #${submission.id}!`,
      ephemeral: true,
    });
  },
} as AsukaEvent;
