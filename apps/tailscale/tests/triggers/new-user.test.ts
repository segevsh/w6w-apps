import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const user = (id: string) => ({
  id,
  loginName: `${id}@example.com`,
  role: "member",
  status: "active",
});
const ctx = (users: unknown[]) => mockCtx([{ status: 200, body: { users } }]);
const keys = (events: unknown[]) => events.map((e) => (e as { key: string }).key);

test("new-user: seeds the whole member list without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([user("u1"), user("u2")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-user: emits only the user who appeared since the seed", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([user("u1"), user("u2")]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([user("u1"), user("u2"), user("u3")]).ctx,
  );
  assertEquals(keys(next.events), ["u3"]);
  assertEquals((next.events[0] as { change: string }).change, "added");
});

test("new-user: an edited existing user is not a new user", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([user("u1")]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ ...user("u1"), status: "idle" }]).ctx,
  );
  assertEquals(next.events, []);
});

test("new-user: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([user("u1")]).ctx);
  const page = [user("u1"), user("u2")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(keys(first.events), ["u2"]);
  assertEquals(again, first);
});

test("new-user: requests the tailnet user list (one unpaginated GET)", async () => {
  const m = ctx([user("u1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.tailscale.com/api/v2/tailnet/-/users?type=member&role=all",
  );
});
