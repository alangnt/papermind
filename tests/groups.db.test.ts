import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';

import type { Group } from '@/lib/groups';
import {
  addArticleToGroup,
  anonymiseContributions,
  createGroup,
  createInvite,
  deleteGroup,
  detachUserFromAllGroups,
  findGroupByInviteToken,
  getGroupForMember,
  joinGroupByToken,
  removeArticleFromGroup,
  removeMember,
  renameGroup,
  revokeInvite,
  transferOwnership,
} from '@/lib/groups';

const OWNER = 'owner';
const MEMBER = 'member';
const OUTSIDER = 'outsider';

/**
 * These exercise real MongoDB semantics — $or filters, arrayFilters, $size,
 * matchedCount vs modifiedCount — which is where the bugs actually were, so
 * they run against a scratch database rather than a mock.
 *
 * The .db. in the filename is load-bearing: vitest.config.mts leaves these
 * uncollected when MONGODB_URI is absent, so an offline run still passes.
 */
let client: MongoClient;
const groups = () => client.db(process.env.MONGODB_NAME!).collection<Group>('groups');

beforeAll(async () => {
  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
});

afterAll(async () => {
  await client?.close();
});

beforeEach(async () => {
  await groups().deleteMany({});
});

/** A group owned by OWNER with MEMBER alongside, which is the interesting shape. */
async function sharedGroup() {
  const group = await createGroup('Shared', OWNER);
  await groups().updateOne({ _id: group._id }, { $push: { members: MEMBER } });
  return group._id;
}

describe('createGroup', () => {
  it('puts the owner in members, so permission checks never special-case them', async () => {
    const group = await createGroup('Solo', OWNER);
    expect(group.members).toEqual([OWNER]);
    expect(group.owner).toBe(OWNER);
    expect(group.articles).toEqual([]);
    expect(group.invite).toBeNull();
  });
});

describe('getGroupForMember', () => {
  it('returns the group for a member', async () => {
    const id = await sharedGroup();
    expect(await getGroupForMember(id, MEMBER)).not.toBeNull();
  });

  it('returns null for an outsider rather than revealing it exists', async () => {
    const id = await sharedGroup();
    expect(await getGroupForMember(id, OUTSIDER)).toBeNull();
  });

  it('returns null for an id that matches nothing', async () => {
    expect(await getGroupForMember(new ObjectId(), OWNER)).toBeNull();
  });
});

describe('renameGroup', () => {
  it('is owner-only', async () => {
    const id = await sharedGroup();
    expect(await renameGroup(id, MEMBER, 'Nope')).toBe(false);
    expect(await renameGroup(id, OWNER, 'Renamed')).toBe(true);
    expect((await getGroupForMember(id, OWNER))?.name).toBe('Renamed');
  });
});

describe('addArticleToGroup', () => {
  it('accepts an abs URL and stores the bare id', async () => {
    const id = await sharedGroup();
    expect(await addArticleToGroup(id, MEMBER, 'http://arxiv.org/abs/2301.07041v2')).toBe('added');
    const group = await getGroupForMember(id, MEMBER);
    expect(group?.articles).toEqual([
      expect.objectContaining({ arxiv_id: '2301.07041', added_by: MEMBER }),
    ]);
  });

  it('does not add the same paper twice, whichever form it arrives in', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    expect(await addArticleToGroup(id, OWNER, 'http://arxiv.org/abs/2301.07041v2')).toBe(
      'already-present'
    );
    expect((await getGroupForMember(id, OWNER))?.articles).toHaveLength(1);
  });

  it('credits the first adder, not the second', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    await addArticleToGroup(id, OWNER, '2301.07041');
    expect((await getGroupForMember(id, OWNER))?.articles[0].added_by).toBe(MEMBER);
  });

  it('inserts once when the same paper is added concurrently', async () => {
    const id = await sharedGroup();
    await Promise.all(Array.from({ length: 8 }, () => addArticleToGroup(id, MEMBER, '2301.07041')));
    expect((await getGroupForMember(id, MEMBER))?.articles).toHaveLength(1);
  });

  it('refuses an outsider', async () => {
    const id = await sharedGroup();
    expect(await addArticleToGroup(id, OUTSIDER, '2301.07041')).toBe('not-a-member');
  });

  it('refuses something that is not an arXiv id', async () => {
    const id = await sharedGroup();
    expect(await addArticleToGroup(id, MEMBER, 'not-an-id')).toBe('bad-id');
  });
});

describe('removeArticleFromGroup', () => {
  it('lets the adder remove their own paper', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    expect(await removeArticleFromGroup(id, MEMBER, '2301.07041')).toBe('removed');
  });

  it('lets the owner remove anyone else’s paper', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    expect(await removeArticleFromGroup(id, OWNER, '2301.07041')).toBe('removed');
  });

  it('refuses a member who did not add it', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, OWNER, '2301.07041');
    expect(await removeArticleFromGroup(id, MEMBER, '2301.07041')).toBe('forbidden');
  });

  // Regression: $set of updated_at counted as a modification, so removing a
  // paper that was never there reported success.
  it('reports not-found for a paper the group never had', async () => {
    const id = await sharedGroup();
    expect(await removeArticleFromGroup(id, OWNER, '2301.07041')).toBe('not-found');
  });

  it('reports not-found on the second removal', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, OWNER, '2301.07041');
    await removeArticleFromGroup(id, OWNER, '2301.07041');
    expect(await removeArticleFromGroup(id, OWNER, '2301.07041')).toBe('not-found');
  });

  it('hides the group from an outsider rather than saying forbidden', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, OWNER, '2301.07041');
    expect(await removeArticleFromGroup(id, OUTSIDER, '2301.07041')).toBe('not-found');
  });
});

describe('invites', () => {
  it('mints a link only for the owner', async () => {
    const id = await sharedGroup();
    expect(await createInvite(id, MEMBER)).toBeNull();
    expect(await createInvite(id, OWNER)).not.toBeNull();
  });

  it('replaces the previous link, which is how revoking by rotation works', async () => {
    const id = await sharedGroup();
    const first = await createInvite(id, OWNER);
    const second = await createInvite(id, OWNER);
    expect(first!.token).not.toBe(second!.token);
    expect(await findGroupByInviteToken(first!.token)).toBeNull();
    expect(await findGroupByInviteToken(second!.token)).not.toBeNull();
  });

  it('ignores an expired token', async () => {
    const id = await sharedGroup();
    const invite = await createInvite(id, OWNER);
    await groups().updateOne(
      { _id: id },
      { $set: { 'invite.expires_at': new Date(Date.now() - 1000) } }
    );
    expect(await findGroupByInviteToken(invite!.token)).toBeNull();
  });

  it('stops working once revoked', async () => {
    const id = await sharedGroup();
    const invite = await createInvite(id, OWNER);
    await revokeInvite(id, OWNER);
    expect(await joinGroupByToken(invite!.token, OUTSIDER)).toEqual({ result: 'invalid-token' });
  });

  it('adds the joiner once, and is idempotent on a second use', async () => {
    const id = await sharedGroup();
    const invite = await createInvite(id, OWNER);
    expect((await joinGroupByToken(invite!.token, OUTSIDER)).result).toBe('joined');
    expect((await joinGroupByToken(invite!.token, OUTSIDER)).result).toBe('already-a-member');
    expect((await getGroupForMember(id, OUTSIDER))?.members).toEqual([OWNER, MEMBER, OUTSIDER]);
  });
});

describe('removeMember', () => {
  it('lets a member leave', async () => {
    const id = await sharedGroup();
    expect(await removeMember(id, MEMBER, MEMBER)).toBe('left');
  });

  it('stops the owner leaving, since nobody would be left to manage it', async () => {
    const id = await sharedGroup();
    expect(await removeMember(id, OWNER, OWNER)).toBe('owner-must-delete');
  });

  it('stops a member removing anyone else', async () => {
    const id = await sharedGroup();
    expect(await removeMember(id, MEMBER, OWNER)).toBe('forbidden');
  });

  it('lets the owner remove a member', async () => {
    const id = await sharedGroup();
    expect(await removeMember(id, OWNER, MEMBER)).toBe('left');
  });
});

describe('transferOwnership', () => {
  it('hands over and leaves the old owner as an ordinary member', async () => {
    const id = await sharedGroup();
    expect(await transferOwnership(id, OWNER, MEMBER)).toBe('transferred');
    const group = await getGroupForMember(id, OWNER);
    expect(group?.owner).toBe(MEMBER);
    expect(group?.members).toContain(OWNER);
  });

  it('lets the former owner leave afterwards', async () => {
    const id = await sharedGroup();
    await transferOwnership(id, OWNER, MEMBER);
    expect(await removeMember(id, OWNER, OWNER)).toBe('left');
  });

  // Regression: an outsider used to get 'not-owner', which confirmed the group
  // existed. Membership has to be checked first.
  it('tells an outsider nothing beyond not-found', async () => {
    const id = await sharedGroup();
    expect(await transferOwnership(id, OUTSIDER, MEMBER)).toBe('not-found');
  });

  // Regression: the self-check compared against the caller rather than the
  // real owner, so a member was told "you already own this group".
  it('tells a non-owner they are not the owner, even when naming themselves', async () => {
    const id = await sharedGroup();
    expect(await transferOwnership(id, MEMBER, MEMBER)).toBe('not-owner');
  });

  it('refuses handing the group to a non-member', async () => {
    const id = await sharedGroup();
    expect(await transferOwnership(id, OWNER, OUTSIDER)).toBe('not-a-member');
  });

  it('refuses handing the group to yourself', async () => {
    const id = await sharedGroup();
    expect(await transferOwnership(id, OWNER, OWNER)).toBe('already-owner');
  });
});

describe('deleteGroup', () => {
  it('deletes a group whose owner is its last member', async () => {
    const group = await createGroup('Solo', OWNER);
    expect(await deleteGroup(group._id, OWNER)).toBe('deleted');
  });

  it('refuses while other people are in it', async () => {
    const id = await sharedGroup();
    expect(await deleteGroup(id, OWNER)).toBe('has-members');
  });

  it('opens back up once everyone else has gone', async () => {
    const id = await sharedGroup();
    await removeMember(id, MEMBER, MEMBER);
    expect(await deleteGroup(id, OWNER)).toBe('deleted');
  });

  it('is owner-only, and invisible to outsiders', async () => {
    const id = await sharedGroup();
    expect(await deleteGroup(id, MEMBER)).toBe('not-owner');
    expect(await deleteGroup(id, OUTSIDER)).toBe('not-found');
  });
});

describe('detachUserFromAllGroups', () => {
  it('hands over, deletes and leaves, each in the right case', async () => {
    const shared = await sharedGroup();
    const solo = (await createGroup('Solo', OWNER))._id;
    const theirs = (await createGroup('Theirs', MEMBER))._id;
    await groups().updateOne({ _id: theirs }, { $push: { members: OWNER } });

    expect(await detachUserFromAllGroups(OWNER)).toEqual({
      left: 1,
      handedOver: 1,
      deleted: 1,
    });

    expect((await getGroupForMember(shared, MEMBER))?.owner).toBe(MEMBER);
    expect(await groups().findOne({ _id: solo })).toBeNull();
    expect((await getGroupForMember(theirs, MEMBER))?.members).toEqual([MEMBER]);
  });

  it('leaves no trace of the departing account', async () => {
    await sharedGroup();
    await detachUserFromAllGroups(OWNER);
    expect(await groups().countDocuments({ members: OWNER })).toBe(0);
    expect(await groups().countDocuments({ owner: OWNER })).toBe(0);
  });
});

describe('anonymiseContributions', () => {
  it('keeps the paper but blanks the departed name', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    await addArticleToGroup(id, OWNER, '2305.05904');

    await anonymiseContributions(MEMBER);

    const articles = (await getGroupForMember(id, OWNER))!.articles;
    expect(articles).toHaveLength(2);
    expect(articles.find((a) => a.arxiv_id === '2301.07041')?.added_by).toBe('');
    expect(articles.find((a) => a.arxiv_id === '2305.05904')?.added_by).toBe(OWNER);
  });

  // A freed username could otherwise be re-registered and inherit remove rights.
  it('leaves the blanked paper removable only by the owner', async () => {
    const id = await sharedGroup();
    await addArticleToGroup(id, MEMBER, '2301.07041');
    await anonymiseContributions(MEMBER);
    expect(await removeArticleFromGroup(id, MEMBER, '2301.07041')).toBe('forbidden');
    expect(await removeArticleFromGroup(id, OWNER, '2301.07041')).toBe('removed');
  });
});
