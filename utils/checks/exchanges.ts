import { intervals } from "@/index.js";
import { Client } from "discord.js";
import databaseConnection, { ExchangeType } from "../database.js";
import logging from "../logging.js";

export default async (client: Client) => {
  if (!process.env.EXCHANGE_REGISTER_DAYS) return;

  const exchangeRegisterDays = Number.parseInt(process.env.EXCHANGE_REGISTER_DAYS);

  logging.log(
    logging.Severity.DEBUG,
    "[/checks/exchanges.ts] Running exchange checks."
  );

  // Get all the exchanges 
  const db = databaseConnection.getDatabase();
  const exchanges = await new Promise(resolve => {
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
            start: new Date((row as {start: string | number}).start),
            end: new Date((row as {end: string | number}).end),
            registerAccepted: (row as {registerAccepted: number}).registerAccepted === 1,
          }); 
        }

        resolve(retObj);
      }
    });
  }) as ExchangeType[]; 

  for (const exchange of exchanges) {
    // Test for valid registration period, and send out pairs.
    if (exchange.start.getTime() + (intervals.DAY * exchangeRegisterDays) <= Date.now()) {
      await new Promise(resolve => {});
      logging.log(
        logging.Severity.DEBUG,
        `[/checks/exchanges.ts] Register window for #${exchange.id} is over. Modified the DB.`
      );

      // TODO: send out the pairs
    }
  }

  return true;
};
