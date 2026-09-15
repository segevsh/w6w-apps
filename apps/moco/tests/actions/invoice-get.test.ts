import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/:id", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: { id: 11, status: "draft", title: "March services" },
  }]);
  const out = await action.execute({ invoiceId: 11 }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/invoices/11");
  assertEquals(out, { id: 11, status: "draft", title: "March services" });
});
