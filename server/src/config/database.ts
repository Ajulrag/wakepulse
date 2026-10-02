import { MongoClient, Db } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME;

if (!mongoUri) {
  throw new Error("MONGODB_URI is not defined");
}

if (!databaseName) {
  throw new Error("MONGODB_DB_NAME is not defined");
}

const client = new MongoClient(mongoUri);

let database: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  await client.connect();

  database = client.db(databaseName);

  console.log(`MongoDB connected: ${databaseName}`);

  return database;
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error(
      "Database is not connected. Call connectDatabase() first.",
    );
  }

  return database;
}

export async function closeDatabase(): Promise<void> {
  if (!database) {
    return;
  }

  await client.close();

  database = null;

  console.log("MongoDB connection closed");
}