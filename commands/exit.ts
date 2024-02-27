import { command } from "@/utils/dfp.js";

export default command.slash({
  description: "Exit the bot. Owner only command.",
  execute: async ({ event, ctx, options }) => {
    // Test if the command is done by the owner
    if (event.user.id !== "147709526357966848") {
      await event.reply("You are not the owner of this bot!");
      return;
    }

    await event.reply("Exiting...");

    event.client.destroy();
    process.exit(0);
  },
});
