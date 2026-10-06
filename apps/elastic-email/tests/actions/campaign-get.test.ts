import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: GET /campaigns/{name}", async () => {
  const { ctx, calls } = mockCtx([{ body: { Name: "Spring 26", Status: "Completed" } }]);
  const out = await action.execute({ name: "Spring 26" }, ctx) as { Status: string };
  assertEquals(out.Status, "Completed");
  assertEquals(pathOf(calls[0].url), "/v4/campaigns/Spring%2026");
});

Deno.test("campaign-get: name required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
