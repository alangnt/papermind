import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the MongoClient across hot reloads
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri!);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, create a new MongoClient
    client = new MongoClient(uri!);
    clientPromise = client.connect();
  }

  return clientPromise;
}

/**
 * Get the MongoDB database instance
 * @param dbName Optional database name, defaults to "Astra"
 */
export async function getDatabase(dbName: string = 'Astra'): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

/**
 * Get a specific collection from the database
 * @param collectionName Name of the collection
 * @param dbName Optional database name, defaults to "Astra"
 */
export async function getCollection<TSchema extends Record<string, any> = any>(
  collectionName: string,
  dbName?: string
): Promise<Collection<TSchema>> {
  const db = await getDatabase(dbName);
  return db.collection<TSchema>(collectionName);
}

export default getClientPromise;
