import { assertEquals } from "@std/assert";
import opportunityGet from "../../actions/opportunity-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("opportunity-get: fetches GET /opportunities/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: 643, name: "New Business" } } }]);
  const out = await opportunityGet.execute({ opportunityId: 643 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/opportunities/643");
  assertEquals(out.opportunity.name, "New Business");
});
