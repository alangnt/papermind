from pymongo import MongoClient
import os
from dotenv import load_dotenv # remove in production
from pathlib import Path # remove in production

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)  # remove in production

uri = os.getenv('MONGODB_URI')
if not uri:
    raise ValueError('MONGODB_URI is not in environment')

client = MongoClient(uri)
db = client.get_default_database("Astra")

def get_collection(name: str):
    return db.get_collection(name)
