import { command } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";
import { EmbedBuilder } from "discord.js";

export default command.slash({
  description: "Lists all events for the current week.",
  options: {
    next: options.boolean({
      required: false,
      description: "Whether to show the next week instead of the current one.",
    }),
  },
  execute: async ({ event, options, ctx }) => {
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

    const { next } = options;

    const events = eventStore.get();

    if (events.length === 0) {
      await event.editReply("No events found.");
      return;
    }

    const eventEmbed = new EmbedBuilder()
      .setTitle("Events")
      .setDescription(
        "Here are all the events currently scheduled for " +
          (next ? "next week" : "this week") +
          "."
      );

    // TODO: [List Events] Add listing, only for the current week. Week starts on Monday.
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    if (next) weekStart.setDate(weekStart.getDate() + 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const filteredEvents = events.filter((event) => {
      let start: Date;
      try {
        start = new Date(event.start);
      } catch (e) {
        logging.log(
          logging.Severity.ERROR,
          `Failed to parse date for event: ${event.name} (${event.id})`
        );
        return false;
      }

      return start >= weekStart && start <= weekEnd;
    });

    for (let event of filteredEvents) {
      let start: Date, end: Date;
      try {
        start = new Date(event.start);
        end = new Date(event.end);
      } catch (e) {
        logging.log(
          logging.Severity.ERROR,
          `Failed to parse date for event: ${event.name} (${event.id})`
        );
        continue;
      }

      eventEmbed.addFields([
        {
          name: event.name,
          value: `${event.description}\n**Channel:** ${
            event.channel ? `<#${event.channel}>` : "Unknown"
          }\n**Start:** <t:${Math.floor(
            start.getTime() / 1000
          )}:f>\n**End:** <t:${Math.floor(end.getTime() / 1000)}:f>`,
        },
      ]);
    }

    if (filteredEvents.length === 0) {
      eventEmbed.addFields([
        {
          name: "No events found",
          value:
            "No events found for " + (next ? "next week" : "this week") + ".",
        },
      ]);
    }

    await event.editReply({ embeds: [eventEmbed] });
  },
});
