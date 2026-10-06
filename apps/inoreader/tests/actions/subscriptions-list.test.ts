import { assertEquals } from "@std/assert";
import list from "../../actions/subscriptions-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriptions-list: returns subscriptions and a count; no query by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: { subscriptions: [{ id: "feed/a" }, { id: "feed/b" }] },
  }]);
  const out = await list.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/reader/api/0/subscription/list");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { subscriptions: [{ id: "feed/a" }, { id: "feed/b" }], count: 2 });
});

Deno.test("subscriptions-list: teamAssets sends team_assets=1; missing array is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await list.execute({ teamAssets: true }, ctx);
  assertEquals(queryOf(calls[0].url), { team_assets: "1" });
  assertEquals(out, { subscriptions: [], count: 0 });
});
