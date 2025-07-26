from pymongo import MongoClient
import os

uri = os.getenv('MONGODB_URI')
if not uri:
    raise ValueError('MONGODB_URI is not in environment')

client = MongoClient(uri)
db = client.get_default_database("Astra")

def get_collection(name: str):
    return db.get_collection(name)
