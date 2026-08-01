import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/get-automation.ts";

Deno.test("get-automation: GETs /automations/{id}", async () => {
  const body = { automation: { id: "6", name: "Welcome Series" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ automationId: "6" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/3/automations/6");
  assertEquals(result, body);
});
