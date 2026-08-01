import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-get.ts";

Deno.test("deploy-get: GETs /deploys/{id}, not site-scoped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "deploy1", state: "ready" } }]);
  const result = await action.execute!({ deployId: "deploy1" }, ctx);

  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/deploys/deploy1");
  assertEquals(result, { id: "deploy1", state: "ready" });
});

Deno.test("deploy-get: requires deployId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "deployId");
});
