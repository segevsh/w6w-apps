import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/list-automations.ts";

Deno.test("list-automations: GETs /automations", async () => {
  const body = { automations: [], meta: { total: "0" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ limit: 50, offset: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/3/automations");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(result, body);
});
