import { Client } from "discord.js";
import logging from "../logging.js";

// NOTE: This function is unused for now.
export default async (client: Client) => {
  logging.log(
    logging.Severity.DEBUG,
    "[/checks/maxVotes.ts] Checking max votes"
  );
  return true;
};
