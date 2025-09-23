import mongoose, { Mongoose } from "mongoose";

const uri: string = process.env.MONGODB_URI ?? "";
if (!uri) {
  throw new Error("❌ Missing MONGODB_URI in .env.local");
}

type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose._mongoose || {
  conn: null,
  promise: null,
};

export async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { dbName: "jaimetro" });
  }

  cached.conn = await cached.promise;
  globalWithMongoose._mongoose = cached;

  return cached.conn;
}
