import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-workbook.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (
  id: string,
  stamp = "stamp-1",
) => ({ resource_id: id, workbook_name: `Book ${id}`, last_modified_time: stamp });
const page = (...rows: unknown[]) => mockCtx([{ body: { workbooks: rows, status: "success" } }]);

test("new-or-updated-workbook: the first check seeds without events and sends the documented request", async () => {
  const seed = page(item("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(
    seed.calls[0].url,
    "https://sheet.zoho.com/api/v2/workbooks",
  );
  assertEquals(
    seed.calls[0].body,
    "method=workbook.list&start_index=1&count=100&sort_option=recently_modified",
  );
});

test("new-or-updated-workbook: emits only the new workbook, and a retry from the same state is identical", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const rows = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
  const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
  assertEquals(again.events, []);
});

test("new-or-updated-workbook: an edited workbook is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a", "stamp-1")).ctx);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    page(item("a", "stamp-2")).ctx,
  );
  assertEquals(edited.events, [item("a", "stamp-2")]);
  const untouched = await trigger.poll!(
    { ...input, state: edited.nextState },
    page(item("a", "stamp-2")).ctx,
  );
  assertEquals(untouched.events, []);
});
