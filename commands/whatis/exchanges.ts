import { command } from "@/utils/dfp.js";

export default command.slash({
  description: "Info about the exchanges!",
  execute: async ({ event, options, ctx }) => {
    await event.deferReply();

    await event.editReply({
      content:
        `**What are the exchanges?**\n` +
        `> Essentially, it's a way to watch new stuff with the help of ` +
        `other people. We make a new exchange every month or so, and ` +
        `you can register for it using the \`/exchange register\` command.\n\n` +
        `**What happens after I register?**\n` +
        `> After you register, you'll be added to the list of people who are ` +
        `participating in the exchange. Then after a while, you'll be randomly ` +
        `paired with someone else who's also participating. You'll be able to ` +
        `see what they like, and you can suggest something for them to ` +
        `watch.\n\n` +
        `**What can I suggest?**\n` +
        `> Anything! As long as it's not something that you already ` +
        `suggested, you can suggest it. You can also suggest multiple ` +
        `things if you want to give your partner a few options. ` +
        `Though you will have to limit yourself to a maximum of 3. ` +
        `Oh, and if there's a theme for the exchange, you'll have to ` +
        `suggest something that fits the theme.\n\n` +
        `**Themed exchanges?**\n` +
        `> Sometimes we do themed exchanges, where you have to suggest ` +
        `anime that contains that genre. For example, we do a "romance" ` +
        `exchange, where you have to suggest romance anime.\n\n` +
        `**What happens after I suggest something?**\n` +
        `> After you suggest something, your partner will be able to see ` +
        `what you suggested and they can choose to watch it. *You have to ` +
        `watch at least one thing that your partner suggested.* There ` +
        `are threads created for each exchange, where you can discuss ` +
        `what you watched too!\n\n` +
        `**What if I don't watch what my partner suggested?**\n` +
        `> If you don't watch what your partner suggested enough times, ` +
        `you won't be able to participate in the next exchange. So ` +
        `please, do your best :)`,
    });
  },
});
