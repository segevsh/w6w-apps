import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import salesList from "../../actions/sales-list.ts";

Deno.test("sales-list: GET /sales, unwraps result and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { request_id: "r", result: [{ id: "a" }], nextPageId: "n1" },
  }]);
  const out = await salesList.execute({ pageSize: 25, pageId: "p0" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/sales");
  assertEquals(queryOf(calls[0].url).pageSize, "25");
  assertEquals(queryOf(calls[0].url).pageId, "p0");
  assertEquals(out, { result: [{ id: "a" }], nextPageId: "n1" });
});

Deno.test("sales-list: null cursor on the last page; empty filters omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  const out = await salesList.execute({}, ctx) as { nextPageId: string | null };
  assertEquals(out.nextPageId, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("sales-list: surfaces a Hyros error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { result: "ERROR", message: ["bad"] } }]);
  await assertRejects(async () => await salesList.execute({}, ctx), Error, "bad");
});

Deno.test("sales-list: recurring/refunded state, lead and tag filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: [] } }]);
  await salesList.execute({
    isRecurringSale: "RECURRING",
    saleRefundedState: "REFUNDED",
    leadIds: "l1",
    productTags: "t1,t2",
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.isRecurringSale, "RECURRING");
  assertEquals(q.saleRefundedState, "REFUNDED");
  assertEquals(q.leadIds, '"l1"');
  assertEquals(q.productTags, '"t1","t2"');
});
