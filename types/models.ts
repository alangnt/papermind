import { ObjectId } from 'mongodb';

// Document models
export interface Document {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated?: string;
  pdfLink?: string;
  comment?: string;
  doi?: string;
  category?: string;
}

export interface Query {
  query: string;
  page?: number;
}

// User models
export interface User {
  _id: string | ObjectId;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: Date;
  updated_at: Date;
  disabled?: boolean;
  saved_articles?: Document[];
  tokenVersion?: number;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  emailVerified?: boolean;
}

export interface UserInDB extends User {
  password: string;
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  emailVerified: boolean;
}

// Auth models
export interface Token {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

export interface TokenData {
  username?: string;
}

export interface BaseSignUp {
  username: string;
  email: string;
  password: string;
}

export interface EditPassword {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface EditProfile {
  username: string;
  first_name: string;
  last_name: string;
}

export interface ResetToken {
  token: string;
  email: string;
  expiration_date: Date;
}

export interface ResetPasswordToken {
  email: string;
}

export interface ResetPassword {
  email: string;
  password: string;
  confirm_password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// User service models
export interface SaveArticle {
  username: string;
  article: Document;
}

export interface DeleteSavedArticle {
  username: string;
  article_id: string;
}
