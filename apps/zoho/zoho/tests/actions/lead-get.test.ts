import { assertEquals, assertRejects } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

Deno.test("lead-get: GETs /Leads/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1", Last_Name: "Smith" }] } }]);
  const out = await action.execute({ recordId: "1", fields: "id,Last_Name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Leads/1");
  assertEquals(out, { id: "1", Last_Name: "Smith" });
});

Deno.test("lead-get: throws when Zoho returns no record", async () => {
  const { ctx } = mockZohoCtx([{ body: { data: [] } }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ recordId: "missing", fields: "id" }, ctx)),
    Error,
    "no record for id missing",
  );
});
