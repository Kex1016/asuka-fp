import { AutocompleteInteraction, CacheType } from "discord.js";

export default async (
  event: AutocompleteInteraction<CacheType>
) => {
  if (event.commandName !== "exchange") return;
  // NOTE: This function is irrelevant. I left it here out of laziness. Will delete.
}
