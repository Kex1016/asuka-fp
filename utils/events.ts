import fs from "fs";
import ical from "node-ical";

// Event store for the app
type Event = {
  id: string;
  name: string;
  date: string;
  description: string;
  repeat: boolean;
  repeat_interval: number;
  image?: string;
  channel?: string;
};

export class EventStore {
  private events: Event[] = [];

  public constructor(events: Event[] = []) {
    this.events = events;
  }

  public add(event: Event) {
    this.events.push(event);
  }

  public remove(id: string) {
    this.events = this.events.filter((event) => event.id !== id);
  }

  public get(id: string) {
    return this.events.find((event) => event.id === id);
  }

  public set(id: string, event: Event) {
    const index = this.events.findIndex((event) => event.id === id);
    this.events[index] = event;
  }

  public getAll() {
    return this.events;
  }

  public edit(id: string, event: Event) {
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

  // TODO: Just switch this from ical to my own parser... This shit ain't working. [HIGH PRIO]
  public read() {
    // Read the events from the events directory
    const events = fs.readdirSync(this.getEventsPath());

    // Read the events from the .ics files
    const eventsData = events.map((event) => {
      const data = fs.readFileSync(`${this.getEventsPath()}/${event}`, "utf-8");
      console.log(data);

      let parsed = {};

      // Get CHANNEL and IMAGE from the data
      const channel = data.match(/DISCORD-CHANNEL:(.*)/);
      const image = data.match(/DISCORD-IMAGE:(.*)/);
      const repeat = data.match(/DISCORD-REPEAT=(.*)/);
      const repeat_interval = data.match(/DISCORD-REPEAT_INT=(.*)/);

      // If CHANNEL and IMAGE are found, add them to the parsed object
      if (channel) {
        parsed = { ...parsed, channel: channel[1] };
      }

      if (image) {
        parsed = { ...parsed, image: image[1] };
      }

      if (repeat) {
        parsed = { ...parsed, repeat: true };
      }

      if (repeat_interval) {
        parsed = { ...parsed, repeat_interval: repeat_interval[1] };
      }

      parsed = {
        ...parsed,
        ...ical.parseICS(data),
      };

      return parsed;
    });

    // Extend CalendarResponse with channel and image
    type CalendarResponse = ical.CalendarResponse & {
      channel?: string;
      image?: string;
      repeat: boolean;
      repeat_interval: number;
    };

    // Set the type of the eventsData
    const eventsDataTyped = eventsData as CalendarResponse[];

    // Add the events to the store
    eventsDataTyped.forEach((event) => {
      if (!event.summary || !event.start || !event.uid || !event.description) {
        return;
      }

      this.add({
        id: event.uid.params.toString(),
        name: event.summary.params.toString(),
        date: event.start.params.toString(),
        channel: event.channel,
        description: event.description.params.toString(),
        image: event.image,
        repeat: event.repeat,
        repeat_interval: event.repeat_interval,
      });

      console.log("added:", event);
    });

    return this;
  }

  public getEventsPath() {
    return `${process.cwd()}/events`;
  }

  public find(predicate: (event: Event) => boolean) {
    return this.events.find(predicate);
  }

  public filter(predicate: (event: Event) => boolean) {
    return this.events.filter(predicate);
  }

  public map<T>(predicate: (event: Event) => T) {
    return this.events.map(predicate);
  }

  public some(predicate: (event: Event) => boolean) {
    return this.events.some(predicate);
  }

  public every(predicate: (event: Event) => boolean) {
    return this.events.every(predicate);
  }

  public forEach(predicate: (event: Event) => void) {
    this.events.forEach(predicate);
  }

  public reduce<T>(predicate: (acc: T, event: Event) => T, initialValue: T) {
    return this.events.reduce(predicate, initialValue);
  }

  public findIndex(predicate: (event: Event) => boolean) {
    return this.events.findIndex(predicate);
  }

  public indexOf(event: Event) {
    return this.events.indexOf(event);
  }

  public lastIndexOf(event: Event) {
    return this.events.lastIndexOf(event);
  }

  public includes(event: Event) {
    return this.events.includes(event);
  }

  public toString() {
    return this.events.toString();
  }

  public join(separator?: string) {
    return this.events.join(separator);
  }

  public concat(...items: ConcatArray<Event>[]) {
    return this.events.concat(...items);
  }

  public slice(start?: number, end?: number) {
    return this.events.slice(start, end);
  }

  public splice(start: number, deleteCount?: number) {
    return this.events.splice(start, deleteCount);
  }

  public sort(compareFn?: (a: Event, b: Event) => number) {
    return this.events.sort(compareFn);
  }
}

// Export a global instance of the event store
export const eventStore = new EventStore().read();
