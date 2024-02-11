import { ExchangeType, ExchangeUserType } from "@/types/exchange.js";
import databaseConnection from "@/utils/database.js";
import { command } from "@/utils/dfp.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";
import { EmbedBuilder } from "discord.js";

const db = databaseConnection.getDatabase();
export default command.slash({
  description: "List all users in the exchange!",
  options: {
    exchange: options.string({
      description: "The exchange to list users for",
      required: true,
      async autoComplete(e) {
        const exchanges = (await new Promise((resolve) => {
          db.all(
            `SELECT * FROM Exchange WHERE end > ?;`,
            [Date.now()],
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
  execute: async ({ event, options, ctx }) => {
    await event.deferReply();

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

    // Get exchange
    const exchange = (await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Exchange WHERE id = ?",
        [options.exchange],
        (err, row) => {
          if (err) reject(err);

          const _r = row as ExchangeType;

          if (!_r) {
            resolve(undefined);
            return;
          }

          const exchange: ExchangeType = {
            id: _r.id,
            name: _r.name,
            theme: _r.theme,
            description: _r.description,
            start: new Date((row as { start: string | number }).start),
            end: new Date((row as { end: string | number }).end),
            registerAccepted:
              (row as { registerAccepted: number }).registerAccepted === 1,
          };

          resolve(exchange);
        }
      );
    })) as ExchangeType | undefined;

    if (!exchange) {
      await event.editReply({
        content: "ERROR:\n> Exchange not found.",
      });
      return;
    }

    // Get users
    const users = (await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ExchangeUser WHERE exchangeId = ?;`,
        [options.exchange],
        (err, rows) => {
          if (err) {
            logging.log(logging.Severity.ERROR, "Error fetching users", err);
            reject(err);
          } else {
            const _r = rows as ExchangeUserType[];

            const retObj: ExchangeUserType[] = [];

            for (const row of _r) {
              retObj.push({
                id: row.id,
                userId: row.userId,
                exchangeId: row.exchangeId,
                pair: row.pair,
                suggestions: row.suggestions,
                preferences: row.preferences,
              });
            }

            resolve(retObj);
          }
        }
      );
    })) as ExchangeUserType[];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Exchange Users",
        iconURL: event.user.avatarURL() || event.user.defaultAvatarURL,
      })
      .setTitle(exchange.name || "Unknown title")
      .setDescription(
        "List of users in the exchange:\n" +
          (users.length > 0
            ? users.map((u) => `<@${u.userId}>`).join(", ")
            : "No users found")
      )
      .setColor("Random");

    await event.editReply({
      embeds: [embed],
    });
  },
});
