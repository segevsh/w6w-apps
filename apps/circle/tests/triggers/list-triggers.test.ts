import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPost from "../../triggers/new-post.ts";
import newOrUpdatedPost from "../../triggers/new-or-updated-post.ts";
import newComment from "../../triggers/new-comment.ts";
import newMemberTag from "../../triggers/new-member-tag.ts";
import newSpace from "../../triggers/new-space.ts";
import newSpaceGroup from "../../triggers/new-space-group.ts";
import newEventAttendee from "../../triggers/new-event-attendee.ts";
import newSpaceMember from "../../triggers/new-space-member.ts";

const BASE = "https://app.circle.so/api/admin/v2";
const wrap = (items: unknown[], hasNext = false) => ({
  page: 1,
  per_page: 100,
  has_next_page: hasNext,
  count: items.length,
  page_count: 1,
  records: items,
});
const rec = (id: number, extra: Record<string, unknown> = {}) => ({ id, name: `r${id}`, ...extra });

// Table-driven: the newest-first (pollFromListAction) triggers and the bounded-collection
// (pollSnapshot) triggers each share one case set; every request URL is a literal.
const specs = [
  {
    name: "new-post",
    trigger: newPost,
    params: {},
    url: `${BASE}/posts?sort=latest&page=1&per_page=100`,
  },
  {
    name: "new-comment",
    trigger: newComment,
    params: {},
    url: `${BASE}/comments?page=1&per_page=100`,
  },
  {
    name: "new-member-tag",
    trigger: newMemberTag,
    params: {},
    url: `${BASE}/member_tags?sort=newest&page=1&per_page=100`,
  },
  { name: "new-space", trigger: newSpace, params: {}, url: `${BASE}/spaces?page=1&per_page=100` },
  {
    name: "new-space-group",
    trigger: newSpaceGroup,
    params: {},
    url: `${BASE}/space_groups?page=1&per_page=100`,
  },
  {
    name: "new-event-attendee",
    trigger: newEventAttendee,
    params: { eventId: 5 },
    url: `${BASE}/event_attendees?event_id=5&page=1&per_page=100`,
  },
  {
    name: "new-space-member",
    trigger: newSpaceMember,
    params: { spaceId: 9 },
    url: `${BASE}/space_members?space_id=9&page=1&per_page=100`,
  },
];

for (const { name, trigger, params, url } of specs) {
  const input = { params, subscriptionId: "sub-1" };
  const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);

  test(`${name}: seeds without emitting, emits only the new item, retries idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [rec(2), rec(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [rec(2)]);
    assertEquals(retry, first);
  });

  test(`${name}: sends the list action's literal request`, async () => {
    const seed = ctx([rec(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
  });
}

test("new-or-updated-post: an edited post is a new event, an unchanged one is not", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const post = (id: number, updated: string) => rec(id, { updated_at: updated });
  const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: wrap(items) }]);
  const seed = ctx([post(1, "2026-11-01T00:00:00Z")]);
  const seeded = await newOrUpdatedPost.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${BASE}/posts?sort=latest_updated&page=1&per_page=100`);
  const same = await newOrUpdatedPost.poll!(
    { ...input, state: seeded.nextState },
    ctx([post(1, "2026-11-01T00:00:00Z")]).ctx,
  );
  assertEquals(same.events, []);
  const edited = [post(1, "2026-11-10T00:00:00Z"), post(2, "2026-11-02T00:00:00Z")];
  const first = await newOrUpdatedPost.poll!(
    { ...input, state: seeded.nextState },
    ctx(edited).ctx,
  );
  const retry = await newOrUpdatedPost.poll!(
    { ...input, state: seeded.nextState },
    ctx(edited).ctx,
  );
  assertEquals(first.events, [edited[1], edited[0]]);
  assertEquals(retry, first);
});

test("snapshot triggers read every page of the collection", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const seeded = await newSpace.poll!(
    { ...input, state: {} },
    mockCtx([{ body: wrap([rec(1), rec(2)], true) }, { body: wrap([rec(3)]) }]).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx([{ body: wrap([rec(1), rec(2)], true) }, { body: wrap([rec(3), rec(4)]) }]);
  const next = await newSpace.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [rec(4)]);
  assertEquals(mock.calls.map((c) => c.url), [
    `${BASE}/spaces?page=1&per_page=100`,
    `${BASE}/spaces?page=2&per_page=100`,
  ]);
});
