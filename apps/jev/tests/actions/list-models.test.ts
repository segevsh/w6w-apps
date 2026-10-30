import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

test("list-models: GETs /v1/models and returns the response verbatim", async () => {
  const body = { models: [{ name: "system-one", release_date: "2026-01-01" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.typesafe.ai/v1/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
