import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

test("company-get: GETs /companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5f7", name: "Acme" } }]);
  await action.execute!({ id: "5f7" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/companies/5f7");
  assertEquals(calls[0].method, "GET");
});
