import { command } from "@/utils/dfp.js";
import { client } from "@/utils/discord.js";
import logging from "@/utils/logging.js";
import { EmbedBuilder } from "discord.js";

export default command.slash({
  description: "Get the weekly groupwatch schedule",
  options: {},
  execute: async ({ event, options, ctx }) => {
    // If not in guild, return
    logging.log(
      logging.Severity.DEBUG,
      "[/groupwatch weekly] Checking if in guild"
    );
    if (ctx.message === "no_guild" || !event.guild) {
      await event.reply({
        content: "ERROR:\n> This command can only be used in GCC.",
        ephemeral: true,
      });
      return;
    }

    if (ctx.message === "no_member" || !event.member) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member.",
        ephemeral: true,
      });
      return;
    }

    // Get events
    logging.log(logging.Severity.DEBUG, "[/groupwatch weekly] Fetching guild");
    const guild = await client.guilds.fetch(event.guild.id);
    if (!guild) {
      await event.reply({
        content: "ERROR:\n> Could not fetch guild.",
        ephemeral: true,
      });
      return;
    }

    logging.log(logging.Severity.DEBUG, "[/groupwatch weekly] Fetching events");
    // TODO: Attach this to the new event store
  },
});
