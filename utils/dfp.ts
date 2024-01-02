import { initDiscordFP } from "@discord-fp/djs";
import logging from "./logging.js";
import { PermissionsBitField } from "discord.js";

export const dfp = initDiscordFP();

export const command = dfp.command.middleware(({ event, next }) => {
  logging.log(logging.Severity.DEBUG, `[dfp - ${event.id}] Checking guild`);
  if (!event.guild) {
    return next({
      ctx: {
        message: "no_guild",
      },
      event,
    });
  }

  logging.log(
    logging.Severity.DEBUG,
    `[dfp - ${event.id}] Checking if guild is GCC`
  );
  if (!(event.guild.id === process.env.GUILD_ID)) {
    return next({
      ctx: {
        message: "no_guild",
      },
      event,
    });
  }

  logging.log(logging.Severity.DEBUG, `[dfp - ${event.id}] Checking member`);
  if (!event.member) {
    return next({
      ctx: {
        message: "no_member",
      },
      event,
    });
  }

  return next({
    ctx: {
      message: "success",
    },
    event,
  });
});

export const eventCommand = command.middleware(({ event, next }) => {
  if (!event.member) return;

  // Check permissions
  logging.log(
    logging.Severity.DEBUG,
    `[dfp - eventCommand - ${event.id}] Checking perms`
  );
  if (!event.member.permissions) {
    return next({
      ctx: {
        message: "no_perms",
      },
      event,
    });
  }

  logging.log(
    logging.Severity.DEBUG,
    `[dfp - eventCommand - ${event.id}] Checking ManageEvents perms`
  );
  const perms = event.member.permissions as PermissionsBitField;
  if (!perms.has("ManageEvents")) {
    return next({
      ctx: {
        message: "no_perms",
      },
      event,
    });
  }

  return next({
    ctx: {
      message: "success",
    },
    event,
  });
});
