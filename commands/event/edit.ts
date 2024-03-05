import { ephemeralAttachmentRegex } from "@/utils/constants.js";
import { eventCommand } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import logging from "@/utils/logging.js";
import { options } from "@discord-fp/djs";
import {
  EmbedBuilder,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
  TextChannel,
} from "discord.js";
import fs from "fs";
import path from "path";
import {
  createAlbum,
  getAlbums,
  uploadFile,
  uploadImage,
} from "@/utils/chibisafe.js";
import { Album, CreatedAlbum } from "@/types/chibisafe.js";

export default eventCommand.slash({
  description: "Edit an event",
  options: {
    event: options.number({
      required: true,
      description: "The event to edit",
      async autoComplete(e) {
        const events = eventStore.get();
        const values: { name: string; value: string }[] = [];

        for (let event of events) {
          values.push({
            name: event.name,
            value: event.id.toString(),
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
        Groupwatch: { value: "groupwatch" },
        Gaming: { value: "gaming" },
        Gameshow: { value: "gameshow" },
        Other: { value: "other" },
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
      image,
      repeat,
      repeat_interval,
      type,
    } = options;

    // Test if at least one of the options is provided
    if (
      !name &&
      !start &&
      !end &&
      !description &&
      !channel &&
      !image &&
      !repeat &&
      !repeat_interval &&
      !type
    ) {
      logging.log(
        logging.Severity.WARN,
        `At least one option must be provided to edit an event`
      );

      await event.editReply(
        `**ERROR**\n> You must provide at least one option to edit`
      );
      return;
    }

    // Get the event
    const eventToEdit = eventStore.fetch(eventId);

    if (!eventToEdit) {
      logging.log(
        logging.Severity.WARN,
        `Could not find event with id ${eventId}`
      );

      await event.editReply({
        content: "ERROR:\n> Could not find event.",
      });
      return;
    }

    // Check if there's an image
    let imageName: string | undefined;
    let imageUrl: string | undefined;
    if (image) {
      const _res = await uploadImage(image.proxyURL, "events");
      console.log(_res);

      if (!_res) {
        logging.log(
          logging.Severity.ERROR,
          `Failed to upload image for event: ${name}`
        );

        await event.editReply({
          content: "ERROR:\n> Could not upload image.",
        });
        return;
      }
      imageName = _res.fileName;
      imageUrl = _res.fileUrl;
    }

    // Set the new values
    const newEvent = {
      ...eventToEdit,
      name: name || eventToEdit.name,
      start: start ? new Date(start) : eventToEdit.start,
      end: end ? new Date(end) : eventToEdit.end,
      description: description || eventToEdit.description,
      repeat: repeat || eventToEdit.repeat,
      repeat_interval: repeat_interval || eventToEdit.repeat_interval,
      image: imageName || eventToEdit.image,
      imageUrl: imageUrl || eventToEdit.imageUrl,
      channel: channel ? channel.id : eventToEdit.channel,
      type: (type as any) || eventToEdit.type, // HACK: Once again, `as any` is used to bypass the type check... Not good.
    };

    // Update the event
    eventStore.update(newEvent);
    logging.log(
      logging.Severity.INFO,
      `Event ${eventToEdit.name} has been updated`
    );

    const eventEmbed = new EmbedBuilder();
    eventEmbed.setTitle(`Updates to ${newEvent.name}`);
    for (const [key, value] of Object.entries(newEvent)) {
      // first test if they differ
      if (eventToEdit[key] === value) continue;
      if (key === "id") continue;
      if (key === "channel") {
        eventEmbed.addFields([
          {
            name: "Channel",
            value: `<#${value}>`,
            inline: true,
          },
        ]);
        continue;
      }
      if (key === "image") continue;
      if (key === "imageUrl") {
        eventEmbed.setImage(value);
        continue;
      }
      if (key === "start" || key === "end") {
        let date, prevDate;
        try {
          date = new Date(value);
          prevDate = new Date(eventToEdit[key]);
        } catch (e) {
          logging.log(
            logging.Severity.ERROR,
            `Failed to parse date for event update: ${newEvent.name} (${newEvent.id})`
          );
          continue;
        }
        eventEmbed.addFields([
          {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: `<t:${Math.floor(
              date.getTime() / 1000
            )}:f> -> <t:${Math.floor(prevDate.getTime() / 1000)}:f>`,
            inline: true,
          },
        ]);
      }
      eventEmbed.addFields([
        {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: `${eventToEdit[key]} -> ${value}`,
          inline: true,
        },
      ]);
    }
    eventEmbed.setFooter({
      text: `ID: ${newEvent.id}`,
    });

    logging.log(
      logging.Severity.INFO,
      `Sending confirmation of event update: ${newEvent.name} (${newEvent.id})`
    );
    await event.editReply({
      embeds: [eventEmbed],
    });

    // Send an update notice to the event channel
    const eventChannel = event.guild.channels.cache.get(
      process.env.EVENTS_ANNOUNCE_CHANNEL_ID || ""
    ) as TextChannel;

    if (!eventChannel) return;

    // TODO: Make it send a reply to the original message instead of just sending a new message
    // const eve

    const eventMessage = await eventChannel.send({
      embeds: [eventEmbed],
    });
  },
});
