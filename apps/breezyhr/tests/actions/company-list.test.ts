import { assertEquals } from "@std/assert";
import action from "../../actions/company-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-list: wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "c1", name: "Acme" }] }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/companies");
  assertEquals(out, { companies: [{ _id: "c1", name: "Acme" }] });
});

Deno.test("company-list: a non-array body yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({}, ctx), { companies: [] });
});
