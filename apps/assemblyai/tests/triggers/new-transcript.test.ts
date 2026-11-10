import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transcript.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (transcripts: unknown[]) => mockCtx([{ body: { transcripts } }]);

test("new-transcript seeds, emits, retries, and requests newest-first transcripts", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.assemblyai.com/v2/transcript?limit=100");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
