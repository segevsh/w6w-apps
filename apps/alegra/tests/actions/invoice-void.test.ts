import { assertEquals } from "@std/assert";
import invoiceVoid from "../../actions/invoice-void.ts";
import { alegraError, assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-void: POST /invoices/:id/void with the cause", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200, message: "La factura se anuló" } }]);
  const out = await invoiceVoid.execute({ id: "12", cause: "duplicate" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/invoices/12/void");
  assertEquals(bodyOf(calls[0]), { cause: "duplicate" });
  assertEquals(out, { code: 200, message: "La factura se anuló" });
});

Deno.test("invoice-void: with no cause the body is an empty object", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200 } }]);
  await invoiceVoid.execute({ id: "12" }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("invoice-void: a 404 surfaces the vendor message; a blank id makes no request", async () => {
  const { ctx } = mockCtx([{ status: 404, body: alegraError(404, "no registrada") }]);
  await assertRejects(() => invoiceVoid.execute({ id: "1" }, ctx), Error, "no registrada");
  const none = mockCtx([]);
  await assertRejects(() => invoiceVoid.execute({ id: "" }, none.ctx), Error, "id is required");
  assertEquals(none.calls.length, 0);
});
