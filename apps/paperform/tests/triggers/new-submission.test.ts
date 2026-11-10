import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submission.ts";

const input = { params: { slugOrId: "contact-us" }, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: listEnvelope({ submissions: items }) }]);

test("new-submission: seeds, emits only unseen items, retries idempotently, requests created_at DESC", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.paperform.co/v1/forms/contact-us/submissions?limit=20&sort=DESC",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
