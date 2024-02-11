import { ExchangeType, ExchangeUserType } from "@/types/exchange.js";
import databaseConnection from "@/utils/database.js";
import { command } from "@/utils/dfp.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";

const db = databaseConnection.getDatabase();
export default command.slash({
  description: "Register for an exchange",
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
    preferences: options.string({
      description:
        "Your preferences for the exchange. Make sure you properly include your dislikes and likes!",
      required: true,
    }),
  },
  async execute({ event, options, ctx }) {
    // Check for any running exchanges
    const runningExchanges = (await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM Exchange WHERE registerAccepted = 1;`,
        (err, rows) => {
          if (err) {
            reject(err);
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
                  (row as { registerAccepted: number }).registerAccepted === 1,
              });
            }
            resolve(retObj);
          }
        }
      );
    })) as ExchangeType[];

    if (runningExchanges.length === 0) {
      await event.reply({
        content:
          "ERROR:\n> There is no exchange open for registration at the moment.",
        ephemeral: true,
      });
      return;
    }

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

    // Check for exchange
    logging.log(
      logging.Severity.DEBUG,
      "[/exchange register] Checking for exchange",
      options.exchange
    );
    console.log(
      `SELECT * FROM Exchange WHERE id = ${options.exchange} LIMIT 1;`
    );

    const exchange = runningExchanges.find(
      (e) => e.id === options.exchange
    ) as ExchangeType;

    if (!exchange) {
      await event.reply({
        content: "ERROR:\n> Could not find exchange.",
        ephemeral: true,
      });
      return;
    }

    // Check for valid registration period
    if (exchange.registerAccepted === false) {
      await event.reply({
        content: "ERROR:\n> Registration for this exchange is not open yet.",
        ephemeral: true,
      });
      return;
    }

    console.log(
      `SELECT * FROM ExchangeUser WHERE exchangeId = ${
        exchange.id
      } AND userId = "${event.user!.id}" LIMIT 1;`
    );

    // Check for existing registration
    const existingRegistrationRaw = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM ExchangeUser WHERE exchangeId = ? AND userId = ? LIMIT 1;`,
        [exchange.id, event.user!.id],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const retObj: ExchangeUserType[] = [];

            for (const row of rows) {
              const _r = row as ExchangeUserType;

              retObj.push({
                id: _r.id,
                userId: _r.userId,
                exchangeId: _r.exchangeId,
                pair: _r.pair,
                suggestions: _r.suggestions,
                preferences: _r.preferences,
              });

              console.log(retObj);
            }
            resolve(retObj);
          }
        }
      );
    });

    const existingRegistration = existingRegistrationRaw as ExchangeUserType[];

    console.log(existingRegistration);

    if (existingRegistration[0]) {
      await event.reply({
        content: "ERROR:\n> You are already registered for this exchange.",
        ephemeral: true,
      });
      return;
    }

    // Add to db
    logging.log(
      logging.Severity.DEBUG,
      "[/exchange register] Adding a new user to an exchange in the database"
    );
    const dbResult = await new Promise((resolve) => {
      db.all(
        `INSERT INTO ExchangeUser (userId, exchangeId, preferences) VALUES (?, ?, ?)`,
        [event.user!.id, exchange.id, options.preferences],
        (err) => {
          if (err) {
            logging.log(logging.Severity.ERROR, "Error:", err);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });

    if (!dbResult) {
      await event.reply({
        content: "ERROR:\n> Could not add you to the exchange.",
        ephemeral: true,
      });
      return;
    }

    // Send confirmation
    logging.log(
      logging.Severity.DEBUG,
      "[/exchange register] Sending confirmation"
    );
    await event.reply({
      content:
        "You have been registered for the exchange! I will send you a DM with your pair when the time comes.",
      ephemeral: true,
    });
  },
});
