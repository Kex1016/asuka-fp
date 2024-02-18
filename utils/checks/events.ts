import { Client } from "discord.js";
import { eventStore } from "../events.js";

export default async (client: Client) => {
  const events = eventStore.getAll();

  // Check for events that are an hour away and haven't been checked since an hour
  for (const event of events) {
    if (event.start.getTime() - Date.now() < 3600000 && event.start.getTime() - Date.now() > 0) {
      if (event.checked && event.checked.getTime() - Date.now() > 3600000) {
        // Send a message to the channel
        // TODO: Finish this
        const channel = client.channels.cache.get(event.channel);
        if (channel?.isText()) {
          channel.send({
            content: `Event starting in an hour: ${event.name}`,
          });
        }
      }
    }
};
