import { command } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";

export default command.slash({
  description: "Start an exchange",
  options: {
    theme: options.string({
      description: "Theme of the exchange",
      required: true,
    }),
  },
  async execute({ event, options, ctx }) {
    await event.reply(`wip`);
  },
});
