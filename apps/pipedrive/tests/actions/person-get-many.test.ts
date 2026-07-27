import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-get-many.ts";

Deno.test("person-get-many: GETs /persons with first_char mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await action.execute!({ firstChar: "A", limit: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/persons");
  assertEquals(url.searchParams.get("first_char"), "A");
  assertEquals(url.searchParams.get("limit"), "25");
});
