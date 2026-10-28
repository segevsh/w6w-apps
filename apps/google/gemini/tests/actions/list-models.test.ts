import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /models with no query params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-models: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [] } }]);
  await action.execute!({ pageSize: 10, pageToken: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "10");
  assertEquals(url.searchParams.get("pageToken"), "abc");
});
