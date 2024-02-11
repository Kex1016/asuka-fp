import { Client, EmbedBuilder, TextChannel } from "discord.js";
import logging from "../logging.js";
import databaseConnection from "../database.js";
import { PollType } from "@/types/polls.js";

const db = databaseConnection.getDatabase();
export default async (client: Client) => {
  logging.log(
    logging.Severity.DEBUG,
    "[/checks/polls.ts] Checking poll end dates"
  );

  // Get all the polls
  const polls = await new Promise(resolve => {
    db.all(`SELECT * FROM Poll WHERE enabled = 1;`, (err, rows) => {
      if (err) {
        resolve([]);
      } else {
        const retObj: PollType[] = [];

        for (const row of rows) {
          const _r = row as PollType;

          retObj.push({
            id: _r.id,
            title: _r.title,
            description: _r.description,
            start: new Date((row as { start: string | number }).start),
            end: new Date((row as { end: string | number }).end),
            channel: (row as { channel: string }).channel,
            message: (row as { message: string }).message,
          });
        }

        resolve(retObj);
      }
    })
  }) as PollType[];

  for (const poll of polls) {
    if (new Date(poll.end).getTime() <= Date.now()) {
      // Edit the message to show the results
      const channel = await client.channels.fetch(poll.channel) as TextChannel;
      if (!channel) continue;

      const message = await channel.messages.fetch(poll.message);
      if (!message) continue;

      // Update the database
      await new Promise(resolve => {
        db.all(`UPDATE Poll SET enabled = 0 WHERE id = ${poll.id};`, (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[/checks/polls.ts] Error updating the database: ${err}`
            );
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
      const sortedResults = Object.keys(results).sort((a, b) => results[b] - results[a]);

      // Send the results
      let resultsString = "";
      for (const result of sortedResults) {
        resultsString += `${result}: ${results[result]}\n`;
      }

      const embed = message.embeds[0];
      if (!embed) continue;

      const embedBuilder = new EmbedBuilder(embed.data);
      embedBuilder.addFields({
        name: "Results",
        value: resultsString,
      });
      embedBuilder.setColor("#00ff00");
      embedBuilder.setFooter({
        text: "Poll ended",
      });
      embedBuilder.setTimestamp(new Date());

      await message.edit({
        embeds: [embedBuilder],
      });
    }
  }
};