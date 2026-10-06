import { assertEquals, assertRejects } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GETs by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", name: "Hook" } }]);
  const out = await webhookGet.execute({ id: "w1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/webhook/w1");
  assertEquals(out.name, "Hook");
});

Deno.test("webhook-get: 404 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not found" } }]);
  await assertRejects(() => Promise.resolve(webhookGet.execute({ id: "x" }, ctx)), Error, "404");
});
