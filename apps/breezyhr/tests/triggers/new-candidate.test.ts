import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-candidate.ts";

const input = { params: { companyId: "c1", query: "engineer" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: { data: items, next_page: null } }]);
const item = (id: string) => ({ _id: id });

test("new-candidate: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://api.breezy.hr/v3/company/c1/candidates/search");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    query: "engineer",
    sort: "created",
    page_size: 50,
    page: 1,
  });
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
