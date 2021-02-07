
import { MongoClient } from "https://deno.land/x/mongo@v0.20.0/mod.ts";

const client = new MongoClient();
await client.connect({ servers: [] });

export const db = client.database("lwob");
