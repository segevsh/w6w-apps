import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

Deno.test("lead-update: PUTs the id alongside the changed fields", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: {} }] } },
  ]);
  await action.execute({ recordId: "1", fields: { Lead_Status: "Contacted" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Leads");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ id: "1", Lead_Status: "Contacted" }] });
});

Deno.test("lead-update: idempotent — a PUT writes absolute values", () => {
  assertEquals(action.idempotent, true);
});
