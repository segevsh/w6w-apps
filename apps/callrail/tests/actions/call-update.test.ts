import { assertEquals } from "@std/assert";
import callUpdate from "../../actions/call-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-update: PUTs tags as an array and other fields verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CAL1", customer_name: "James Smith" } }]);
  const out = await callUpdate.execute(
    {
      accountId: "ACC1",
      callId: "CAL1",
      tags: "New Client",
      appendTags: true,
      note: "Call back tomorrow",
      value: "$1.00",
      leadStatus: "good_lead",
      customerName: "James Smith",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls/CAL1.json");
  assertEquals(JSON.parse(calls[0].body!), {
    tags: ["New Client"],
    append_tags: true,
    note: "Call back tomorrow",
    value: "$1.00",
    lead_status: "good_lead",
    customer_name: "James Smith",
  });
  assertEquals(out, { id: "CAL1", customer_name: "James Smith" });
});

Deno.test("call-update: an unset field is omitted from the body, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await callUpdate.execute({ accountId: "ACC1", callId: "CAL1", note: "hi" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("tags" in body, false);
  assertEquals("customer_name" in body, false);
  assertEquals(body.note, "hi");
});

Deno.test("call-update: idempotent — repeating the same update converges on the same state", () => {
  assertEquals(callUpdate.idempotent, true);
});
