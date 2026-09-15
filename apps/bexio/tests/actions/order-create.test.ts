import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-create.ts";

Deno.test("order-create: POSTs to /2.0/kb_order with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, document_nr: "AU-0001" } }]);
  const result = await action.execute!({ contactId: 14, userId: 1, title: "Follow-up order" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_order");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contact_id, 14);
  assertEquals(body.title, "Follow-up order");
  assertEquals(result, { id: 1, document_nr: "AU-0001" });
});
