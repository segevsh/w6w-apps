import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const D = { display: { host: "https://nocodb.internal" } };
const input = { params: { tableId: "tbl1" }, subscriptionId: "sub-1" };
const row = (id: number) => ({ Id: id, Title: `r${id}` });
const ctx = (ids: number[]) =>
  mockCtx([{
    body: { list: ids.map(row), pageInfo: { isLastPage: true, totalRows: ids.length } },
  }], D);

test("new-record: seeds, emits only new rows, retries idempotently, sorts -Id", async () => {
  const seed = ctx([1]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://nocodb.internal/api/v2/tables/tbl1/records?sort=-Id&limit=100&offset=0",
  );

  const page = [2, 1];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row(2)]);
  assertEquals(retry, first);
});
