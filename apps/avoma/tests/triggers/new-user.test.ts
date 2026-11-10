import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (uuids: string[]) =>
  mockCtx([{ body: uuids.map((uuid) => ({ uuid, active: "true", role: { name: "Member" } })) }]);

test("new-user snapshots the user directory, emits additions only, retries idempotently", async () => {
  const seed = ctx(["u1"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.avoma.com/v1/users/");
  const run = () => trigger.poll!({ ...input, state: seeded.nextState }, ctx(["u1", "u2"]).ctx);
  const first = await run();
  assertEquals(first.events.map((e) => (e as { key: string }).key), ["u2"]);
  assertEquals(await run(), first);
});

test("new-user does not re-fire when a seen user changes", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(["u1"]).ctx);
  const changed = mockCtx([
    { body: [{ uuid: "u1", active: "false", role: { name: "Admin" } }] },
  ]);
  const r = await trigger.poll!({ ...input, state: seeded.nextState }, changed.ctx);
  assertEquals(r.events, []);
});
