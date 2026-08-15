import { assertEquals } from "@std/assert";
import callCreate from "../../actions/call-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-create: POSTs the outbound-call body with snake_case field names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "CAL1", direction: "outbound" } }]);
  const out = await callCreate.execute(
    {
      accountId: "ACC1",
      callerId: "+17703334455",
      businessPhoneNumber: "+14045556666",
      customerPhoneNumber: "+14044442233",
      recordingEnabled: true,
      agentId: "USR1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls.json");
  assertEquals(JSON.parse(calls[0].body!), {
    caller_id: "+17703334455",
    business_phone_number: "+14045556666",
    customer_phone_number: "+14044442233",
    recording_enabled: true,
    agent_id: "USR1",
  });
  assertEquals(out, { id: "CAL1", direction: "outbound" });
});

Deno.test("call-create: marked not idempotent — a retry must not place the call twice", () => {
  assertEquals(callCreate.idempotent, false);
});
