import { assertEquals } from "@std/assert";
import listTimeOffPolicies from "../../actions/list-time-off-policies.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-time-off-policies: searches /meta/time_off/policies with no params", async () => {
  assertEquals(listTimeOffPolicies.type, "search");
  assertEquals(listTimeOffPolicies.params, []);

  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTimeOffPolicies.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/meta/time_off/policies");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
});
