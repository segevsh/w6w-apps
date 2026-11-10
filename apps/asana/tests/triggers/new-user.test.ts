import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";

const user = (gid: string) => ({ gid, name: `User ${gid}`, resource_type: "user" });
const input = { params: { workspace: "w1" }, subscriptionId: "sub_1" };

test("new-user: seeds, emits only added users, retries idempotently, and requests the user list", async () => {
  const seed = mockCtx([{ body: { data: [user("1"), user("2")] } }]);
  const seeded = await newUser.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: { data: [user("1"), user("2"), user("3")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await newUser.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await newUser.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [user("3")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls.length, 1);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://app.asana.com/api/1.0/workspaces/w1/users");
});

test("new-user: renames and removals do not emit", async () => {
  const seed = mockCtx([{ body: { data: [user("1"), user("2")] } }]);
  const seeded = await newUser.poll!({ ...input, state: {} }, seed.ctx);
  const next = mockCtx([{ body: { data: [{ ...user("1"), name: "Renamed" }] } }]);
  const result = await newUser.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(result.events, []);
});

test("new-user: a response with a next_page is refused rather than compared", async () => {
  const { ctx } = mockCtx([{ body: { data: [user("1")], next_page: { offset: "x" } } }]);
  await assertRejects(() => newUser.poll!({ ...input, state: {} }, ctx), Error, "partial list");
});

test("new-user: a missing workspace is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => newUser.poll!({ params: {}, subscriptionId: "s", state: {} }, ctx),
    Error,
    "Workspace ID",
  );
  assertEquals(calls.length, 0);
});
