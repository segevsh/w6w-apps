import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/activity-get.ts";

Deno.test("activity-get: GETs /activities/:id", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 3, date: "2024-03-21", hours: 2.5 } }]);
  const out = await action.execute({ activityId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/activities/3");
  assertEquals(out, { id: 3, date: "2024-03-21", hours: 2.5 });
});
