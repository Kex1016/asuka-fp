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
    status TEXT NOT NULL, -- "pending", "approve" or "deny"
    type TEXT NOT NULL, -- "name" or "avatar"
    data TEXT NOT NULL, -- if type is "name", this is the name. if type is "avatar", this is the filename
    url TEXT NOT NULL, -- if type is "avatar", this is the url of the image
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

export default databaseConnection;
