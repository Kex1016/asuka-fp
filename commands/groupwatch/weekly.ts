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
    const events = await guild.scheduledEvents.fetch();
    if (!events) {
      await event.reply({
        content: "ERROR:\n> Could not fetch events.",
        ephemeral: true,
      });
      return;
    }

    // Get events for this week
    logging.log(
      logging.Severity.DEBUG,
      "[/groupwatch weekly] Filtering events"
    );
    const thisWeek = events.filter((event) => {
      const now = new Date();
      const start = new Date(event.scheduledStartAt || 0);
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return (
        start >= now && start <= weekLater && event.name.startsWith("[GW]")
      );
    });

    // If no events, return
    logging.log(
      logging.Severity.DEBUG,
      "[/groupwatch weekly] Checking if events exist"
    );
    if (thisWeek.size === 0) {
      await event.reply({
        content: "There are no groupwatches this week.",
      });
      return;
    }

    // Create embed
    logging.log(logging.Severity.DEBUG, "[/groupwatch weekly] Creating embed");
    const embed = new EmbedBuilder()
      .setTitle("This week's groupwatches")
      .setColor(0x00ff00);

    // Add fields per day
    logging.log(logging.Severity.DEBUG, "[/groupwatch weekly] Adding fields");
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    for (const day of days) {
      const events = thisWeek.filter((event) => {
        const start = new Date(event.scheduledStartAt || 0);
        return start.toLocaleString("en-US", { weekday: "long" }) === day;
      });

      if (events.size === 0) continue;

      const field = {
        name: day,
        value: events
          .map((event) => {
            const start = new Date(event.scheduledStartAt || 0);
            const timeString = `<t:${Math.floor(start.getTime() / 1000)}:t>`;
            const name = event.name.replace("[GW]", "").trim();

            return `${timeString} - [${name}](${event.url})`;
          })
          .join("\n"),
        inline: false,
      };

      embed.addFields([field]);
    }

    // Send embed
    logging.log(logging.Severity.DEBUG, "[/groupwatch weekly] Sending embed");
    await event.reply({
      embeds: [embed],
    });
  },
});
