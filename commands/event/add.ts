import { eventCommand } from "@/utils/dfp.js";
import { eventStore } from "@/utils/events.js";
import { options } from "@discord-fp/djs";
import ical from "node-ical";
import fs from "fs";
import path from "path";

export default eventCommand.slash({
  description: "Add a new event",
  options: {
    name: options.string({
      required: true,
      description: "The name of the event",
    }),
    date: options.string({
      required: true,
      description: "The date of the event in the format YYYY-MM-DD HH:MM",
    }),
    description: options.string({
      required: true,
      description: "The description of the event",
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

    const { name, date, description, channel, image, repeat, repeat_interval } =
      options;

    await event.editReply(
      `Your event:\nName: ${name}\nDate: ${date}\nDescription: ${description}\nChannel: ${channel}\nImage: ${image}\nRepeat: ${repeat}\nRepeat interval: ${repeat_interval}`
    );

    eventStore.add({
      id: "1",
      name,
      date,
      description,
      channel: channel?.id || undefined,
      image: image?.name || undefined,
      repeat: repeat || false,
      repeat_interval: repeat_interval || 0,
    });

    // TODO: Switch to my own calendar implementation. [HIGH PRIO]
    const icsRaw = `
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//hacksw/handcal//NONSGML v1.0//EN
    BEGIN:VEVENT
    UID:${eventStore.count()}
    DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "")}
    DTSTART:${new Date(date).toISOString().replace(/[-:]/g, "")}
    SUMMARY:${name}
    DESCRIPTION:${description}
    ${channel ? `DISCORD-CHANNEL:${channel?.id}` : ""}
    ${image ? `DISCORD-IMAGE:${image?.name}` : ""}
    ${repeat ? `DISCORD-REPEAT:${repeat}` : ""}
    ${repeat_interval ? `DISCORD-REPEAT_INT:${repeat_interval}` : ""}
    END:VEVENT
    END:VCALENDAR
    `;

    const __dirname = new URL(".", import.meta.url).pathname;
    fs.writeFileSync(
      path.join(__dirname, "..", "..", "events", `${eventStore.count()}.ics`),
      icsRaw.trim().replace(/^[ \t]+/gm, "")
    );

    event.editReply("Event added.");
  },
});
