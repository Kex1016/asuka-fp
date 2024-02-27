import { intervals } from "@/index.js";
import { ScheduledEvent, ScheduledEventType } from "@/types/scheduledEvents.js";
import { uploadImage } from "@/utils/chibisafe.js";
import { eventCommand } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import { options } from "@discord-fp/djs";
import {
  Attachment,
  AttachmentBuilder,
  EmbedBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  TextChannel,
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

    // Test if the dates are valid
    if (startDate.getTime() > endDate.getTime()) {
      await event.editReply(
        `**ERROR**\n> The start date is after the end date`
      );
      return;
    }

    // Test if the event is in the past
    if (startDate.getTime() < Date.now()) {
      await event.editReply(`**ERROR**\n> The event is in the past`);
      return;
    }

    // Image downloading/uploading
    let imageName: string | undefined;
    let imageUrl: string | undefined;
    if (image) {
      console.log("Image received!");

      const _res = await uploadImage(image.proxyURL, "events");
      if (!_res) {
        await event.editReply({
          content: "ERROR:\n> Could not upload image.",
        });
        return;
      }
      imageName = _res.fileName;
      imageUrl = _res.fileUrl;
    }

    const eventObject: ScheduledEvent = {
      id: Math.floor(Math.random() * 100000),
      name,
      start: startDate,
      end: endDate,
      description,
      channel: channel?.id || undefined,
      image: imageName,
      imageUrl,
      repeat: repeat || false,
      repeat_interval: repeat_interval || 0,
      disabled: false,
      type: type as ScheduledEventType,
    };

    // Save the event
    eventStore.add(eventObject);

    // Respond with the event as an embed
    const eventEmbed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .addFields([
        {
          name: "Start",
          value: `<t:${Math.floor(startDate.getTime() / 1000)}>`,
          inline: true,
        },
        {
          name: "End",
          value: `<t:${Math.floor(endDate.getTime() / 1000)}>`,
          inline: true,
        },
      ])
      .setFooter({
        text: `ID: ${eventObject.id}`,
      });

    // Add additional fields based on given options
    if (imageUrl) {
      eventEmbed.setImage(imageUrl);
    }

    if (channel) {
      eventEmbed.addFields([
        {
          name: "Channel",
          value: `<#${channel.id}>`,
          inline: true,
        },
      ]);
    }

    if (repeat) {
      eventEmbed.addFields([
        {
          name: "Repeat",
          value: `Every ${repeat_interval} days`,
          inline: true,
        },
      ]);
    }

    await event.editReply({ embeds: [eventEmbed] });

    // Send the event to the designated channel
    const channelToSend = (await event.client.channels.fetch(
      process.env.EVENTS_ANNOUNCE_CHANNEL_ID || ""
    )) as TextChannel | undefined;
    if (!channelToSend) {
      return;
    }

    let announceContent = `New event! 🎉\n<@&${process.env.EVENTS_ANNOUNCE_ROLE_ID}>`;
    if (eventObject.type === ScheduledEventType.GROUPWATCH) {
      announceContent += ` <@&${process.env.GROUPWATCH_ANNOUNCE_ROLE_ID}>`;
    }

    if (eventObject.type === ScheduledEventType.GAMING) {
      announceContent += ` <@&${process.env.GAMING_ANNOUNCE_ROLE_ID}>`;
    }

    if (eventObject.type === ScheduledEventType.GAMESHOW) {
      announceContent += ` <@&${process.env.GAMESHOW_ANNOUNCE_ROLE_ID}>`;
    }

    await channelToSend.send({
      content: announceContent,
      embeds: [eventEmbed],
    });
  },
});
