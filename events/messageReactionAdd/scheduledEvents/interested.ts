import { AsukaEvent } from "@/types/asuka.js";
import { MessageReaction, User } from "discord.js";

export default {
  name: "scheduledEventsInterested",
  type: "messageReactionAdd",
  async handler(reaction: MessageReaction, user: User) {
    console.log("asd");
  },
} as AsukaEvent;
