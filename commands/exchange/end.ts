import { eventCommand } from "@/utils/dfp.js";

export default eventCommand.slash({
  description: "End the current exchange",
  async execute({ event, options, ctx }) {
    // Check for guild
    if (ctx.message === "no_guild" || !event.guild) {
      await event.reply({
        content: "ERROR:\n> This command can only be used in GCC.",
        ephemeral: true,
      });
      return;
    }

    // Check for member
    if (ctx.message === "no_member" || !event.member) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member.",
        ephemeral: true,
      });
      return;
    }

    // Check for permissions
    if (ctx.message === "no_perms" || !event.member.permissions) {
      await event.reply({
        content: "ERROR:\n> You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    await event.reply(`wip`);
  },
});
