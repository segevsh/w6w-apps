import { assertEquals, assertRejects } from "@std/assert";
import saleRefund from "../../actions/sale-refund.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "saleId": "saleId-1==", "amountCents": 5 };

Deno.test("sale-refund: sends PUT /v2/sales/saleId-1%3D%3D/refund with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "sale": { "id": "x1", "marker": true } },
  }]);
  await saleRefund.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/sales/saleId-1%3D%3D/refund");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["amount_cents", "5"]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("sale-refund: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "sale": { "id": "x1", "marker": true } } }]);
  assertEquals(await saleRefund.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("sale-refund: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(saleRefund.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("sale-refund: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(saleRefund.execute(INPUT, ctx)), Error, "refused");
});
