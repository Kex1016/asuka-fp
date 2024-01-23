import { Client, EmbedBuilder, TextChannel } from "discord.js";
import logging from "../logging.js";
import databaseConnection from "../database.js";

export default async (client: Client) => {
  logging.log(
    logging.Severity.DEBUG,
    "[/checks/endOfWeek.ts] Checking end of week"
  );

  // Get current date
  const currentDate = new Date();
  const currentDay = currentDate.getDay();
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  logging.log(
    logging.Severity.DEBUG,
    `[/checks/endOfWeek.ts] Current day: ${currentDay} - ${currentHour}:${currentMinute}`
  );

  // Check if it's Sunday 11:59
  if (currentDay === 0 && currentHour === 23 && currentMinute === 59) {
    logging.log(
      logging.Severity.DEBUG,
      "[/checks/endOfWeek.ts] It's Sunday 11:59! Time to end the week!"
    );

    // Get database and fetch all suggestions and votes
    const db = databaseConnection.getDatabase();
    const submissions = (await new Promise((resolve) => {
      db.all(
        `SELECT * FROM Submission WHERE status = "approve"`,
        (err, rows) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve(rows);
          }
        }
      );
    })) as any[] | null;
    if (!submissions) return;

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Submissions: ${JSON.stringify(submissions)}`
    );

    const votes = (await new Promise((resolve) => {
      db.all(`SELECT * FROM Vote`, (err, rows) => {
        if (err) {
          console.log(err);
          resolve(null);
        } else {
          resolve(rows);
        }
      });
    })) as any[] | null;
    if (!votes) return;

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Votes: ${JSON.stringify(votes)}`
    );

    // Make a structure with all the votes for each submission sorted by vote value
    const submissionVotes: {
      [key: string]: { score: number; upvotes: number; downvotes: number };
    } = {};
    for (const submission of submissions) {
      submissionVotes[submission.id] = { score: 0, upvotes: 0, downvotes: 0 };
    }
    for (const vote of votes) {
      submissionVotes[vote.submissionId].score += vote.voteValue;
      if (vote.voteValue === 1) {
        submissionVotes[vote.submissionId].upvotes += 1;
      } else if (vote.voteValue === -1) {
        submissionVotes[vote.submissionId].downvotes += 1;
      }
    }

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Submission votes: ${JSON.stringify(
        submissionVotes
      )}`
    );

    // Sort the submissions by score
    const sortedSubmissions = Object.entries(submissionVotes).sort(
      (a, b) => b[1].score - a[1].score
    );

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Sorted submissions: ${JSON.stringify(
        sortedSubmissions
      )}`
    );

    // Get the top submission (multiple if there are ties)
    const topSubmissions = sortedSubmissions.filter(
      (submission) => submission[1].score === sortedSubmissions[0][1].score
    );

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Top submissions: ${JSON.stringify(topSubmissions)}`
    );

    // Select a random submission from the top submissions
    const randomSubmission =
      topSubmissions[Math.floor(Math.random() * topSubmissions.length)];

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Random submission: ${JSON.stringify(
        randomSubmission
      )}`
    );

    // Get the top submission's data
    const topSubmissionData = (await new Promise((resolve) => {
      db.get(
        `SELECT * FROM Submission WHERE id = ?`,
        [randomSubmission[0]],
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
    if (!topSubmissionData) return;

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Top submission data: ${JSON.stringify(
        topSubmissionData
      )}`
    );

    // Get the top submission's owner
    const topSubmissionOwner = client.users.cache.get(
      topSubmissionData.ownerId
    );
    if (!topSubmissionOwner) return;

    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Top submission owner: ${topSubmissionOwner.id}`
    );

    // Get the server
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Getting server ${process.env.GUILD_ID}`
    );
    const server = client.guilds.cache.get(process.env.GUILD_ID || "");
    if (!server) return;

    // Get the announcement channel
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Getting announcement channel`
    );
    const announcementChannel = (await server.channels.fetch(
      process.env.VOTING_ANNOUNCE_CHANNEL_ID || ""
    )) as TextChannel;
    if (!announcementChannel) return;

    // Get the voting channel
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Getting voting channel`
    );
    const votingChannel = (await server.channels.fetch(
      process.env.VOTING_LIST_CHANNEL_ID || ""
    )) as TextChannel;
    if (!votingChannel) return;

    // Set the server icon
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Setting server icon`
    );
    await server.setIcon(topSubmissionData.url);

    // Set the server name
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Setting server name`
    );
    await server.setName(`Gakkou ${topSubmissionData.serverName} Club`);

    // Go through all the submissions and delete their messages
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Deleting submission messages`
    );
    for (const submission of submissions) {
      const submissionMessage = await votingChannel.messages.fetch(
        submission.messageId
      );
      if (submissionMessage) {
        await submissionMessage.delete();
      }
    }

    // Go through all the votes and submissions and delete them from the database
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Deleting votes and submissions from database`
    );
    for (const vote of votes) {
      await new Promise((resolve) => {
        db.run(`DELETE FROM Vote WHERE id = ?`, [vote.id], (err) => {
          if (err) {
            console.log(err);
            resolve(null);
          } else {
            resolve(null);
          }
        });
      });
    }

    for (const submission of submissions) {
      await new Promise((resolve) => {
        db.run(
          `DELETE FROM Submission WHERE id = ?`,
          [submission.id],
          (err) => {
            if (err) {
              console.log(err);
              resolve(null);
            } else {
              resolve(null);
            }
          }
        );
      });
    }

    // Send the announcement
    logging.log(
      logging.Severity.DEBUG,
      `[checks/endOfWeek.ts] Sending announcement`
    );
    const announceEmbed = new EmbedBuilder()
      .setTitle("It's the end of the week!")
      .setDescription(
        `The submission of the week is **#${topSubmissionData.id}** by **${
          topSubmissionOwner?.username || "Unknown"
        }**!\nTheir submission has been set as the server icon and its name! Congratulations!\n\n` +
          `The vote channels have been wiped. You can start submitting for next week!\n` +
          `Vote for the new submissions in <#${process.env.VOTING_LIST_CHANNEL_ID}>!`
      )
      .setImage(topSubmissionData.url)
      .setFooter({
        text: `Score: ${randomSubmission[1].score} | Upvotes: ${randomSubmission[1].upvotes} | Downvotes: ${randomSubmission[1].downvotes}`,
      })
      .setColor(0x00ff00);

    await announcementChannel.send({
      embeds: [announceEmbed],
    });
  }
};
