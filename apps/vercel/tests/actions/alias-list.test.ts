import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-list.ts";

const page = (items: unknown[], next: number | null) => ({
  aliases: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("alias-list: lists aliases with project and domain filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ alias: "a.com" }], null) }], {
    display: {},
  });
  const result = await action.execute!({ projectId: "prj_1", domain: "a.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/aliases");
  assertEquals(url.searchParams.get("projectId"), "prj_1");
  assertEquals(url.searchParams.get("domain"), "a.com");
  assertEquals(result, [{ alias: "a.com" }]);
});

Deno.test("alias-list: a small limit truncates without a second request", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ alias: "a" }, { alias: "b" }], 1700000000000) },
  ], { display: {} });
  assertEquals(await action.execute!({ limit: 1 }, ctx), [{ alias: "a" }]);
  assertEquals(calls.length, 1);
});
