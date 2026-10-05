import { assertEquals, assertRejects } from "@std/assert";
import saleMarkShipped from "../../actions/sale-mark-shipped.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "saleId": "saleId-1==", "trackingUrl": "trackingUrl-1" };

Deno.test("sale-mark-shipped: sends PUT /v2/sales/saleId-1%3D%3D/mark_as_shipped with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "sale": { "id": "x1", "marker": true } },
  }]);
  await saleMarkShipped.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/sales/saleId-1%3D%3D/mark_as_shipped");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["tracking_url", "trackingUrl-1"]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("sale-mark-shipped: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "sale": { "id": "x1", "marker": true } } }]);
  assertEquals(await saleMarkShipped.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("sale-mark-shipped: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(saleMarkShipped.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("sale-mark-shipped: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(saleMarkShipped.execute(INPUT, ctx)), Error, "refused");
});
