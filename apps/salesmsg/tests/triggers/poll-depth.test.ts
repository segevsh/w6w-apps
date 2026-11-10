import assert from "node:assert/strict";
import { test } from "node:test";
import conversation from "../../triggers/new-or-updated-conversation.ts";
import member from "../../triggers/new-member.ts";
import { mockCtx } from "../_helpers.ts";

const call = async (
  t: typeof conversation | typeof member,
  params: unknown,
  state: unknown,
  body: unknown,
) => {
  const m = mockCtx([{ body }]);
  const r = await t.poll!({ params, state, subscriptionId: "s" } as never, m.ctx);
  const url = new URL(m.calls[0].url);
  return {
    r,
    req: {
      method: m.calls[0].method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    },
  };
};

const conv = (id: number, last: string) => ({ id, last_message_at: last });

test("new-or-updated-conversation seeds, emits a new and an active conversation, retries, literal request", async () => {
  const req = {
    method: "GET",
    path: "/pub/v2.3/conversations",
    query: { filter: "unread", limit: "50" },
  };
  const params = { filter: "unread" };
  const seed = await call(conversation, params, {}, [conv(1, "2026-11-10T09:00:00Z")]);
  assert.deepEqual(seed.r.events, []);
  assert.equal((seed.r.nextState as { seeded?: boolean }).seeded, true);
  assert.deepEqual(seed.req, req);

  const fresh = conv(2, "2026-11-10T09:10:00Z");
  const active = conv(1, "2026-11-10T09:05:00Z"); // known conversation, new message
  const page = [fresh, active, conv(1, "2026-11-10T09:00:00Z")];
  const first = await call(conversation, params, seed.r.nextState, page);
  const retry = await call(conversation, params, seed.r.nextState, page);
  assert.deepEqual(first.r.events, [active, fresh]);
  assert.deepEqual(retry.r, first.r);
  assert.deepEqual(first.req, req);
  assert.deepEqual((await call(conversation, params, first.r.nextState, page)).r.events, []);
});

test("new-or-updated-conversation defaults to the open view", async () => {
  const seed = await call(conversation, {}, {}, []);
  assert.deepEqual(seed.req.query, { filter: "open", limit: "50" });
});

test("new-member seeds, emits only the added member, retries identically, literal request", async () => {
  const req = { method: "GET", path: "/pub/v2.3/organization/members", query: {} };
  const old = { id: 1, email: "a@example.test" };
  const added = { id: 2, email: "b@example.test" };
  const seed = await call(member, {}, {}, [old]);
  assert.deepEqual(seed.r.events, []);
  assert.equal((seed.r.nextState as { seeded?: boolean }).seeded, true);
  assert.deepEqual(seed.req, req);
  const first = await call(member, {}, seed.r.nextState, [old, added]);
  const retry = await call(member, {}, seed.r.nextState, [old, added]);
  assert.deepEqual(first.r.events, [{ change: "added", key: "2", values: added }]);
  assert.deepEqual(retry.r, first.r);
  assert.deepEqual(first.req, req);
  assert.deepEqual((await call(member, {}, first.r.nextState, [old, added])).r.events, []);
});
