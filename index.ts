import "dotenv/config";
import { dfp } from "@/utils/dfp.js";
import { client } from "@/utils/discord.js";
import logging from "@/utils/logging.js";
import app from "@/utils/api.js";
import fs from "fs";
import path from "path";
import endOfWeek from "./utils/checks/endOfWeek.js";
import polls from "./utils/checks/polls.js";

// TODO: Events: Reactions -> "I'm interested" -> Add to list of interested people

// TODO: Move all constants to their separate file in utils/constants.ts
export const intervals = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
};

const __dirname = path.dirname(new URL(import.meta.url).pathname);

client.once("ready", () => {
  logging.log(logging.Severity.INFO, `Logged in as ${client.user?.tag}!`);

  dfp.start({
    client,
    load: ["./commands"],
    register: {
      guilds: [process.env.GUILD_ID || ""],
      guildsOnly: true,
    },
  });

  app.listen(process.env.API_PORT || 3000, () => {
    logging.log(
      logging.Severity.INFO,
      `API listening on port ${process.env.API_PORT || 3000}`
    );
  });

  // TODO: Remove this and move it to the new system
  // Every MINUTE
  setInterval(async () => {
    await endOfWeek(client);
    await polls(client);
  }, intervals.MINUTE);
});

// Hijack anything that could cause the bot to crash
process.on("uncaughtException", (err) => {
  logging.log(logging.Severity.ERROR, "Uncaught exception", err);
  logging.log(logging.Severity.INFO, "Shutting down");

  // Move the log to a dated file
  const timestamp = new Date().toISOString();
  const logPath = path.join(__dirname, `./logs/${timestamp}.log`);
  fs.renameSync(path.join(__dirname, "./logs/latest.log"), logPath);

  process.exit(1);
});

// Hijack CTRL+C
process.on("SIGINT", () => {
  logging.log(logging.Severity.INFO, "SIGINT received, shutting down");

  // Move the log to a dated file
  const timestamp = new Date().toISOString();
  const logPath = path.join(__dirname, `./logs/${timestamp}.log`);
  fs.renameSync(path.join(__dirname, "./logs/latest.log"), logPath);

  process.exit(0);
});

client.login(process.env.TOKEN);
