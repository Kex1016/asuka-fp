import "dotenv/config";
import { dfp } from "@/utils/dfp.js";
import { client } from "@/utils/discord.js";
import logging from "@/utils/logging.js";
import app from "@/utils/api.js";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const token = process.env["TOKEN"];

client.once("ready", () => {
  logging.log(logging.Severity.INFO, `Logged in as ${client.user?.tag}!`);

  dfp.start({
    client,
    load: ["./commands"],
  });

  app.listen(process.env.API_PORT || 3000, () => {
    logging.log(
      logging.Severity.INFO,
      `API listening on port ${process.env.API_PORT || 3000}`
    );
  });
});

// Hijack anything that could cause the bot to crash
process.on("uncaughtException", (err) => {
  logging.log(logging.Severity.ERROR, "Uncaught Exception: " + err);

  // Move the log to a dated file
  const timestamp = new Date().toISOString();
  const logPath = path.join(__dirname, `../logs/${timestamp}.log`);
  fs.renameSync(path.join(__dirname, "../logs/latest.log"), logPath);

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

client.login(token);
