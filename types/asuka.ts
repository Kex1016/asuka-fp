import { Client, ClientEvents } from "discord.js";

export type AsukaEvent = {
  name: string;
  type: keyof ClientEvents;
  once?: boolean;
  handler: (...args: any[]) => void;
};

export type AsukaCheck = {
  name: string;
  interval: number;
  handler: (client: Client) => void;
};
