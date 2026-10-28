import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

/** Role and field names live here, and a send has to match them. */
Deno.test("template-get: unwraps the template and surfaces its roles", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { template: { template_id: "t1", signer_roles: [{ name: "Client" }] } },
  }]);
  const result = await action.execute!({ templateId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/template/t1");
  assertEquals(result.signer_roles, [{ name: "Client" }]);
  const outputs = action.output as Array<{ key: string }>;
  assertEquals(outputs.some((o) => o.key === "signer_roles"), true);
});

Deno.test("template-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`templateId`");
  assertEquals(calls.length, 0);
});
