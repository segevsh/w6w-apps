import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-credits.ts";

test("get-credits: GETs /credits with no params and returns the vendor's body", async () => {
  const body = { data: { total_credits: 100.5, total_usage: 25.75 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/credits");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

test("get-credits: description discloses the Management-key requirement", () => {
  assertEquals(/Management API key/.test(action.description ?? ""), true);
});
