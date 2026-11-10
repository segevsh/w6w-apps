import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-workbook.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) =>
  mockCtx([{ status: 200, body: { workbooks: { workbook: items } } }], {
    display: DEFAULT_DISPLAY,
  });
const item = (
  id: number,
  v = "00",
) => ({
  id: `wb-${id}`,
  name: "W",
  createdAt: `2026-11-09T00:00:0${id}Z`,
  updatedAt: `2026-11-10T00:00:${v}Z`,
});

test("new-or-updated-workbook: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-workbook: emits only the new record after the seed", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(3), item(2), item(1)]).ctx,
  );
  assertEquals(next.events, [item(3)]);
});

test("new-or-updated-workbook: an edited record is emitted again, an unchanged one is not", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([item(2, "20"), item(1, "10")]).ctx,
  );
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(1, "30"), item(2, "20")]).ctx,
  );
  assertEquals(next.events, [item(1, "30")]);
});

test("new-or-updated-workbook: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2)]).ctx);
  const page = [item(3), item(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(3)]);
  assertEquals(again, first);
});

test("new-or-updated-workbook: sends the list request (sort=updatedAt:desc, documented sortable field)", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://10ax.online.tableau.com/api/3.21/sites/site-1/workbooks?sort=updatedAt%3Adesc&pageNumber=1&pageSize=100",
  );
});
