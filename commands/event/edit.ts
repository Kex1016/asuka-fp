import { eventCommand } from "@/utils/dfp.js";
import { EventType, attachmentRegex, eventStore } from "@/utils/events.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";
import {
  EmbedBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
} from "discord.js";
import fs from "fs";
import path from "path";

export default eventCommand.slash({
  description: "Edit an event",
  options: {
    event: options.string({
      required: true,
      description: "The event to edit",
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
    name: options.string({
      required: false,
      description: "The name of the event",
    }),
    start: options.string({
      required: false,
      description: "The start of the event in the format YYYY-MM-DD HH:MM",
    }),
    end: options.string({
      required: false,
      description:
        "The end of the event in the format YYYY-MM-DD HH:MM (Default: 1 hour after start)",
    }),
    description: options.string({
      required: false,
      description: "The description of the event",
    }),
    type: options.string({
      required: false,
      description: "The type of the event",
      choices: {
        Groupwatch: { value: `${process.env.GROUPWATCH_CHANNEL_ID}` },
        Gaming: { value: `${process.env.GAMING_CHANNEL_ID}` },
        Gameshow: { value: `${process.env.GAMESHOW_CHANNEL_ID}` },
        Other: { value: `${process.env.OTHER_CHANNEL_ID}` },
      },
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

    // Check for permissions
    if (ctx.message === "no_perms" || !event.member.permissions) {
      await event.editReply({
        content: "ERROR:\n> You do not have permission to use this command.",
      });
      return;
    }

    const {
      event: eventId,
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

    // Test if at least one of the options is provided
    if (
      !name &&
      !start &&
      !end &&
      !description &&
      !channel &&
      !type &&
      !image &&
      !repeat &&
      !repeat_interval
    ) {
      await event.editReply(
        `**ERROR**\n> You must provide at least one option to edit`
      );
      return;
    }

    if ((repeat && !repeat_interval) || (repeat_interval && !repeat)) {
      await event.editReply(
        `**ERROR**\n> You must provide both \`repeat\` and \`repeat_interval\``
      );
      return;
    }

    const eventObject = eventStore.get(eventId);
    if (!eventObject) {
      await event.editReply(`**ERROR**\n> Event not found`);
      return;
    }

    let startDate: Date, endDate: Date;
    if (start) {
      try {
        startDate = new Date(start);
        // Check if the start date is after the current date
        if (startDate.getTime() < new Date().getTime()) {
          await event.editReply(
            `**ERROR**\n> The start date must be after the current date.`
          );
          return;
        }
      } catch (e) {
        await event.editReply(`**ERROR**\n> Invalid start date provided.`);
        return;
      }
    } else {
      startDate = eventObject.start;
    }

    if (end) {
      try {
        endDate = new Date(end);
        // Check if the end date is after the start date
        if (endDate.getTime() < startDate.getTime()) {
          await event.editReply(
            `**ERROR**\n> The end date must be after the start date.`
          );
          return;
        }

        // Check if the end date is after the current date
        if (endDate.getTime() < new Date().getTime()) {
          await event.editReply(
            `**ERROR**\n> The end date must be after the current date.`
          );
          return;
        }
      } catch (e) {
        await event.editReply(`**ERROR**\n> Invalid end date provided.`);
        return;
      }
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Get image
    let imageAttachment: string | undefined, imageBuffer: Buffer | undefined;

    if (image) {
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

      imageAttachment = `${eventObject.id}.${attachmentMatch[1]}`;
      imageBuffer = Buffer.from(buffer);

      // Save the image to the events folder
      const __dirname = new URL(".", import.meta.url).pathname;
      fs.writeFileSync(
        path.join(__dirname, "..", "..", "events", imageAttachment),
        imageBuffer
      );
    }

    const newEvent: EventType = {
      id: eventId,
      name: name || eventObject.name,
      start: startDate,
      end: endDate,
      description: description || eventObject.description,
      repeat: repeat || eventObject.repeat,
      repeat_interval: repeat_interval || eventObject.repeat_interval,
      image: imageAttachment || undefined,
      channel: channel?.id || eventObject.channel,
      disabled: false,
    };

    // Edit the discord event
    const guild = event.client.guilds.cache.get(process.env.GUILD_ID || "");
    if (!guild) {
      await event.editReply(`**ERROR**\n> Unable to find the guild.`);
      return;
    }

    eventStore.edit(eventId, newEvent);

    const eventEmbed = new EmbedBuilder()
      .setTitle("Event edited")
      .setDescription(`The event **${newEvent.name}** has been edited.`);

    // Add the fields if they got edited
    if (name) {
      eventEmbed.addFields([{ name: "Name", value: name }]);
    }

    if (start) {
      eventEmbed.addFields([
        {
          name: "Start",
          value: `<t:${Math.floor(startDate.getTime() / 1000)}>`,
        },
      ]);
    }

    if (end) {
      eventEmbed.addFields([
        {
          name: "End",
          value: `<t:${Math.floor(endDate.getTime() / 1000)}>`,
        },
      ]);
    }

    if (description) {
      eventEmbed.addFields([{ name: "Description", value: description }]);
    }

    if (type) {
      eventEmbed.addFields([{ name: "Type", value: type }]);
    }

    if (channel) {
      eventEmbed.addFields([{ name: "Channel", value: `<#${channel.id}>` }]);
    }

    if (image) {
      eventEmbed.setImage(image.proxyURL);
    }

    if (repeat) {
      eventEmbed.addFields([
        {
          name: "Repeat",
          value: repeat ? `Yes, every ${repeat_interval} days` : "No",
        },
      ]);
    }

    if (repeat_interval) {
      eventEmbed.addFields([
        {
          name: "Repeat Interval",
          value: `${repeat_interval} days`,
        },
      ]);
    }

    await event.editReply({ embeds: [eventEmbed] });
  },
});
