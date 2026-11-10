import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-workbook.ts";

const item = (id: string) => ({ id, name: `${id}.xlsx` });
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);

test("new-workbook seeds, emits new workbooks, retries, and requests created descending", async () => {
  const seed = ctx([item("a")]);
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.xlsx')?%24orderby=createdDateTime+desc&%24top=100",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
