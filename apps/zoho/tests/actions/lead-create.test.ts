import { assertEquals, assertRejects } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  const out = await action.execute({ fields: { Last_Name: "Smith", Company: "Acme" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Leads");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Last_Name: "Smith", Company: "Acme" }] });
  assertEquals(out.details, { id: "1" });
});

Deno.test("lead-create: surfaces a per-item error as a thrown error", async () => {
  const { ctx } = mockZohoCtx([
    { body: { data: [{ code: "MANDATORY_NOT_FOUND", status: "error", message: "Last_Name" }] } },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ fields: { Company: "Acme" } }, ctx)),
    Error,
    "MANDATORY_NOT_FOUND",
  );
});

Deno.test("lead-create: not idempotent — Zoho mints a new id per call", () => {
  assertEquals(action.idempotent, false);
});
