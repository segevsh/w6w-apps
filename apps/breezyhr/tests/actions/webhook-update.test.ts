import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-update: PUTs only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", enabled: true } }]);
  const out = await action.execute!({ companyId: "c1", endpointId: "w1", enabled: true }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoint/w1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { enabled: true });
  assertEquals(out, { id: "w1", enabled: true });
});

Deno.test("webhook-update: events text becomes a list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    companyId: "c1",
    endpointId: "w1",
    events: "candidateAdded, candidateDeleted",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { events: ["candidateAdded", "candidateDeleted"] });
});
