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

export type DeleteResult = 'deleted' | 'has-members' | 'not-owner' | 'not-found';

/**
 * Delete a group — only ever possible while the owner is its last member.
 *
 * Once other people have joined, the group is theirs too, so an owner who wants
 * out hands it over and leaves rather than taking everyone's papers with them.
 * The $size guard is in the filter, so a member joining concurrently cannot be
 * deleted out from under.
 */
export async function deleteGroup(id: ObjectId, owner: string): Promise<DeleteResult> {
  const collection = await groups();
  const result = await collection.deleteOne({ _id: id, owner, members: { $size: 1 } });
  if (result.deletedCount > 0) return 'deleted';

  const group = await collection.findOne({ _id: id }, { projection: { owner: 1, members: 1 } });

  // A non-member must not be able to tell this group apart from one that does
  // not exist, so that check comes first, as everywhere else.
  if (!group || !group.members.includes(owner)) return 'not-found';
  if (group.owner !== owner) return 'not-owner';
  return 'has-members';
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

export type ArticleRemoveResult = 'removed' | 'forbidden' | 'not-found';

/**
 * Take a paper back out of a group.
 *
 * You may remove a paper you added; the owner may remove any of them. The rule
 * lives in the filter's $or, so the check and the write are one operation and
 * ownership cannot change underneath it.
 */
export async function removeArticleFromGroup(
  id: ObjectId,
  username: string,
  rawArxivId: string
): Promise<ArticleRemoveResult> {
  const arxivId = parseArxivId(rawArxivId);
  if (!arxivId) return 'not-found';

  const collection = await groups();
  const result = await collection.updateOne(
    {
      _id: id,
      members: username,
      $or: [
        { owner: username, 'articles.arxiv_id': arxivId },
        { articles: { $elemMatch: { arxiv_id: arxivId, added_by: username } } },
      ],
    },
    { $pull: { articles: { arxiv_id: arxivId } }, $set: { updated_at: new Date() } }
  );

  if (result.matchedCount > 0) return 'removed';

  // Nothing matched: separate "you may not" from "there is nothing there".
  const group = await collection.findOne(
    { _id: id },
    { projection: { owner: 1, members: 1, articles: 1 } }
  );

  if (!group || !group.members.includes(username)) return 'not-found';
  if (!group.articles.some((article) => article.arxiv_id === arxivId)) return 'not-found';
  return 'forbidden';
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
 * An owner cannot leave: the group would be left with no one able to manage it.
 * They hand ownership to another member first, then leave like anyone else.
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

export type TransferResult =
  'transferred' | 'not-owner' | 'not-a-member' | 'already-owner' | 'not-found';

/**
 * Hand a group to another of its members.
 *
 * The whole check lives in the filter, so the group cannot change owner or lose
 * the target member between validating and writing. The previous owner stays on
 * as an ordinary member, free to leave afterwards.
 */
export async function transferOwnership(
  id: ObjectId,
  currentOwner: string,
  target: string
): Promise<TransferResult> {
  const collection = await groups();
  const group = await collection.findOne({ _id: id }, { projection: { owner: 1, members: 1 } });

  // Order matters. A non-member must not be able to tell a group apart from one
  // that does not exist, so that check comes before anything about ownership.
  if (!group || !group.members.includes(currentOwner)) return 'not-found';
  if (group.owner !== currentOwner) return 'not-owner';
  if (target === currentOwner) return 'already-owner';
  if (!group.members.includes(target)) return 'not-a-member';

  // The conditions are repeated in the filter so a concurrent change between
  // the read above and this write cannot slip past them.
  const result = await collection.updateOne(
    { _id: id, owner: currentOwner, members: target },
    { $set: { owner: target, updated_at: new Date() } }
  );

  return result.matchedCount > 0 ? 'transferred' : 'not-found';
}

export interface DetachSummary {
  left: number;
  handedOver: number;
  deleted: number;
}

/**
 * Take a departing account out of every group it belongs to.
 *
 * Owned groups pass to the longest-standing other member rather than being
 * destroyed — the same principle as the delete rule, which refuses while other
 * people are still in the group. Only a group where the leaver is the last
 * member is deleted outright.
 *
 * `members` is appended to, so its order is join order and the first other
 * member is the one who has been there longest.
 */
export async function detachUserFromAllGroups(username: string): Promise<DetachSummary> {
  const collection = await groups();
  const memberships = await collection
    .find({ members: username }, { projection: { owner: 1, members: 1 } })
    .toArray();

  const summary: DetachSummary = { left: 0, handedOver: 0, deleted: 0 };
  const now = new Date();

  for (const group of memberships) {
    if (group.owner !== username) {
      await collection.updateOne(
        { _id: group._id },
        { $pull: { members: username }, $set: { updated_at: now } }
      );
      summary.left++;
      continue;
    }

    const successor = group.members.find((member) => member !== username);

    if (!successor) {
      await collection.deleteOne({ _id: group._id });
      summary.deleted++;
      continue;
    }

    await collection.updateOne(
      { _id: group._id },
      { $set: { owner: successor, updated_at: now }, $pull: { members: username } }
    );
    summary.handedOver++;
  }

  return summary;
}

/**
 * Blank the departing account's name off papers it contributed.
 *
 * The papers stay — they belong to the group now — but the credit cannot keep
 * naming someone who has erased their account, and leaving it would hand
 * removal rights to anyone who later registers the same username.
 */
export async function anonymiseContributions(username: string): Promise<void> {
  const collection = await groups();
  await collection.updateMany(
    { 'articles.added_by': username },
    { $set: { 'articles.$[contribution].added_by': '' } },
    { arrayFilters: [{ 'contribution.added_by': username }] }
  );
}
