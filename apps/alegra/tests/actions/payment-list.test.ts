import { assertEquals } from "@std/assert";
import paymentList from "../../actions/payment-list.ts";
import { assertRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-list: GET /payments with paging, filters and metadata, normalised to items + total", async () => {
  const rows = [{ id: "1" }, { id: "2" }];
  const { ctx, calls } = mockCtx([{ body: { metadata: { total: 42 }, data: rows } }]);
  const out = await paymentList.execute(
    { start: 30, limit: 10, orderDirection: "DESC", orderField: "id", type: "abc" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/payments");
  const q = queryOf(calls[0].url);
  assertEquals(q.start, "30");
  assertEquals(q.limit, "10");
  assertEquals(q.order_direction, "DESC");
  assertEquals(q.order_field, "id");
  assertEquals(q.type, "abc");
  assertEquals(q.metadata, "true");
  assertEquals(out, { items: rows, total: 42 });
});

Deno.test("payment-list: a bare array body still yields items with a null total", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "9" }] }]);
  assertEquals(await paymentList.execute({}, ctx), { items: [{ id: "9" }], total: null });
});

Deno.test("payment-list: a limit above 30 is rejected locally and no request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => paymentList.execute({ limit: 31 }, ctx), Error, "limit must be");
  assertEquals(calls.length, 0);
});

Deno.test("payment-list: a vendor error surfaces the vendor's own wording", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "limit too large", code: 400 } }]);
  await assertRejects(() => paymentList.execute({}, ctx), Error, "limit too large");
});

Deno.test("payment-list: declares search type and a 30-capped limit param", () => {
  assertEquals(paymentList.type, "search");
  const limit = paymentList.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.validation?.max, 30);
});
