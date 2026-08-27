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

export interface ResetPasswordToken {
  email: string;
}

