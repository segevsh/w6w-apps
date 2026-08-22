import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-list.ts";

const page = (items: unknown[], next: number | null) => ({
  domains: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("domain-list: lists account-level domains", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ name: "a.com" }], null) }], {
    display: { teamId: "team_abc" },
  });
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/domains");
  assertEquals(url.searchParams.get("teamId"), "team_abc");
  assertEquals(result, [{ name: "a.com" }]);
});
