import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-history.ts";

Deno.test("sms-history: lists a lead's texts and pages by id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { texts: [{ id: 1, direction: "Outbound", textOutcome: "Delivered" }] },
  }]);
  const result = await action.execute!({ leadId: 555, currentId: 900, limit: 10 }, ctx) as {
    texts: Array<{ direction: string }>;
  };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/communication/text");
  assertEquals(url.searchParams.get("leadId"), "555");
  assertEquals(url.searchParams.get("currentId"), "900");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(result.texts[0].direction, "Outbound");
});
