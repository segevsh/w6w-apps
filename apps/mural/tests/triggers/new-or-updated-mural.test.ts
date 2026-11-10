import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-mural.ts";

const input = { params: { workspaceId: "ws1" }, subscriptionId: "sub-1" };
const m = (id: string, updatedOn: number) => ({ id, title: id, updatedOn });
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);

test("new-or-updated-mural: seeds, emits an edited mural, retries idempotently, requests lastModified", async () => {
  const seed = ctx([m("m1", 100)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://app.mural.co/api/public/v1/workspaces/ws1/murals?sortBy=lastModified&limit=99",
  );

  const page = [m("m1", 200), m("m1", 100)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [m("m1", 200)]);
  assertEquals(retry, first);
});
