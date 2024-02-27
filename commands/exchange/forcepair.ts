import { eventCommand } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";
import databaseConnection from "@/utils/database.js";
import logging from "@/utils/logging.js";
import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { ExchangeType, ExchangeUserType } from "@/types/exchange.js";

const db = databaseConnection.getDatabase();

export async function pairExchangeMembers(
  client: Client,
  exchange: ExchangeType,
  interaction?: ChatInputCommandInteraction<CacheType>
) {
  // Start a timer for the lulz
  const startTime = new Date().getTime();

  logging.log(
    logging.Severity.DEBUG,
    `[Exchange: Pairing] Pairing users for exchange ${exchange.id} (${exchange.name})`
  );
  // Get the users in the exchange
  const users = (await new Promise((resolve) => {
    db.all(
      `SELECT * FROM ExchangeUser WHERE exchangeId = ?;`,
      [exchange.id],
      (err, rows) => {
        if (err) {
          resolve([]);
        } else {
          const retObj: ExchangeUserType[] = [];

          for (const row of rows) {
            const _r = row as ExchangeUserType;

            retObj.push({
              id: _r.id,
              exchangeId: _r.exchangeId,
              userId: _r.userId,
              preferences: _r.preferences,
              pair: _r.pair,
              suggestions: _r.suggestions,
            });
          }
          resolve(retObj);
        }
      }
    );
  })) as ExchangeUserType[];

  // Jumble up the users
  for (let i = users.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [users[i], users[j]] = [users[j], users[i]];
  }

  // -- Pair the users --
  // Pairing steps:
  // - Get two unpaired users and pair them
  // - If there are an odd number of users, one user will be left unpaired
  // -- If there's an odd number, make the pair circular (A>B>C>A)

  // Get the unpaired users
  const unpairedUsers = users.filter((user) => user.pair === null);

  // Check if there are any unpaired users
  if (unpairedUsers.length === 0) {
    logging.log(
      logging.Severity.DEBUG,
      "[Exchange: Pairing] All users are already paired."
    );
    if (interaction) {
      await interaction.editReply({
        content: "All users are already paired!",
      });
    }
    return;
  }

  // Check if there's only one unpaired user
  if (unpairedUsers.length === 1) {
    logging.log(
      logging.Severity.DEBUG,
      "[Exchange: Pairing] There is only one unpaired user."
    );
    if (interaction) {
      await interaction.editReply({
        content: "There is only one unpaired user!",
      });
    }
    return;
  }

  // Pair the users
  const pairedUsers: ExchangeUserType[] = [];

  // If there's an odd amount of users, pair the first two and the last one in a circular fashion
  if (unpairedUsers.length % 2 !== 0) {
    const user = unpairedUsers[0];
    const nextUser = unpairedUsers[1];
    const lastUser = unpairedUsers[unpairedUsers.length - 1];

    // Pair the users
    user.pair = nextUser.userId;
    nextUser.pair = lastUser.userId;
    lastUser.pair = user.userId;

    // Add the users to the pairedUsers array
    pairedUsers.push(user, nextUser, lastUser);

    // Remove the users from the unpairedUsers array
    unpairedUsers.shift();
    unpairedUsers.shift();
    unpairedUsers.pop();

    // Update the database
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE ExchangeUser SET pair = ? WHERE id = ?;`,
        [user.pair, user.id],
        (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[Exchange: Pairing] Error while updating the database:`,
              err
            );
            reject(null);
          }
        }
      );
      db.run(
        `UPDATE ExchangeUser SET pair = ? WHERE id = ?;`,
        [nextUser.pair, nextUser.id],
        (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[Exchange: Pairing] Error while updating the database:`,
              err
            );
            reject(null);
          }
        }
      );
      db.run(
        `UPDATE ExchangeUser SET pair = ? WHERE id = ?;`,
        [lastUser.pair, lastUser.id],
        (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[Exchange: Pairing] Error while updating the database:`,
              err
            );
            reject(null);
          }
          resolve(null);
        }
      );
    });
  }

  for (let i = 0; i < unpairedUsers.length; i += 2) {
    const user = unpairedUsers[i];
    const nextUser = unpairedUsers[i + 1] || unpairedUsers[0];

    // Pair the users
    user.pair = nextUser.userId;
    nextUser.pair = user.userId;

    // Add the users to the pairedUsers array
    pairedUsers.push(user, nextUser);

    // Update the database
    await new Promise((resolve) => {
      db.run(
        `UPDATE ExchangeUser SET pair = ? WHERE id = ?;`,
        [user.pair, user.id],
        (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[Exchange: Pairing] Error while updating the database:`,
              err
            );
          }
        }
      );
      db.run(
        `UPDATE ExchangeUser SET pair = ? WHERE id = ?;`,
        [nextUser.pair, nextUser.id],
        (err) => {
          if (err) {
            logging.log(
              logging.Severity.ERROR,
              `[Exchange: Pairing] Error while updating the database:`,
              err
            );
          }
          resolve(null);
        }
      );
    });
  }

  // Remove duplicates
  const uniquePairedUsers = pairedUsers.filter(
    (user, index, self) =>
      index ===
      self.findIndex((t) => t.userId === user.userId && t.pair === user.pair)
  );

  // Send the pairing message
  for (const user of uniquePairedUsers) {
    const member = await client.guilds
      .fetch(interaction?.guildId || "")
      .then((g) => g.members.fetch(user.userId));

    const pair = await client.guilds
      .fetch(interaction?.guildId || "")
      .then((g) => g.members.fetch(user.pair!));

    const pairPreferences = pair
      ? ((await new Promise((resolve) => {
          db.get(
            `SELECT * FROM ExchangeUser WHERE userId = ? AND exchangeId = ?;`,
            [pair.id, exchange.id],
            (err, row) => {
              if (err) {
                resolve(undefined);
              } else {
                const _r = row as ExchangeUserType;

                resolve(_r.preferences);
              }
            }
          );
        })) as string | undefined)
      : undefined;

    if (member && pair) {
      const pairEmbed = new EmbedBuilder()
        .setTitle("Exchange Pairing")
        .setDescription(
          `You have been paired with <@${user.pair}> for **${exchange.name}**!`
        )
        .setColor("Green")
        .addFields([
          {
            name: "Preferences",
            value:
              pairPreferences ||
              "This user has hacked the system. No preferences were found.",
          },
        ]);

      const infoEmbed = new EmbedBuilder()
        .setTitle("How do I submit my exchange anime?")
        .setDescription(
          `Well, friend, that's easy! Just send me a message in the following format:\n\n` +
            `\`\`\`md\n` +
            `exchange${exchange.id}:\n` +
            `https://anilist.co/anime/1\n` +
            `https://anilist.co/anime/2\n` +
            `https://anilist.co/anime/3\n` +
            `# This is an optional note!` +
            `\`\`\`\n` +
            `So, the first line is always the exchange ID (in this case it's \`exchange${exchange.id}\`), ` +
            `and then you can add up to 3 anime links. The note is optional, but it's always nice to add a little ` +
            `something! Anything beyond the 3rd link will be recognized as a note, so be careful!`
        )
        .setColor("Random");

      const themeEmbed = new EmbedBuilder()
        .setTitle("Exchange Theme")
        .setDescription(
          `The theme for this exchange is: **${exchange.theme}**\n` +
            `This means that you have to pick an anime with this genre!\n` +
            `**Any other submission will be declined!**`
        )
        .setColor("DarkRed");

      const embeds = exchange.theme
        ? [pairEmbed, infoEmbed, themeEmbed]
        : [pairEmbed, infoEmbed];

      // Get the time it took to pair the users
      const endTime = new Date().getTime();
      const timeDiff = endTime - startTime;
      const timeDiffSeconds = (timeDiff / 1000).toFixed(2);

      await member.send({
        content: `Heyo! After a long and arduous process that took about ${timeDiffSeconds} seconds, your pair has been found!`,
        embeds,
      });
    } else {
      logging.log(
        logging.Severity.ERROR,
        `[Exchange: Pairing] Could not find member with ID ${user.userId}`
      );

      if (interaction) {
        await interaction.editReply({
          content: `Could not find member with ID ${user.userId}`,
        });
      }
    }
  }

  // Send the pairing message to the channel
  const channel = (await client.channels.fetch(
    process.env.EXCHANGE_CHANNEL_ID || ""
  )) as TextChannel;

  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle("Exchange Pairing")
      .setDescription(`All users have been paired for **${exchange.name}**!`)
      .setColor("Green")
      .setFooter({
        text: `Any more registrations will be declined.`,
      });

    await channel.send({ embeds: [embed] });
  }

  // Lock the exchange
  await new Promise((resolve) => {
    db.run(
      `UPDATE Exchange SET registerAccepted = 0 WHERE id = ?;`,
      [exchange.id],
      (err) => {
        if (err) {
          logging.log(
            logging.Severity.ERROR,
            `[Exchange: Pairing] Error while updating the database:`,
            err
          );
        }
        resolve(null);
      }
    );
  });
}

export default eventCommand.slash({
  description: "Force pair users for an exchange",
  options: {
    exchange: options.number({
      description:
        "The exchange you want to register for. Be warned that THIS IS FINAL!",
      required: true,
      async autoComplete(e) {
        const exchanges = (await new Promise((resolve) => {
          db.all(
            `SELECT * FROM Exchange WHERE registerAccepted = 1;`,
            (err, rows) => {
              if (err) {
                resolve([]);
              } else {
                const retObj: ExchangeType[] = [];

                for (const row of rows) {
                  const _r = row as ExchangeType;

                  retObj.push({
                    id: _r.id,
                    name: _r.name,
                    description: _r.description,
                    theme: _r.theme,
                    start: new Date((row as { start: string | number }).start),
                    end: new Date((row as { end: string | number }).end),
                    registerAccepted:
                      (row as { registerAccepted: number }).registerAccepted ===
                      1,
                  });
                }
                resolve(retObj);
              }
            }
          );
        })) as ExchangeType[];

        const responseObject: { name: string; value: string }[] = [];

        for (const exchange of exchanges) {
          responseObject.push({
            name: exchange.name,
            value: exchange.id.toString(),
          });
        }

        e.respond(responseObject);
      },
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

    const exchange = (await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Exchange WHERE id = ?;`,
        [options.exchange],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            const _r = row as ExchangeType;

            resolve({
              id: _r.id,
              name: _r.name,
              description: _r.description,
              theme: _r.theme,
              start: new Date((row as { start: string | number }).start),
              end: new Date((row as { end: string | number }).end),
              registerAccepted:
                (row as { registerAccepted: number }).registerAccepted === 1,
            });
          }
        }
      );
    })) as ExchangeType;

    if (!exchange) {
      await event.editReply({
        content: "ERROR:\n> Could not find exchange.",
      });
      return;
    }

    // Pair the users
    await pairExchangeMembers(event.client, exchange, event);

    // Send the success message
    await event.editReply({
      content: `All users have been paired for the ${exchange.name} exchange!`,
    });
  },
});
