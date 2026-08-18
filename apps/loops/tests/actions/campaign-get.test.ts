import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get.ts";

Deno.test("campaign-get: reads one campaign by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1", status: "draft" } }]);
  const result = await action.execute!({ campaignId: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/campaigns/c1");
  assertEquals(result.status, "draft");
});

Deno.test("campaign-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`campaignId`");
  assertEquals(calls.length, 0);
});
