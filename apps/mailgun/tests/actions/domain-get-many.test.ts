import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-get-many.ts";

test("domain-get-many: GETs /v4/domains with limit/skip/state", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ limit: 10, skip: 5, state: "active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/domains");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("skip"), "5");
  assertEquals(url.searchParams.get("state"), "active");
});

test("domain-get-many: omits state when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("state"), false);
});
