import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-get.ts";

Deno.test("site-get: GETs /sites/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "site1", name: "example" } },
  ]);
  const result = await action.execute!({ siteId: "site1" }, ctx);

  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/sites/site1");
  assertEquals(result, { id: "site1", name: "example" });
});

Deno.test("site-get: requires siteId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "siteId");
});
