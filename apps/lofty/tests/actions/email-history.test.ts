import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-history.ts";

Deno.test("email-history: lists a lead's emails and pages by id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { emails: [{ id: 1, direction: "Outbound", eventType: "Sent" }] },
  }]);
  const result = await action.execute!({ leadId: 555, offset: 20 }, ctx) as {
    emails: Array<{ eventType: string }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/communication/email");
  assertEquals(url.searchParams.get("leadId"), "555");
  assertEquals(url.searchParams.get("offset"), "20");
  assertEquals(result.emails[0].eventType, "Sent");
});
