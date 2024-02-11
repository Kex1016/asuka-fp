import { Client, Message, EmbedBuilder, MessageFlags } from "discord.js";
import got from "got";
import logging from "../logging.js";

let spotifyToken: {
  access_token: string;
  token_type: string;
  expires_in: number;
} | null = null;

async function getSpotifyInfo(type: string, id: string) {
  return await got
    .get(`https://api.spotify.com/v1/${type}s/${id}`, {
      headers: {
        Authorization: `${spotifyToken?.token_type} ${spotifyToken?.access_token}`,
      },
    })
    .json();
}

function getSpotifyEmbed(
  type: string,
  data: any,
  message: Message,
  noTracklist: boolean = false
) {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Spotify",
      iconURL: "https://safe.haiiro.moe/O3YVvaoDRd0s.png",
    })
    .setTitle(data.name)
    .setURL(data.external_urls.spotify)
    .setFooter({
      text: `Sent by ${message.author.username}`,
      iconURL: `${
        message.author.avatarURL() || message.author.defaultAvatarURL
      }`,
    });

  switch (type) {
    case "track": {
      embed.setThumbnail(data.album.images[0].url);
      embed.addFields([
        {
          name: "Artist(s)",
          value: data.artists
            .map(
              (artist: any) =>
                `[${artist.name}](${artist.external_urls.spotify})`
            )
            .join(", "),
          inline: false,
        },
        {
          name: "Album",
          value: `[${data.album.name}](${data.album.external_urls.spotify})`,
          inline: true,
        },
        {
          name: "Release date",
          value: `${data.album.release_date}`,
          inline: true,
        },
      ]);

      break;
    }
    case "album": {
      embed.setThumbnail(data.images[0].url);

      embed.addFields([
        {
          name: "Artist",
          value: data.artists
            .map(
              (artist: any) =>
                `[${artist.name}](${artist.external_urls.spotify})`
            )
            .join(", "),
          inline: true,
        },
        {
          name: "Tracks",
          value: `${data.total_tracks} tracks`,
          inline: true,
        },
        {
          name: "Release date",
          value: `${data.release_date}`,
          inline: true,
        },
      ]);

      let tracklist = data.tracks.items
        .map((track: any) => `[${track.name}](${track.external_urls.spotify})`)
        .join("\n");

      if (tracklist.length > 1024) {
        let length = 0;
        tracklist = tracklist
          .split("\n")
          .filter((track: string) => {
            length += track.length;
            return length < 1000;
          })
          .join("\n");
        tracklist += `\n... and ${
          data.tracks.total - tracklist.split("\n").length
        } more`;
      }

      if (!noTracklist) {
        embed.addFields({
          name: "Tracklist",
          value: tracklist,
          inline: false,
        });
      }

      break;
    }
    case "playlist": {
      embed.setThumbnail(data.images[0].url);
      embed.addFields([
        {
          name: "Owner",
          value: `[${
            data.owner.display_name || data.owner.id || "Unknown"
          }](https://open.spotify.com/user/${data.owner.id})`,
          inline: true,
        },
        {
          name: "Tracks",
          value: `${data.tracks.total} tracks`,
          inline: true,
        },
      ]);

      let tracklist = data.tracks.items
        .map(
          (track: any) =>
            `[${track.track.name}](${track.track.external_urls.spotify})`
        )
        .join("\n");

      if (tracklist.length > 1024) {
        let length = 0;
        tracklist = tracklist
          .split("\n")
          .filter((track: string) => {
            length += track.length;
            return length < 1000;
          })
          .join("\n");
        tracklist += `\n... and ${
          data.tracks.total - tracklist.split("\n").length
        } more`;
      }

      if (!noTracklist) {
        embed.addFields({
          name: "Tracklist",
          value: tracklist,
          inline: false,
        });
      }

      break;
    }
    case "artist": {
      embed.setThumbnail(data.images[0].url);
      embed.addFields([
        {
          name: "Followers",
          value: `${data.followers.total}`,
          inline: false,
        },
        {
          name: "Genres",
          value: data.genres.join(", "),
          inline: false,
        },
      ]);

      break;
    }
  }

  return embed;
}

export default async (message: Message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  logging.log(
    logging.Severity.DEBUG,
    "[/checks/spotifyLinks.ts] Checking for Spotify links"
  );

  // Check for Spotify links in messages (track, album, playlist, artist)
  const spotifyRegex =
    /https:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/gi;
  const spotifyLinks = message.content.match(spotifyRegex);

  if (!spotifyLinks) return;

  logging.log(
    logging.Severity.DEBUG,
    `[/checks/spotifyLinks.ts] Found ${spotifyLinks.length} Spotify links`
  );

  // Go through each link and get its info
  let embeds: EmbedBuilder[] = [];

  // If there's more than one link, disable the tracklist
  let disableTracklist = spotifyLinks.length > 1;

  // If there are more than 10 links, only get the first 9, and add an embed saying there are more
  let newLinks: string[] = [];
  let moreLinks = false;
  if (spotifyLinks.length > 10) {
    logging.log(
      logging.Severity.DEBUG,
      `[/checks/spotifyLinks.ts] More than 10 links, only getting first 9`
    );

    const firstNine = spotifyLinks.slice(0, 9);
    const remainingLinks = spotifyLinks.slice(9);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Spotify",
        iconURL: "https://safe.haiiro.moe/O3YVvaoDRd0s.png",
      })
      .setDescription(
        `There are ${remainingLinks.length} more links in this message, but I can only show 9.` +
          "\n" +
          "Here are the rest: " +
          remainingLinks.join("\n")
      )
      .setTitle("More links")
      .setFooter({
        text: `Sent by ${message.author.username}`,
        iconURL: `${
          message.author.avatarURL() || message.author.defaultAvatarURL
        }`,
      });

    embeds.push(embed);

    newLinks = firstNine;
    moreLinks = true;
  } else {
    newLinks = spotifyLinks;
  }

  let content = message.content;
  for (const link of newLinks) {
    const type = link.split("/")[3];
    const id = link.split("/")[4];

    // Get a token if we don't have one
    if (!spotifyToken || spotifyToken.expires_in < Date.now().valueOf()) {
      logging.log(
        logging.Severity.DEBUG,
        `[/checks/spotifyLinks.ts] Getting new Spotify token`
      );

      const spotifyDetails =
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET;

      const data = (await got
        .post("https://accounts.spotify.com/api/token", {
          headers: {
            Authorization:
              "Basic " + Buffer.from(spotifyDetails).toString("base64"),
          },
          form: {
            grant_type: "client_credentials",
          },
        })
        .json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      spotifyToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: Date.now().valueOf() + data.expires_in * 1000,
      };
    }

    // Get the info
    logging.log(
      logging.Severity.DEBUG,
      `[/checks/spotifyLinks.ts] Getting info for ${type} ${id}`
    );

    let embed: EmbedBuilder;
    try {
      const data = await getSpotifyInfo(type, id);
      embed = getSpotifyEmbed(type, data, message, disableTracklist);
    } catch (err) {
      logging.log(
        logging.Severity.WARN,
        `[/checks/spotifyLinks.ts] Failed to get info for ${type} ${id}`
      );

      embed = new EmbedBuilder()
        .setAuthor({
          name: "Spotify",
          iconURL: "https://safe.haiiro.moe/O3YVvaoDRd0s.png",
        })
        .setTitle("Error")
        .setDescription("Failed to get info for this link: " + link)
        .setFooter({
          text: `Sent by ${message.author.username}`,
          iconURL: `${
            message.author.avatarURL() || message.author.defaultAvatarURL
          }`,
        });
    }

    embeds.push(embed);
    content = content.replace(link, "");

    // Force a 100ms delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(embeds);

  // Get rid of the remaining ?si= in the content
  content = content
    .replace(/(\?|&)si=[a-zA-Z0-9-_]+/gi, "")
    .replace(/(\?|&)dl=./gi, "")
    .replace(/(\?|&)pt=[a-zA-Z0-9-_]+/gi, "");

  // Get rid of any newlines
  content = content.replace(/\n/g, "");

  // Trim the content
  content = content.trim();
  content = `<@${message.author.id}> said:\n${content}`;

  // If there are more links, put the first embed at the end
  if (moreLinks) {
    const remainingLinks = spotifyLinks.slice(9);

    remainingLinks.forEach((link) => {
      content = content.replace(link, "");
    });

    let firstEmbed = embeds.shift();
    if (!firstEmbed) {
      logging.log(
        logging.Severity.WARN,
        `[/checks/spotifyLinks.ts] Failed to get first embed`
      );

      firstEmbed = new EmbedBuilder()
        .setAuthor({
          name: "Spotify",
          iconURL: "https://safe.haiiro.moe/O3YVvaoDRd0s.png",
        })
        .setTitle("Error")
        .setDescription(
          "Failed to get the first embed. This is a bug, please report it."
        )
        .setFooter({
          text: `Sent by ${message.author.username}`,
          iconURL: `${
            message.author.avatarURL() || message.author.defaultAvatarURL
          }`,
        });
    }
    firstEmbed.addFields({
      name: "Note",
      value: `> I had to disable the tracklist for the embeds to fit the character/embed limits of Discord.`,
      inline: false,
    });
    embeds.push(firstEmbed);
  }

  // Send the embed
  logging.log(
    logging.Severity.DEBUG,
    `[/checks/spotifyLinks.ts] Sending embeds`
  );

  // Check if the original message is a reply to something
  let reference: Message = message;
  let hasReference = false;
  if (message.reference) {
    const id = message.reference.messageId;
    if (id) {
      const referenceMessage = await message.channel.messages.fetch(id);
      if (referenceMessage) {
        reference = referenceMessage;
        hasReference = true;
      }
    }
  }

  let responseMessage: Message;
  if (hasReference) {
    responseMessage = await reference.reply({
      content: "myon",
      allowedMentions: {
        repliedUser: false,
      },
    });
  } else {
    responseMessage = await message.channel.send({
      content: "myon",
    });
  }

  // Edit the message
  logging.log(
    logging.Severity.DEBUG,
    `[/checks/spotifyLinks.ts] Editing message`
  );

  await responseMessage.edit({
    embeds,
    content,
  });

  // Delete the message
  logging.log(
    logging.Severity.DEBUG,
    `[/checks/spotifyLinks.ts] Deleting message`
  );

  try {
    await message.delete();
  } catch (err) {
    logging.log(
      logging.Severity.WARN,
      `[/checks/spotifyLinks.ts] Failed to delete message`
    );
  }
};
