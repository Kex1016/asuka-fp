import { eventCommand } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import { options } from "@discord-fp/djs";

export default eventCommand.slash({
  description: "Remove an event",
  options: {
    event: options.string({
      required: true,
      description: "The event to remove",
      async autoComplete(e) {
        const events = eventStore.getAll();
        const values: { name: string; value: string }[] = [];

        for (let event of events) {
          values.push({
            name: event.name,
            value: event.id,
          });
        }

        await e.respond(values);
      },
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

    // Check for permissions
    if (ctx.message === "no_perms" || !event.member.permissions) {
      await event.editReply({
        content: "ERROR:\n> You do not have permission to use this command.",
      });
      return;
    }

    // Get the event
    const eventId = options.event;
    const eventToRemove = eventStore.get(eventId);

    if (!eventToRemove) {
      await event.editReply({
        content: "ERROR:\n> Could not find event.",
      });
      return;
    }

    eventStore.edit(eventId, { ...eventToRemove, disabled: true });

    await event.editReply({
      content: `Event \`${eventToRemove.name}\` has been removed.`,
    });
  },
});
