import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { EventType, eventStore } from "../events.js";
import logging from "../logging.js";
import { intervals } from "@/index.js";

async function sendEventMessage(event: EventType, client: Client) {
  if (!event.channel) {
    logging.log(
      logging.Severity.ERROR,
      `Event ${event.name} does not have a channel set!`
    );
    return;
  }

  const channel = (await client.channels.fetch(event.channel)) as TextChannel;
  if (!channel) {
    logging.log(
      logging.Severity.ERROR,
      `Event ${event.name}'s channel does not exist!`
    );
    return;
  }

  const eventEmbed = new EmbedBuilder()
    .setTitle(event.name)
    .setDescription(event.description)
    .setTimestamp(event.start)
    .setFooter({ text: "Event starting at" })
    .setColor("#00ff00");

  if (event.image) {
    // TODO: image uploading to safe.haiiro.moe from add command, then use the link here
    //eventEmbed.setImage(event.image);
  }

  await channel.send({ embeds: [eventEmbed] });
}

export default async (client: Client) => {
  const events = eventStore.getAll();

  // Check if there are any events without nextCheck or if the nextCheck is in the past
  for (const event of events) {
    const currTime = new Date();
    if (!event.nextCheck || event.nextCheck < currTime) {
      // Do something
      // i know i want setTimeout here
      // maybe setTimeout to the nextCheck time?
      // or setTimeout to the nextCheck time - currTime?
      // next check will be set when there's an hour left to the event??? idk

      // test for now
      if (event.start < currTime) {
        logging.log(
          logging.Severity.DEBUG,
          `Event ${event.name} already started at ${event.start}!`
        );
      }

      if (event.start.getTime() - currTime.getTime() < intervals.HOUR) {
        logging.log(
          logging.Severity.DEBUG,
          `Event ${event.name} is starting in less than an hour!`
        );

        // Set nextCheck to 5 minutes before the event
        event.nextCheck = new Date(
          event.start.getTime() - intervals.MINUTE * 5
        );

        //eventStore.edit(event.id, event);
      }
    }
  }
};
