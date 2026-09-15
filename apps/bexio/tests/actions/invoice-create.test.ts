import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs to /2.0/kb_invoice with mapped body and positions", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, document_nr: "RE-0001" } }]);
  const positions = [{
    type: "KbPositionCustom",
    amount: "1",
    unit_price: "100.00",
    text: "Consulting",
  }];
  const result = await action.execute!({
    contactId: 14,
    userId: 1,
    languageId: 1,
    currencyId: 1,
    mwstType: 1,
    positions,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_invoice");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contact_id, 14);
  assertEquals(body.user_id, 1);
  assertEquals(body.mwst_type, 1);
  assertEquals(body.positions, positions);
  assertEquals(result, { id: 1, document_nr: "RE-0001" });
});
