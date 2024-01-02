import { command } from "@/utils/dfp.js";
import { GuildMemberRoleManager } from "discord.js";

export default command.slash({
  description: "Suggest the next server icon!",
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

    // Check if member has the role or above it
    const memberRoleManager = event.member.roles as GuildMemberRoleManager;
    const memberRole = memberRoleManager.highest;
    const requiredRole = event.guild.roles.cache.get(
      process.env.VOTING_MINIMUM_ROLE_ID || ""
    );

    if (!requiredRole) {
      await event.reply({
        content: "ERROR:\n> Could not fetch required role.",
        ephemeral: true,
      });
      return;
    }

    if (!memberRole) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member role.",
        ephemeral: true,
      });
      return;
    }

    if (memberRole.comparePositionTo(requiredRole) < 0) {
      await event.reply({
        content:
          "ERROR:\n> You do not have permission to use this command.\n" +
          "> You must be at least a <@&" +
          requiredRole.id +
          ">.",
        ephemeral: true,
      });
      return;
    }

    await event.reply(`wip name`);
  },
});
