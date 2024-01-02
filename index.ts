import "dotenv/config";
import { dfp } from "@/utils/dfp.js";
import { client } from "@/utils/discord.js";
import logging from "@/utils/logging.js";
import app from "@/utils/api.js";

//store your token in environment variable or put it here
const token = process.env["TOKEN"];

client.on("ready", () => {
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

client.login(token);
