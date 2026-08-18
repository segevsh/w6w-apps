import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-get.ts";

Deno.test("alias-get: fetches one alias by hostname", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { alias: "my-app.com" } }], { display: {} });
  const result = await action.execute!({ idOrAlias: "my-app.com", projectId: "prj_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/aliases/my-app.com");
  assertEquals(url.searchParams.get("projectId"), "prj_1");
  assertEquals(result, { alias: "my-app.com" });
});

Deno.test("alias-get: a blank alias fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`idOrAlias`");
  assertEquals(calls.length, 0);
});
