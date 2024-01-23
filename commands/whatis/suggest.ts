import { command } from "@/utils/dfp.js";

export default command.slash({
  description: "Query text",
  execute: async ({ event, options, ctx }) => {
    await event.reply({
      content: "One second...",
    });

    await event.editReply({
      content:
        `**What is \`/suggest\`?**\n` +
        `> \`/suggest\` is a command that allows you to suggest a new server icon and name for the server!\n\n` +
        `**How do I use it?**\n` +
        `> You can use \`/suggest\` by typing \`/suggest\` in any channel in the server. Then, you just need to follow the instructions!\n\n` +
        `**What are the requirements?**\n` +
        `> You must have the <@&${process.env.VOTING_MINIMUM_ROLE_ID}> role or above it to use this command.\n\n` +
        `**What happens after I suggest something?**\n` +
        `> After you suggest something, it will be sent to the <#${process.env.VOTING_LIST_CHANNEL_ID}> channel. Then, people can vote on it!\n\n` +
        `**How does my suggestion get chosen?**\n` +
        `> At the end of the week, the suggestion with the most votes will be chosen!`,
    });
  },
});
