import { MongoClient } from "mongodb";
import { localClient } from "@/lib/local-json-db";

const globalWithLocalDb = global as typeof globalThis & {
  _localJsonClient?: ReturnType<typeof localClient>;
};

if (process.env.NODE_ENV === "development" || !globalWithLocalDb._localJsonClient) {
  globalWithLocalDb._localJsonClient = localClient();
}

export default globalWithLocalDb._localJsonClient as unknown as MongoClient;
