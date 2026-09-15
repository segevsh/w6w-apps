import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-invoice.ts";

Deno.test("get-invoice: is a read action requiring invoiceId", () => {
  assertEquals(action.key, "get-invoice");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "invoiceId")!;
  assertEquals(p.required, true);
});

Deno.test("get-invoice: GETs /invoices/{id}, accepting a `number-` prefixed lookup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "i1", number: "1000" } }]);
  await action.execute({ invoiceId: "number-1000" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/invoices/number-1000");
});
