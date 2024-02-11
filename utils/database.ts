/**
 * Database connection
 */
import logging from "@/utils/logging.js";
import sqlite from "sqlite3";

/**
 * Database connection
 * @class DatabaseConnection
 * @classdesc Used to manage a database connection and query the database
 */
export class DatabaseConnection {
  private db: sqlite.Database | null = null;

  constructor() {
    this.connect();
  }

  /**
   * Connects to the database
   * @returns {void}
   * @throws {Error} - Throws an error if the database is already connected
   */
  public connect(): void {
    logging.log(logging.Severity.DEBUG, "[Database] Connect");
    logging.log(logging.Severity.INFO, "Connecting to database...");

    this.db = new sqlite.Database(`${process.env.DATABASE_LOCATION}`, (err) => {
      if (err) {
        logging.log(
          logging.Severity.ERROR,
          "Failed to connect to database",
          err
        );
        return;
      }

      logging.log(logging.Severity.INFO, "Connected to database");
    });
  }

  /**
   * Disconnects from the database
   * @param {boolean} [destroy = false] - Whether to destroy the database connection (default: false)
   * @returns {void}
   * @throws {Error} - Throws an error if the database is not connected
   */
  public disconnect(destroy: boolean = false): void {
    logging.log(logging.Severity.DEBUG, "[Database] Disconnect");
    logging.log(logging.Severity.INFO, "Disconnecting from database...");

    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logging.log(
            logging.Severity.ERROR,
            "Failed to disconnect from database",
            err
          );
          return;
        }

        logging.log(logging.Severity.INFO, "Disconnected from database");
      });
    }

    if (destroy) {
      this.db = null;
    }
  }

  /**
   * Gets the database
   * @returns {Database} - The database
   * @throws {Error} - Throws an error if the database is not connected
   */
  public getDatabase(): sqlite.Database {
    logging.log(logging.Severity.DEBUG, "[Database] Get database");
    if (!this.db) {
      throw new Error("Database is not connected");
    }
    return this.db;
  }

  /**
   * Checks if the database is connected
   * @returns {boolean} - True if the database is connected, false if not
   */
  public isConnected(): boolean {
    logging.log(
      logging.Severity.DEBUG,
      `[Database] Is connected: ${this.db !== null}`
    );
    return this.db !== null;
  }
}

/**
 * Database connection
 * @type {DatabaseConnection}
 * @see {@link DatabaseConnection}
 */
const databaseConnection: DatabaseConnection = new DatabaseConnection();
const db = databaseConnection.getDatabase();

// Make the Vote, Server, User, Club and Submission tables if they don't exist
logging.log(logging.Severity.INFO, "Creating tables if they don't exist...");

logging.log(logging.Severity.DEBUG, "[Database] Creating User table");
db.all(
  `CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discordId TEXT NOT NULL UNIQUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`
);

logging.log(logging.Severity.DEBUG, "[Database] Creating Submission table");
db.all(
  `CREATE TABLE IF NOT EXISTS Submission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL, -- "pending", "approve", "deny" or "implemented"
    data TEXT NOT NULL, -- if type is "name", this is the name. if type is "avatar", this is the filename
    url TEXT NOT NULL, -- if type is "avatar", this is the url of the image
    serverName TEXT NOT NULL,
    messageId TEXT DEFAULT NULL,
    ownerId TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES User (id)
  );`
);

logging.log(logging.Severity.DEBUG, "[Database] Creating Vote table");
db.all(
  `CREATE TABLE IF NOT EXISTS Vote (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    submissionId INTEGER NOT NULL,
    voteValue INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submissionId) REFERENCES Submission (id)
  );`
);

// Poll DBs:
// - db for storing polls
//   - id                         // id of poll
//   - title                      // title of the poll
//   - description                // description of the poll
//   - start                      // start date
//   - end                        // end date
//   - custom                     // whether custom answers are allowed (0 or 1)
//   - channel                    // id of the channel the poll is in
//   - message                    // id of the message the poll is in
//   - enabled                    // whether the poll is enabled (0 or 1) (ended polls are disabled)
// - db for storing poll options
//   - id                         // id of option
//   - pollId                     // id of poll the option is in
//   - name                       // name of the option

logging.log(logging.Severity.DEBUG, "[Database] Creating Poll table");
db.all(`CREATE TABLE IF NOT EXISTS Poll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end DATETIME NOT NULL,
    channel TEXT,
    message TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
  );`
);

logging.log(logging.Severity.DEBUG, "[Database] Creating PollOption table");
db.all(`CREATE TABLE IF NOT EXISTS PollOption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pollId INTEGER NOT NULL,
    name TEXT NOT NULL,
    indexNum INTEGER NOT NULL,
    FOREIGN KEY (pollId) REFERENCES Poll (id)
  );`
);

// Exchange DBs:
// - db for storing exchanges
//   - id                         // id of exch
//   - theme                      // THIS IS AN ANILIST TAG(S) RESTRICTION! MAKE IT HAVE AN AUTOCOMPLETE FOR THOSE. (tags, separated by ',')
//   - description                // description of the exch, announce msg and info cmd uses this
//   - start                      // start date
//   - end                        // end date
//   - reg interval maybe?        // tbd
// - db for storing exchange members
//   - id                         // id of user
//   - userId                     // discord id of user
//   - exchangeId                 // id of the exchange the user is part of
//   - pair                       // discord id of user's pair
//   - suggestions                // AL media ids, separated by ; if there are more (validated to theme)
//   - preferences                // Preferences for the user, can be any text.
// - db for storing tags/genres
//   - id                         // id of tag
//   - name                       // name of tag
//
// TODO: PINNED MESSAGE IN DISCORD, MAKE DBS, SCRAPE AL API FOR TAGS & GENRES, MAKE THE COMMANDS, MAKE THE LOGIC FOR PAIRS AND SHIT

logging.log(logging.Severity.DEBUG, "[Database] Creating Exchange table")
db.all(`CREATE TABLE IF NOT EXISTS Exchange (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    theme TEXT,
    description TEXT NOT NULL,
    start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end DATETIME NOT NULL,
    registerAccepted INTEGER NOT NULL
  );`
);

logging.log(logging.Severity.DEBUG, "[Database] Creating ExchangeUser table")
db.all(`CREATE TABLE IF NOT EXISTS ExchangeUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    exchangeId INTEGER NOT NULL,
    pair TEXT,
    suggestions TEXT,
    preferences TEXT,
    FOREIGN KEY (exchangeId) REFERENCES Exchange (id)
  );`
);

export default databaseConnection;