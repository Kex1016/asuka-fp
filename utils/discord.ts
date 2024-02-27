import { Client, GatewayIntentBits, Partials } from "discord.js";

import fs from "fs";
import path from "path";
import { AsukaCheck, AsukaEvent } from "@/types/asuka.js";
import logging from "./logging.js";

export const client = new Client({
  intents: [
    // TODO: [low priority] Honestly, I just vomited these in as my plans for the bot expanded. Clean this up.
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
});

// Load events dynamically from project_root/events
const __dirname = path.resolve(new URL(import.meta.url).pathname);

// Get all event files from <project_root>/events (recursively!!)
const getFilesRecursively = (dir: string): string[] => {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  let fileList: string[] = [];

  for (const file of files) {
    if (file.isDirectory()) {
      fileList = fileList.concat(
        getFilesRecursively(path.join(dir, file.name))
      );
    } else {
      // Add to the list in this format: "@/events/<rest_of_path>"
      const addPath = path.join(dir, file.name).replace(__dirname, "@/events");
      logging.log(logging.Severity.DEBUG, `Found valid file: ${addPath}`);

      fileList.push(addPath);
    }
  }

  return fileList;
};

for (const file of getFilesRecursively(path.join(__dirname, "../../events"))) {
  logging.log(logging.Severity.INFO, `Loading event: ${file}`);

  const eventImport = await import(file);
  if (!eventImport.default) continue;

  const event: AsukaEvent = eventImport.default;

  // Just skip the event if it's not valid
  if (!event.type) continue;
  if (!event.handler) continue;

  if (event.once) {
    client.once(event.type, event.handler);
  } else {
    client.on(event.type, event.handler);
  }

  logging.log(logging.Severity.INFO, `Loaded event: ${event.name}`);
}

// Load checks dynamically from <project_root>/checks
const checks: AsukaCheck[] = [];
for (const file of getFilesRecursively(path.join(__dirname, "../../checks"))) {
  logging.log(logging.Severity.INFO, `Loading check: ${file}`);

  const checkImport = await import(file);
  if (!checkImport.default) continue;

  const check: AsukaCheck = checkImport.default;

  checks.push(check);
}

// Load checks based on interval (group them, and run them in a single interval)
const checkGroups: Record<number, AsukaCheck[]> = {};
for (const check of checks) {
  if (!checkGroups[check.interval]) {
    checkGroups[check.interval] = [];
  }

  checkGroups[check.interval].push(check);
}

// Run checks based on interval
client.on("ready", async () => {
  for (const interval in checkGroups) {
    const _interval = parseInt(interval);
    if (isNaN(_interval)) continue;

    logging.log(
      logging.Severity.INFO,
      `Setting up checks with interval ${_interval}`
    );

    setInterval(() => {
      for (const check of checkGroups[_interval]) {
        check.handler(client);
      }
    }, _interval);
  }
});
