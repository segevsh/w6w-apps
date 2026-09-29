import { assertEquals } from "@std/assert";
import opportunityStageList from "../../actions/opportunity-stage-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("opportunity-stage-list: fetches GET /lists/opportunity_stages", async () => {
  const { ctx, calls } = mockCtx([{
    body: { opportunity_stages: [{ id: 10, code: "Closed Lost", is_default: true }] },
  }]);
  const out = await opportunityStageList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/lists/opportunity_stages");
  assertEquals(out.opportunity_stages[0].code, "Closed Lost");
});
