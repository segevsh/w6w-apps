import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bounce-get-many.ts";

Deno.test("bounce-get-many: GETs /v3/{domain}/bounces", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ domain: "mg.example.com", limit: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/mg.example.com/bounces");
  assertEquals(url.searchParams.get("limit"), "25");
});

Deno.test("bounce-get-many: missing domain rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "`domain`");
});
