import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';

import { getCollection } from '@/lib/mongodb';
import { parseArxivId } from '@/lib/arxiv-id';

/** A paper placed in a group, stored by reference: the copy lives in `articles`. */
export interface GroupArticle {
  arxiv_id: string;
  added_by: string;
  added_at: Date;
}

export interface GroupInvite {
  token: string;
  expires_at: Date;
  created_by: string;
}

/**
 * A shared folder of papers.
 *
 * Members are usernames rather than ids, matching the rest of the app: JWT
 * `sub` is the username and saved articles are keyed the same way. The owner is
 * always also listed in `members`, so membership checks never special-case them.
 */
export interface Group {
  _id: ObjectId;
  name: string;
  owner: string;
  members: string[];
  articles: GroupArticle[];
  invite: GroupInvite | null;
  created_at: Date;
  updated_at: Date;
}

const COLLECTION = 'groups';

const MAX_NAME_LENGTH = 60;
export const MAX_GROUPS_PER_USER = 50;
export const MAX_ARTICLES_PER_GROUP = 500;

/** Invite links are meant to be passed around, not to live forever. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function groups() {
  return getCollection<Group>(COLLECTION);
}

/** Group ids arrive from URLs, so anything not a valid ObjectId is simply not found. */
export function toGroupId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export function normaliseGroupName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;

  return name;
}

export async function listGroupsForUser(username: string): Promise<Group[]> {
  const collection = await groups();
  return collection.find({ members: username }).sort({ updated_at: -1 }).toArray();
}

export async function countGroupsForUser(username: string): Promise<number> {
  const collection = await groups();
  return collection.countDocuments({ members: username });
}

export async function createGroup(name: string, owner: string): Promise<Group> {
  const collection = await groups();
  const now = new Date();

  const group: Omit<Group, '_id'> = {
    name,
    owner,
    // The owner is a member too, so every read path can just check `members`.
    members: [owner],
    articles: [],
    invite: null,
    created_at: now,
    updated_at: now,
  };

  const result = await collection.insertOne(group as Group);
  return { ...group, _id: result.insertedId };
}

/** Fetch a group only if this user belongs to it. Non-members get null, not a 403. */
export async function getGroupForMember(id: ObjectId, username: string): Promise<Group | null> {
  const collection = await groups();
  return collection.findOne({ _id: id, members: username });
}

export async function renameGroup(id: ObjectId, owner: string, name: string): Promise<boolean> {
  const collection = await groups();
  const result = await collection.updateOne(
    { _id: id, owner },
    { $set: { name, updated_at: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function deleteGroup(id: ObjectId, owner: string): Promise<boolean> {
  const collection = await groups();
  const result = await collection.deleteOne({ _id: id, owner });
  return result.deletedCount > 0;
}

export type ArticleAddResult = 'added' | 'already-present' | 'not-a-member' | 'full' | 'bad-id';

/**
 * Add a paper to a group.
 *
 * The filter carries the membership check, the duplicate check and the size cap,
 * so the whole thing is one atomic update — two people adding at once cannot
 * race past the limit or double-insert.
 */
export async function addArticleToGroup(
  id: ObjectId,
  username: string,
  rawArxivId: string
): Promise<ArticleAddResult> {
  const arxivId = parseArxivId(rawArxivId);
  if (!arxivId) return 'bad-id';

  const collection = await groups();
  const result = await collection.updateOne(
    {
      _id: id,
      members: username,
      'articles.arxiv_id': { $ne: arxivId },
      [`articles.${MAX_ARTICLES_PER_GROUP - 1}`]: { $exists: false },
    },
    {
      $push: { articles: { arxiv_id: arxivId, added_by: username, added_at: new Date() } },
      $set: { updated_at: new Date() },
    }
  );

  if (result.matchedCount > 0) return 'added';

  // Nothing matched, so work out which of the filter's conditions failed.
  const group = await collection.findOne({ _id: id }, { projection: { members: 1, articles: 1 } });

  if (!group?.members.includes(username)) return 'not-a-member';
  if (group.articles.some((article) => article.arxiv_id === arxivId)) return 'already-present';
  return 'full';
}

export async function removeArticleFromGroup(
  id: ObjectId,
  username: string,
  rawArxivId: string
): Promise<boolean> {
  const arxivId = parseArxivId(rawArxivId);
  if (!arxivId) return false;

  const collection = await groups();
  // `articles.arxiv_id` is part of the filter, not just the $pull: the $set of
  // updated_at always counts as a modification, so modifiedCount alone would
  // report success even when the paper was never in the group.
  const result = await collection.updateOne(
    { _id: id, members: username, 'articles.arxiv_id': arxivId },
    { $pull: { articles: { arxiv_id: arxivId } }, $set: { updated_at: new Date() } }
  );

  return result.matchedCount > 0;
}

/**
 * Mint a fresh invite link for a group, replacing any existing one.
 *
 * Rotating on every call is deliberate: it doubles as the way an owner revokes
 * a link that has spread further than intended.
 */
export async function createInvite(id: ObjectId, owner: string): Promise<GroupInvite | null> {
  const invite: GroupInvite = {
    token: randomBytes(32).toString('base64url'),
    expires_at: new Date(Date.now() + INVITE_TTL_MS),
    created_by: owner,
  };

  const collection = await groups();
  const result = await collection.updateOne(
    { _id: id, owner },
    { $set: { invite, updated_at: new Date() } }
  );

  return result.matchedCount > 0 ? invite : null;
}

export async function revokeInvite(id: ObjectId, owner: string): Promise<boolean> {
  const collection = await groups();
  const result = await collection.updateOne(
    { _id: id, owner },
    { $set: { invite: null, updated_at: new Date() } }
  );
  return result.matchedCount > 0;
}

/** The group an unexpired invite token points at, or null. */
export async function findGroupByInviteToken(token: string): Promise<Group | null> {
  if (!token) return null;

  const collection = await groups();
  return collection.findOne({ 'invite.token': token, 'invite.expires_at': { $gt: new Date() } });
}

export type JoinOutcome =
  | { result: 'joined' | 'already-a-member'; groupId: string; name: string }
  | { result: 'invalid-token' };

export async function joinGroupByToken(token: string, username: string): Promise<JoinOutcome> {
  const group = await findGroupByInviteToken(token);
  if (!group) return { result: 'invalid-token' };

  const groupId = group._id.toString();
  if (group.members.includes(username)) {
    return { result: 'already-a-member', groupId, name: group.name };
  }

  const collection = await groups();
  await collection.updateOne(
    { _id: group._id },
    { $addToSet: { members: username }, $set: { updated_at: new Date() } }
  );

  return { result: 'joined', groupId, name: group.name };
}

export type LeaveResult = 'left' | 'owner-must-delete' | 'not-a-member';

/**
 * Remove someone from a group.
 *
 * An owner cannot leave: the group would be left with no one able to manage it,
 * so they are told to delete it (or, later, hand ownership over) instead.
 */
export async function removeMember(
  id: ObjectId,
  actor: string,
  target: string
): Promise<LeaveResult | 'forbidden'> {
  const collection = await groups();
  const group = await collection.findOne({ _id: id, members: actor });

  if (!group) return 'not-a-member';
  // Members may remove themselves; only the owner may remove anyone else.
  if (actor !== target && group.owner !== actor) return 'forbidden';
  if (target === group.owner) return 'owner-must-delete';
  if (!group.members.includes(target)) return 'not-a-member';

  await collection.updateOne(
    { _id: id },
    { $pull: { members: target }, $set: { updated_at: new Date() } }
  );

  return 'left';
}
