import fs from "fs";
import logging from "./logging.js";
import { ScheduledEvent } from "@/types/scheduledEvents.js";

// Define the event store
class EventStore {
  // Define the events
  private events: ScheduledEvent[] = [];

  // Read the events from the file
  public read = (): EventStore => {
    try {
      this.events = JSON.parse(
        fs.readFileSync("./data/scheduledEvents.json", "utf-8")
      );
    } catch (e) {
      logging.log(logging.Severity.ERROR, `Failed to read events:`, e);
    }

    return this;
  };

  // Write the events to the file
  public write = (): EventStore => {
    try {
      // Test if data directory exists
      if (!fs.existsSync("./data")) {
        fs.mkdirSync("./data");
      }

      fs.writeFileSync(
        "./data/scheduledEvents.json",
        JSON.stringify(this.events, null, 2)
      );
    } catch (e) {
      logging.log(logging.Severity.ERROR, `Failed to write events:`, e);
    }

    return this;
  };

  // Get the events
  // - Get all events
  public get = (): ScheduledEvent[] => this.events;
  // - Get a specific event
  public fetch = (id: number): ScheduledEvent | undefined =>
    this.events.find((event) => event.id === id);

  // Add an event
  public add = (event: ScheduledEvent): EventStore => {
    this.events.push(event);
    this.write();
    return this;
  };

  // Remove an event
  public remove = (id: number): EventStore => {
    this.events = this.events.filter((event) => event.id !== id);
    this.write();
    return this;
  };

  // Update an event
  public update = (event: ScheduledEvent): EventStore => {
    this.events = this.events.map((e) => (e.id === event.id ? event : e));
    this.write();
    return this;
  };
}

// Export a global instance of the event store
export const eventStore = new EventStore().read();
