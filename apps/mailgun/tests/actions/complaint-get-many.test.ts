import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/complaint-get-many.ts";

Deno.test("complaint-get-many: GETs /v3/{domain}/complaints", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ domain: "mg.example.com", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/mg.example.com/complaints");
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("complaint-get-many: missing domain rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "`domain`");
});
