import { command } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import { EmbedBuilder } from "discord.js";

export default command.slash({
  description: "Lists all events",
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

    const events = eventStore.getAll();

    if (events.length === 0) {
      await event.editReply("No events found.");
      return;
    }

    const eventEmbed = new EmbedBuilder()
      .setTitle("Events")
      .setDescription("Here are all the events currently scheduled");

    for (const event of events) {
      eventEmbed.addFields([
        {
          name: event.name,
          value: `${event.description}\n\n**Start:** <t:${Math.floor(
            event.start.getTime() / 1000
          )}>\n**End:** <t:${Math.floor(event.end.getTime() / 1000)}>`,
        },
      ]);
    }

    await event.editReply({ embeds: [eventEmbed] });
  },
});
