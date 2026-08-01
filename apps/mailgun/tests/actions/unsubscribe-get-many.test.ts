import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-get-many.ts";

Deno.test("unsubscribe-get-many: GETs /v3/{domain}/unsubscribes", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ domain: "mg.example.com", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/mg.example.com/unsubscribes");
  assertEquals(url.searchParams.get("limit"), "5");
});

Deno.test("unsubscribe-get-many: missing domain rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "`domain`");
});
