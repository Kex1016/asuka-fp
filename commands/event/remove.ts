import { eventCommand } from "@/utils/dfp.js";

export default eventCommand.slash({
  description: "Remove an event",
  execute: async ({ event, options, ctx }) => {
    await event.deferReply();

    await event.editReply("WIP.");
  },
});
