import { assertEquals } from "@std/assert";
import opportunityList from "../../actions/opportunity-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("opportunity-list: fetches GET /opportunities?contact_id=&stage_id=", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunities: [{ id: 1, name: "401k rollover" }] } }]);
  const out = await opportunityList.execute({ contactId: 1, stageId: 11 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/opportunities");
  assertEquals(url.searchParams.get("contact_id"), "1");
  assertEquals(url.searchParams.get("stage_id"), "11");
  assertEquals(out.opportunities[0].name, "401k rollover");
});
