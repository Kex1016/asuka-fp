import { command } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
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
    await event.deferReply();

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

    // TODO: [List Events] Add listing, only for the current week.

    await event.editReply({ embeds: [eventEmbed] });
  },
});
