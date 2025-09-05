import { Document } from "./documents";

export interface BaseUser {
  _id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  saved_articles?: Document[]
}