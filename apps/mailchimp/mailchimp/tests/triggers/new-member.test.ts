import assert from "node:assert/strict";
import test from "node:test";
import newMember from "../../triggers/new-member.ts";
import { mockCtx } from "../_helpers.ts";

const input = { listId: "aud_1" };
const seededMembers = [{ id: "old", email_address: "old@example.com" }];
const nextMembers = [
  { id: "new", email_address: "new@example.com" },
  ...seededMembers,
];

test("poll seeds without emitting the first page", async () => {
  const { ctx } = mockCtx([{ body: { members: seededMembers } }]);
  const result = await newMember.poll!({ params: input, state: {} }, ctx);
  assert.deepEqual(result.events, []);
  assert.equal(result.nextState.seeded, true);
});

test("poll emits exactly one member newly ahead of the cursor", async () => {
  const first = mockCtx([{ body: { members: seededMembers } }]);
  const seeded = await newMember.poll!({ params: input, state: {} }, first.ctx);
  const second = mockCtx([{ body: { members: nextMembers } }]);
  const result = await newMember.poll!({ params: input, state: seeded.nextState }, second.ctx);
  assert.deepEqual(result.events, [nextMembers[0]]);
});

test("poll is idempotent for the same state and response", async () => {
  const state = { v: 1, kind: "ids" as const, seeded: true, seen: ["old"] };
  const first = mockCtx([{ body: { members: nextMembers } }]);
  const second = mockCtx([{ body: { members: nextMembers } }]);
  assert.deepEqual(
    await newMember.poll!({ params: input, state }, first.ctx),
    await newMember.poll!({ params: input, state }, second.ctx),
  );
});

test("poll uses the list-members endpoint with the literal newest-first request", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: seededMembers } }]);
  await newMember.poll!({ params: input, state: {} }, ctx);
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [{
    method: "GET",
    url:
      "https://us14.api.mailchimp.com/3.0/lists/aud_1/members?count=100&offset=0&sort=last_changed&sort_dir=DESC",
    body: null,
  }]);
});
