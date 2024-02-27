import { AsukaEvent } from "@/types/asuka.js";
import { ExchangeType, ExchangeUserType } from "@/types/exchange.js";
import databaseConnection from "@/utils/database.js";
import logging from "@/utils/logging.js";
import { ChannelType, EmbedBuilder, Message } from "discord.js";

const db = databaseConnection.getDatabase();

export default {
  name: "exchangeSubmission",
  type: "messageCreate",
  handler: async (message: Message<boolean>) => {
    // Ensure it only works in the bot's DMs
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.DM) return;
    if (!message.content) return;

    const lines = message.content.split("\n");
    if (lines.length < 2) return;
    if (!lines[0].startsWith("exchange")) return;
    // Get the exchange number by removing any non-numeric characters
    const exchangeNumber = Number.parseInt(lines[0].replace(/\D/g, ""));
    if (isNaN(exchangeNumber)) return;
    // Test for the anilist links
    let animes = lines
      .slice(1)
      .filter((line) => line.includes("anilist.co"))
      .map((anime) => anime.split("/").slice(0, 5).join("/"));
    if (!animes) return;
    // Anything beyond the anilist links is notes
    const notes = lines.slice(1 + animes.length, lines.length).join("\n");

    // Get the exchange
    const exchange = (await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM Exchange WHERE id = ?",
        [exchangeNumber],
        (err, row) => {
          if (err) reject(err);

          const _r = row as ExchangeType;

          if (!_r) {
            resolve(undefined);
            return;
          }

          const exchange: ExchangeType = {
            id: _r.id,
            name: _r.name,
            theme: _r.theme,
            description: _r.description,
            start: Date.parse((row as { start: string }).start),
            end: Date.parse((row as { end: string }).end),
            registerAccepted: _r.registerAccepted,
          };

          resolve(exchange);
        }
      );
    })) as ExchangeType | undefined;

    if (!exchange) {
      message.reply("**ERROR:**\n> Exchange not found. Follow the template!");
      return;
    }

    // Get the user in the exchange
    const exchangeUser = (await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM ExchangeUser WHERE userId = ? AND exchangeId = ?",
        [message.author.id, exchangeNumber],
        (err, row) => {
          if (err) reject(err);

          const _r = row as ExchangeUserType;

          const exchangeUser: ExchangeUserType = {
            id: _r.id,
            userId: _r.userId,
            exchangeId: _r.exchangeId,
            pair: _r.pair,
            suggestions: _r.suggestions,
            preferences: _r.preferences,
          };

          resolve(exchangeUser);
        }
      );
    })) as ExchangeUserType;

    if (!exchangeUser) {
      message.reply("**ERROR:**\n> You are not part of this exchange.");
      return;
    }

    if (!exchangeUser.pair) {
      message.reply(
        "**ERROR:**\n> You don't have a pair yet. You can't submit your suggestions."
      );
      return;
    }

    let existingSuggestions: number[] = [];

    if (exchangeUser.suggestions) {
      existingSuggestions = exchangeUser.suggestions.split(";").map(Number);
    }

    if (existingSuggestions.length >= 3) {
      message.reply(
        "**ERROR:**\n> You already submitted three suggestions. You can't submit more."
      );
      return;
    }

    if (animes.length + existingSuggestions.length > 3) {
      message.reply(
        "**ERROR:**\n> You can't submit more than three suggestions in total."
      );
      return;
    }

    let adding = existingSuggestions.length > 0;

    // Validate the suggestions
    const ids: number[] = [];
    for (const anime of animes) {
      const animeId = Number.parseInt(anime.split("/").pop() || "");
      if (isNaN(animeId)) {
        message.reply("**ERROR:**\n> Invalid anime link:\n> " + `<${anime}>`);
        return;
      }

      ids.push(animeId);
    }

    // Test for duplicates
    if (existingSuggestions.some((id) => ids.includes(id))) {
      message.reply(
        "**ERROR:**\n> You can't submit the same anime twice. Check your suggestions."
      );
      return;
    }

    // Add the existing suggestions to the new ones
    ids.push(...existingSuggestions);

    // Get the anime info by making just one request
    const query = `query ($ids: [Int]) {
      Page {
        media(id_in: $ids) {
          id
          title {
            romaji
            english
          }
          description(asHtml:false)
          genres
          startDate {year, month, day}
          endDate {year, month, day}
          status
          siteUrl
        }
      }
    }`;
    const variables = {
      ids,
    };

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();
    const animesData = data.data.Page.media;

    // Check if the animes are valid
    if (animesData.length !== ids.length) {
      message.reply("**ERROR:**\n> Some of the anime links are invalid.");
      return;
    }

    // Check if the animes are finished
    const unfinishedAnimes = animesData.filter(
      (anime: any) => anime.status !== "FINISHED"
    );
    if (unfinishedAnimes.length > 0) {
      message.reply(
        `**ERROR:**\n> The following anime are not finished:\n> ${unfinishedAnimes
          .map((anime: any) => `<${anime.siteUrl}>`)
          .join(", ")}`
      );
      return;
    }

    // Check if the animes are within the theme
    if (exchange.theme) {
      const theme = exchange.theme.toUpperCase();

      const invalidAnimes = animesData.filter(
        (anime: any) =>
          !anime.genres
            .map((genre: string) => genre.toUpperCase())
            .includes(theme)
      );
      if (invalidAnimes.length > 0) {
        message.reply(
          `**ERROR:**\n> The following anime are not within the theme:\n${invalidAnimes.map(
            (anime: any) => `\n> <${anime.siteUrl}>`
          )}`
        );
        return;
      }
    }

    // Send the suggestions to the pair
    const pair = await message.client.users.fetch(exchangeUser.pair);
    if (!pair) {
      logging.log(
        logging.Severity.ERROR,
        `[ExchangeSubmission] Pair not found for exchange ${exchange.id} and user ${exchangeUser.id}`
      );
      return;
    }

    try {
      const suggestionsEmbed = new EmbedBuilder()
        .setAuthor({
          name: "New suggestions!",
          iconURL: message.author.avatarURL() || "",
        })
        .setTitle(exchange.name)
        .setDescription(
          adding
            ? `The user ${message.author.username}#${message.author.discriminator} has added more suggestions.`
            : `The user ${message.author.username}#${message.author.discriminator} has submitted their suggestions.`
        )
        .setFooter({
          text: "Suggestions",
        })
        .setColor("Random");

      suggestionsEmbed.addFields(
        animesData.map((anime: any) => {
          return {
            name: anime.title.english || anime.title.romaji,
            value: `[AniList](${anime.siteUrl})`,
            inline: false,
          };
        })
      );

      if (notes) {
        suggestionsEmbed.addFields({
          name: "Notes",
          value: notes,
          inline: false,
        });
      }

      await pair.send({
        embeds: [suggestionsEmbed],
      });
    } catch (e) {
      logging.log(
        logging.Severity.ERROR,
        `[ExchangeSubmission] Error sending suggestions for exchange ${exchange.id} and user ${exchangeUser.id}:`,
        e
      );
      message.reply("**ERROR:**\n> Something went wrong.");
      return;
    }

    // Save the suggestions
    const suggestions = existingSuggestions.concat(ids).join(";");
    db.run(
      "UPDATE ExchangeUser SET suggestions = ? WHERE id = ?",
      [suggestions, exchangeUser.id],
      (err) => {
        if (err) {
          logging.log(
            logging.Severity.ERROR,
            `[ExchangeSubmission] Error saving suggestions for exchange ${exchange.id} and user ${exchangeUser.id}:`,
            err
          );
          message.reply("**ERROR:**\n> Something went wrong.");
          return;
        }

        try {
          message.reply(
            `**SUCCESS:**\n> Suggestions saved and sent to your pair.\n${ids
              .map((id) => `> <https://anilist.co/anime/${id}>`)
              .join("\n")}`
          );
        } catch (e) {
          console.log(e);
        }
      }
    );
  },
} as AsukaEvent;
