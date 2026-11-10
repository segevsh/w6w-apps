import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-meeting.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const meeting = (id: string) => ({ id, title: id });
const ctx = (data: unknown[]) => mockCtx([{ body: { object: "list", has_more: false, data } }]);

test("new-meeting seeds, emits, retries, and requests Read AI's literal bounded page", async () => {
  const seed = ctx([meeting("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.read.ai/v1/meetings?limit=10",
  });
  const page = [meeting("b"), meeting("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [meeting("b")]);
  assertEquals(retry, first);
});
