import { assert, assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/limits-get.ts";

Deno.test("limits-get: GETs /limits", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { DailyApiRequests: { Remaining: 10 } } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/limits");
});

Deno.test("limits-get: names the limit a bulk workflow hits first", () => {
  assert(action.description?.includes("DailyApiRequests"));
});
