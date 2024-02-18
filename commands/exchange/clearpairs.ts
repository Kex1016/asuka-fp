import { eventCommand } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";
import databaseConnection from "@/utils/database.js";
import logging from "@/utils/logging.js";
import { ExchangeType, ExchangeUserType } from "@/types/exchange.js";

const db = databaseConnection.getDatabase();

export default eventCommand.slash({
  description: "Clear exchange pairs (debug cmd do not use!!!)",
  options: {
    exchange: options.number({
      description: "The exchange you want to clear.",
      required: true,
      async autoComplete(e) {
        const exchanges = (await new Promise((resolve) => {
          db.all(`SELECT * FROM Exchange;`, (err, rows) => {
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
          });
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
    logging.log(
      logging.Severity.DEBUG,
      "[/commands/exchange/clearpairs.ts] Running clearpairs"
    );

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

    // Get the users
    const users = (await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ExchangeUser WHERE exchangeId = ?;`,
        [exchange.id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const retObj: ExchangeUserType[] = [];

            for (const row of rows) {
              const _r = row as ExchangeUserType;

              retObj.push({
                id: _r.id,
                exchangeId: _r.exchangeId,
                userId: _r.userId,
                suggestions: _r.suggestions,
                pair: _r.pair,
                preferences: _r.preferences,
              });
            }

            resolve(retObj);
          }
        }
      );
    })) as ExchangeUserType[];

    // Clear the pairs
    for (const user of users) {
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE ExchangeUser SET pair = NULL WHERE id = ?;`,
            [user.id],
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
            }
          );
        });
      } catch (err) {
        await event.editReply({
          content: "ERROR:\n> Could not clear pairs.",
        });
        return;
      }
    }

    // Reset the registerAccepted
    try {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE Exchange SET registerAccepted = 1 WHERE id = ?;`,
          [exchange.id],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (err) {
      await event.editReply({
        content: "ERROR:\n> Could not reset registerAccepted.",
      });
      return;
    }

    // Send the success message
    logging.log(
      logging.Severity.DEBUG,
      "[/commands/exchange/clearpairs.ts] Cleared pairs for exchange",
      exchange.id
    );

    await event.editReply({
      content: `All users have been cleared for the ${exchange.name} exchange!`,
    });
  },
});
