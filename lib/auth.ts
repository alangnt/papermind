import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

if (!process.env.MONGODB_NAME) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_NAME"');
}

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const db = client.db(process.env.MONGODB_NAME);

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client
  }),
  experimental: {
    joins: true
  },
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: { enabled: true },
  /*
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  */
  plugins: [
    dash()
  ]
});
