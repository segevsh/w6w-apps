import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/call-history.ts";

test("call-history: lists a lead's calls with their recorded outcome", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { calls: [{ id: 1, direction: "Outbound", callingOutcome: "Talked", duration: 225 }] },
  }]);
  const result = await action.execute!({ leadId: 555 }, ctx) as {
    calls: Array<{ callingOutcome: string; duration: number }>;
  };

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/communication/call");
  assertEquals(new URL(calls[0].url).searchParams.get("leadId"), "555");
  assertEquals(result.calls[0].callingOutcome, "Talked");
  assertEquals(result.calls[0].duration, 225);
});
