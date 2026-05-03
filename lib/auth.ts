import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

if (!process.env.MONGODB_NAME) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_NAME"');
}

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_NAME);

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: process.env.WEBSITE_URL!,
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
