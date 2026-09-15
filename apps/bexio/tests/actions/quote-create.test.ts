import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-create.ts";

Deno.test("quote-create: POSTs to /2.0/kb_offer with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, document_nr: "AN-0001" } }]);
  const result = await action.execute!({
    title: "Website relaunch",
    contactId: 14,
    userId: 1,
    isValidUntil: "2026-10-01",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_offer");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "Website relaunch");
  assertEquals(body.contact_id, 14);
  assertEquals(body.is_valid_until, "2026-10-01");
  assertEquals(result, { id: 1, document_nr: "AN-0001" });
});
