import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "./_shared.ts";
import action from "../../actions/version.ts";

test("version: reads /api/version off the fixed cloud origin", async () => {
  const { ctx, calls } = mockCtx([ok({ version: "0.34.1" })]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, `${BASE}/api/version`);
  assertEquals(result, { version: "0.34.1" });
});
