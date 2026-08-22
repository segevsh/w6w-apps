import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-list.ts";

Deno.test("model-list: filters by type when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { models: [] } }]);
  await action.execute!({ type: "rerank" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/models");
  assertEquals(url.searchParams.get("type"), "rerank");
});

Deno.test("model-list: no filter asks for everything", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { models: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
