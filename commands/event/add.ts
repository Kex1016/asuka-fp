import { intervals } from "@/index.js";
import { eventCommand } from "@/utils/dfp.js";
import { EventType, attachmentRegex, eventStore } from "@/utils/events.js";
import { options } from "@discord-fp/djs";
import {
  Attachment,
  AttachmentBuilder,
  EmbedBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
} from "discord.js";
import fs from "fs";
import path from "path";

export default eventCommand.slash({
  description: "Add a new event",
  options: {
    name: options.string({
      required: true,
      description: "The name of the event",
    }),
    start: options.string({
      required: true,
      description:
        'The start of the event in the format YYYY-MM-DD HH:MM or "now"',
    }),
    description: options.string({
      required: true,
      description: "The description of the event",
    }),
    type: options.string({
      required: true,
      description: "The type of the event",
      choices: {
        Groupwatch: { value: "groupwatch" },
        Gaming: { value: "gaming" },
        Gameshow: { value: "gameshow" },
        Other: { value: "other" },
      },
    }),
    end: options.string({
      required: false,
      description:
        "The end of the event in the format YYYY-MM-DD HH:MM (Default: 1 hour after start)",
    }),
    channel: options.channel({
      required: false,
      description: "The channel used for the event",
    }),
    image: options.attachment({
      required: false,
      description: "The image used for the event",
    }),
    repeat: options.boolean({
      required: false,
      description: "Whether the event should repeat",
    }),
    repeat_interval: options.number({
      required: false,
      description: "The interval in which the event should repeat",
      choices: {
        Daily: { value: 1 },
        Weekly: { value: 7 },
        Monthly: { value: 30 },
      },
    }),
  },
  execute: async ({ event, options, ctx }) => {
    await event.deferReply({ ephemeral: true });

    const {
      name,
      start,
      end,
      description,
      channel,
      type,
      image,
      repeat,
      repeat_interval,
    } = options;

    if ((repeat && !repeat_interval) || (repeat_interval && !repeat)) {
      await event.editReply(
        `**ERROR**\n> You must provide both \`repeat\` and \`repeat_interval\``
      );
      return;
    }

    let startDate: Date;
    try {
      if (start === "now") {
        startDate = new Date();
      } else {
        startDate = new Date(start);
      }
    } catch (err) {
      await event.editReply(
        `**ERROR**\n> Unable to parse start date\n\`${err}\``
      );
      return;
    }

    let endDate: Date;
    try {
      if (end) {
        endDate = new Date(end);
      } else {
        endDate = new Date(startDate.getTime() + intervals.HOUR);
      }
    } catch (err) {
      await event.editReply(
        `**ERROR**\n> Unable to parse end date\n\`${err}\``
      );
      return;
    }

    let imageAttachment: string | undefined, imageBuffer: Buffer | undefined;
    if (image) {
      const __dirname = new URL(".", import.meta.url).pathname;
      const buffer = await fetch(image.proxyURL).then((res) =>
        res.arrayBuffer()
      );

      const attachmentMatch = image.proxyURL.match(attachmentRegex);

      if (!attachmentMatch) {
        await event.editReply(
          `**ERROR**\n> Unable to parse image attachment URL`
        );
        return;
      }

      fs.writeFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "events",
          `${eventStore.count()}.${attachmentMatch[1]}`
        ),
        Buffer.from(buffer)
      );

      imageAttachment = `${eventStore.count()}.${attachmentMatch[1]}`;
      imageBuffer = Buffer.from(buffer);
    }

    const eventObject: EventType = {
      id: `${eventStore.count()}`,
      name,
      start: startDate,
      end: endDate,
      description,
      channel: channel?.id || undefined,
      image: imageAttachment || undefined,
      repeat: repeat || false,
      repeat_interval: repeat_interval || 0,
      disabled: false,
    };

    // Test if the dates are valid
    if (eventObject.start.getTime() > eventObject.end.getTime()) {
      await event.editReply(
        `**ERROR**\n> The start date is after the end date`
      );
      return;
    }

    // Test if the event is in the past
    if (eventObject.start.getTime() < Date.now()) {
      await event.editReply(`**ERROR**\n> The event is in the past`);
      return;
    }

    const __dirname = new URL(".", import.meta.url).pathname;
    fs.writeFileSync(
      path.join(__dirname, "..", "..", "events", `${eventStore.count()}.json`),
      JSON.stringify(eventObject)
    );

    // Add the event to Discord
    const guild = event.client.guilds.cache.get(process.env.GUILD_ID || "");
    if (!guild) {
      await event.editReply(`**ERROR**\n> Unable to find guild`);
      return;
    }

    const replyEmbed = new EmbedBuilder()
      .setTitle(eventObject.name)
      .setDescription(eventObject.description)
      .addFields([
        {
          name: "Start",
          value: `<t:${Math.floor(eventObject.start.getTime() / 1000)}:R>`,
        },
        {
          name: "End",
          value: `<t:${Math.floor(eventObject.end.getTime() / 1000)}:R>`,
        },
        {
          name: "Type",
          value: type,
        },
        {
          name: "Repeat",
          value: eventObject.repeat
            ? `Yes, every ${eventObject.repeat_interval} days`
            : "No",
        },
      ])
      .setColor("Random");

    eventStore.add(eventObject);

    if (image) {
      replyEmbed.setImage(image.url);
    }

    event.editReply({
      content: `**SUCCESS**\n> Event added successfully!`,
      embeds: [replyEmbed],
    });
  },
});
