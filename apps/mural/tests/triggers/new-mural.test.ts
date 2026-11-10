import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-mural.ts";

const input = { params: { workspaceId: "ws1" }, subscriptionId: "sub-1" };
const page = (ids: string[]) => ({ body: { value: ids.map((id) => ({ id, title: id })) } });
const ctx = (ids: string[]) => mockCtx([page(ids)]);

test("new-mural: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx(["m1"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://app.mural.co/api/public/v1/workspaces/ws1/murals?sortBy=lastCreated&limit=99",
  );

  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["m2", "m1"]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["m2", "m1"]).ctx);
  assertEquals(first.events, [{ id: "m2", title: "m2" }]);
  assertEquals(retry, first);
});
