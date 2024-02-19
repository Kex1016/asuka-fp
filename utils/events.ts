import fs from "fs";
import logging from "./logging.js";

// Event store for the app
export const attachmentRegex =
  /https:\/\/media\.discordapp\.net\/ephemeral-attachments\/\d+\/\d+\/.+\.(.+)\?.+/;

// TODO: Image uploading to safe.haiiro.moe and store the URL in an imageUrl field
// TODO: Actually, this whole thing might be better in a database instead of files :/
export type EventType = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  description: string;
  repeat: boolean;
  repeat_interval: number;
  image?: string;
  channel?: string;
  disabled: boolean;
  nextCheck?: Date;
};

// TODO: Maybe the add func saves the event to the file? Would remove a lot of code from elsewhere.
export class EventStore {
  private events: EventType[] = [];

  public constructor(events: EventType[] = []) {
    this.events = events;
  }

  public add(event: EventType) {
    this.events.push(event);
  }

  public remove(id: string) {
    this.events = this.events.filter((event) => event.id !== id);
  }

  public get(id: string) {
    return this.events.find((event) => event.id === id);
  }

  public set(id: string, event: EventType) {
    const index = this.events.findIndex((event) => event.id === id);
    this.events[index] = event;
  }

  public getAll() {
    return this.events;
  }

  public edit(id: string, event: EventType) {
    const index = this.events.findIndex((event) => event.id === id);
    this.events[index] = event;
  }

  public clear() {
    this.events = [];
  }

  public has(id: string) {
    return this.events.some((event) => event.id === id);
  }

  public count() {
    return this.events.length;
  }

  public read() {
    // Read the events from the events directory
    const events = fs.readdirSync(this.getEventsPath()).filter((file) => {
      return file.endsWith(".json");
    });

    // Read the events from the .ics files
    const eventsData = events.map((event) => {
      const data = fs.readFileSync(`${this.getEventsPath()}/${event}`, "utf-8");

      let eventObject: EventType;
      try {
        eventObject = JSON.parse(data) as EventType;

        if (
          !eventObject.id ||
          !eventObject.name ||
          !eventObject.start ||
          !eventObject.description
        ) {
          throw new Error("Invalid event");
        }

        if (eventObject.disabled) return;

        return {
          ...eventObject,
          start: new Date((JSON.parse(data) as { start: string }).start),
          end: new Date((JSON.parse(data) as { end: string }).end),
        };
      } catch (e) {
        logging.log(
          logging.Severity.ERROR,
          "[utils/events.ts] Error parsing event object:",
          data,
          e
        );
      }
    });

    for (const eventObject of eventsData) {
      if (!eventObject) continue;
      this.add(eventObject);
      console.log(`[utils/events.ts] Added event: `, eventObject);
    }

    return this;
  }

  public getEventsPath() {
    return `${process.cwd()}/events`;
  }

  public find(predicate: (event: EventType) => boolean) {
    return this.events.find(predicate);
  }

  public filter(predicate: (event: EventType) => boolean) {
    return this.events.filter(predicate);
  }

  public map<T>(predicate: (event: EventType) => T) {
    return this.events.map(predicate);
  }

  public some(predicate: (event: EventType) => boolean) {
    return this.events.some(predicate);
  }

  public every(predicate: (event: EventType) => boolean) {
    return this.events.every(predicate);
  }

  public forEach(predicate: (event: EventType) => void) {
    this.events.forEach(predicate);
  }

  public reduce<T>(
    predicate: (acc: T, event: EventType) => T,
    initialValue: T
  ) {
    return this.events.reduce(predicate, initialValue);
  }

  public findIndex(predicate: (event: EventType) => boolean) {
    return this.events.findIndex(predicate);
  }

  public indexOf(event: EventType) {
    return this.events.indexOf(event);
  }

  public lastIndexOf(event: EventType) {
    return this.events.lastIndexOf(event);
  }

  public includes(event: EventType) {
    return this.events.includes(event);
  }

  public toString() {
    return this.events.toString();
  }

  public join(separator?: string) {
    return this.events.join(separator);
  }

  public concat(...items: ConcatArray<EventType>[]) {
    return this.events.concat(...items);
  }

  public slice(start?: number, end?: number) {
    return this.events.slice(start, end);
  }

  public splice(start: number, deleteCount?: number) {
    return this.events.splice(start, deleteCount);
  }

  public sort(compareFn?: (a: EventType, b: EventType) => number) {
    return this.events.sort(compareFn);
  }
}

// Export a global instance of the event store
export const eventStore = new EventStore().read();
