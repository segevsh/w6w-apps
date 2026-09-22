import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-add-tag.ts";

Deno.test("lead-add-tag: GETs the Simplified API route with the tag as a query param", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 145676 } }]);
  const lead = await action.execute({ leadId: "145676", tag: "ProductA" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/simple/leads/145676/add_tag?tag=ProductA");
  assertEquals(calls[0].method, "GET");
  assertEquals(lead, { id: 145676 });
});

Deno.test("lead-add-tag: is a `perform` action named for its effect, not its verb", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("lead-add-tag: the Simplified API's own refusal is surfaced", async () => {
  // The document: failing to pass X-API-KEY "will result in a 401 error status".
  const { ctx } = mockNocrmCtx([{
    status: 401,
    body: {
      error: 401,
      message: "Unauthorized: invalid api_key",
      type: "unauthorized_invalid_token",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ leadId: "1", tag: "t" }, ctx)),
    Error,
    "unauthorized_invalid_token",
  );
});
