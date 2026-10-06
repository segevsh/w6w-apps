import { assertEquals } from "@std/assert";
import action from "../../actions/invoice-booked-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invoice-booked-get: GETs /invoices/booked/{id} and wraps the object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await action.execute!({ bookedInvoiceNumber: "A/1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/invoices/booked/A%2F1");
  assertEquals(out, { invoice: { id: 1 } });
});

Deno.test("invoice-booked-get: a 404 is thrown with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "not found", errorCode: "E06000" } }]);
  let msg = "";
  try {
    await action.execute!({ bookedInvoiceNumber: 9 }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("not found (E06000)"), true);
});
