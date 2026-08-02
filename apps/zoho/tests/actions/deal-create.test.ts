import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/deal-create.ts";

Deno.test("deal-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({
    fields: { Deal_Name: "Acme renewal", Stage: "Qualification", Closing_Date: "2026-09-01" },
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Deals");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { data: [{ Deal_Name: "Acme renewal", Stage: "Qualification", Closing_Date: "2026-09-01" }] },
  );
});
