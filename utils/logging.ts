import util from "util";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * The severity of a log message.
 */
enum Severity {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Logs a message to the console, with a timestamp and the specified severity.
 * @param severity The severity of the message.
 * @param message The message to log.
 * @param args Any additional arguments to log.
 *
 * @returns The logged message.
 */
function log(severity: Severity, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const formattedMessage = util.format(message, ...args);

  switch (severity) {
    case Severity.DEBUG:
      if (process.env.NODE_ENV === "production") break;
      console.debug(`[${timestamp}] [${severity}] ${formattedMessage}`);
      break;
    case Severity.INFO:
      console.info(`[${timestamp}] [${severity}] ${formattedMessage}`);
      break;
    case Severity.WARN:
      console.warn(`[${timestamp}] [${severity}] ${formattedMessage}`);
      break;
    case Severity.ERROR:
      console.error(`[${timestamp}] [${severity}] ${formattedMessage}`);
      break;
  }

  if (!fs.existsSync(path.join(__dirname, "../logs"))) {
    fs.mkdirSync(path.join(__dirname, "../logs"));
  }

  const logPath = path.join(__dirname, "../logs/latest.log");
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  logStream.write(`[${timestamp}] [${severity}] ${formattedMessage}\n`);
  logStream.end();

  return formattedMessage;
}

/**
 * A logging utility.
 * @see {@link Severity}
 * @see {@link log}
 */
export default { Severity, log };
