import { MongoClient } from "mongodb";

const mongoGlobal = globalThis as typeof globalThis & {
  phishOutMongo?: MongoClient;
};

export function getDatabase() {
  const client = (mongoGlobal.phishOutMongo ??= new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
    { serverSelectionTimeoutMS: 3_000 },
  ));

  return client.db(process.env.MONGODB_DB || "phish_out");
}
