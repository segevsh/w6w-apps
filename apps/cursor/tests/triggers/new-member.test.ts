import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-member.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const member = (id: string, isRemoved = false) => ({
  id,
  name: `Name ${id}`,
  email: `${id}@example.com`,
  role: "member",
  isRemoved,
});
const response = (members: unknown[]) => ({ body: { teamMembers: members } });

test("new-member: seeds, emits only new members, retries idempotently, lists /teams/members", async () => {
  const seed = mockCtx([response([member("a")])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.cursor.com/teams/members");

  const rows = () => [member("a"), member("b"), member("c", true)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response(rows())]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response(rows())]).ctx,
  );
  assertEquals(first.events, [member("b")]);
  assertEquals(retry, first);
});

test("new-member: a role change on a known member emits nothing (updated is off)", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([response([member("a"), member("b")])]).ctx,
  );
  const promoted = { ...member("a"), role: "admin" };
  const out = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response([promoted, member("b")])]).ctx,
  );
  assertEquals(out.events, []);
});
