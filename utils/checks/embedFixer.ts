import { Message, MessageFlags } from "discord.js";
import logging from "../logging.js";
export default async (message: Message) => {
  logging.log(
    logging.Severity.DEBUG,
    "[/checks/embedFixer.ts] Running embedFixer"
  );

  const regex =
    /https?:\/\/(www\.)?(x\.com|twitter\.com|reddit\.com|tiktok\.com|instagram\.com)\/(.+)/gi;

  const urlLookup = {
    "x.com": "fxtwitter.com",
    "twitter.com": "fxtwitter.com",
    "reddit.com": "rxddit.com",
    "tiktok.com": "txktok.com",
    "instagram.com": "ddinstagram.com",
  };

  const content = message.content;
  if (!regex.test(content)) return;

  const lines = content.split("\n");
  const newLinks: string[] = [];

  for (const line of lines) {
    const matches =
      /https?:\/\/(www\.)?(x\.com|twitter\.com|reddit\.com|tiktok\.com|instagram\.com)\/(.+)/gi.exec(
        line
      );
    if (matches) {
      const [full, sub, domain, path] = matches;
      const newLink = full.replace(domain, urlLookup[domain]);
      newLinks.push(newLink);
    }
  }

  logging.log(
    logging.Severity.DEBUG,
    `[/checks/embedFixer.ts] Found ${newLinks.length} links to fix`
  );

  if (newLinks.length > 0) {
    logging.log(
      logging.Severity.DEBUG,
      "[/checks/embedFixer.ts] Suppressing embeds"
    );
    message.suppressEmbeds(true);

    logging.log(
      logging.Severity.DEBUG,
      "[/checks/embedFixer.ts] Replying with fixed links"
    );
    message.reply({
      content: newLinks.join("\n"),
      options: {
        allowedMentions: { repliedUser: false },
      },
    });
  }
};
