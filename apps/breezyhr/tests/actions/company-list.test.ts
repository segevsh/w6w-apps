import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/company-list.ts";
import { mockCtx } from "../_helpers.ts";

test("company-list: wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "c1", name: "Acme" }] }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/companies");
  assertEquals(out, { companies: [{ _id: "c1", name: "Acme" }] });
});

test("company-list: a non-array body yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({}, ctx), { companies: [] });
});
