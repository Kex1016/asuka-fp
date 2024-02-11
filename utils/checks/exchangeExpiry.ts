import { Client } from "discord.js";
import databaseConnection from "../database.js";
import { ExchangeType } from "@/types/exchange.js";
import logging from "../logging.js";

const db = databaseConnection.getDatabase();
export async function exchangeExpiry(client: Client) {
  logging.log(logging.Severity.DEBUG, "Checking for expired exchanges");

  // Get the current date
  const currentDate = Date.now();

  // Get all the exchanges
  const exchanges = (await new Promise((resolve) => {
    db.all("SELECT * FROM Exchange", (err, rows) => {
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
              (row as { registerAccepted: number }).registerAccepted === 1,
          });
        }
        resolve(retObj);
      }
    });
  })) as ExchangeType[];

  // Check for expired exchanges
  for (const exchange of exchanges) {
    if (new Date(exchange.end).getTime() < currentDate) {
      // Set the exchange to not accepting registrations
      logging.log(
        logging.Severity.INFO,
        `Exchange ${exchange.id} has expired. Setting to not accepting registrations`
      );

      await new Promise((resolve) => {
        db.all(
          "UPDATE Exchange SET registerAccepted = 0 WHERE id = ?",
          [exchange.id],
          (err) => {
            if (err) {
              logging.log(
                logging.Severity.ERROR,
                `Error setting exchange ${exchange.id} to not accepting registrations`
              );
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    }
  }
}
