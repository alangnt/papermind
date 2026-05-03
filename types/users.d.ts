import { Document } from "./documents";

export interface BaseUser {
  _id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  savedArticles?: Document[]
}