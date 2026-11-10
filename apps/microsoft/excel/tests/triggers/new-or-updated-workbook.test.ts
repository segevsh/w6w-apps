import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-workbook.ts";

const item = (id: string, lastModifiedDateTime = id) => ({
  id,
  name: `${id}.xlsx`,
  lastModifiedDateTime,
});
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);
const input = { params: {}, state: {}, subscriptionId: "sub" };

test("new-or-updated-workbook seeds, emits new workbooks, retries, and requests modified descending", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.xlsx')?%24orderby=lastModifiedDateTime+desc&%24top=100",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-or-updated-workbook emits an edited workbook (same id, new stamp) exactly once", async () => {
  const seeded = await trigger.poll!(input, ctx([item("a", "1")]).ctx);
  const edited = item("a", "2");
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([edited]).ctx);
  assertEquals(first.events, [edited]);
  const again = await trigger.poll!({ ...input, state: first.nextState }, ctx([edited]).ctx);
  assertEquals(again.events, []);
});
