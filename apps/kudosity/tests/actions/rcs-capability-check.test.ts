import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rcsCapabilityCheck from "../../actions/rcs-capability-check.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

test("rcs-capability-check: POSTs phone_numbers and returns results", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ results: [{ phone_number: "61491570156", code: "ENABLED" }] }),
  }]);
  const out = await rcsCapabilityCheck.execute({
    sender: "DemoSender",
    phoneNumbers: '["61491570156"]',
  }, ctx) as { results: Array<{ code: string }> };
  assertEquals(pathOf(calls[0].url), "/v2/rcs/capabilities");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { sender: "DemoSender", phone_numbers: ["61491570156"] });
  assertEquals(out.results[0].code, "ENABLED");
});

test("rcs-capability-check: is a read, not a send", () => {
  assertEquals(rcsCapabilityCheck.type, "read");
});
