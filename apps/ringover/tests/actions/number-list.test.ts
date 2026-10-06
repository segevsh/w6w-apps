import { assertEquals } from "@std/assert";
import action from "../../actions/number-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("number-list: sends only the set filters; a 204 is an empty list", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ isUser: true, isAvailable: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/numbers");
  assertEquals(Object.fromEntries(url.searchParams), { is_user: "true", is_available: "false" });
  assertEquals(out, { numbers: [], count: 0 });
});
