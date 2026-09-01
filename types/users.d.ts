import { User } from './models';

/**
 * The user as the client sees it: the subset /api/users/me exposes, derived
 * from the server model rather than restated, so adding a field in one place
 * cannot silently disagree with the other.
 */
export type BaseUser = Pick<
  User,
  'username' | 'email' | 'first_name' | 'last_name' | 'saved_articles'
> & {
  /** Serialised on the way out: the route stringifies the ObjectId. */
  _id: string;
};
