import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

Deno.test("company-get: GETs /companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5f7", name: "Acme" } }]);
  await action.execute!({ id: "5f7" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/companies/5f7");
  assertEquals(calls[0].method, "GET");
});
