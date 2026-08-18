import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

const page = (items: unknown[], next: number | null) => ({
  teams: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("team-list: sends no team scope — the endpoint declares none", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "team_abc" }], null) }], {
    display: { teamId: "team_abc" },
  });
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/teams");
  assertEquals(url.searchParams.get("teamId"), null);
  assertEquals(result, [{ id: "team_abc" }]);
});

Deno.test("team-list: returnAll collects every page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "1" }], 1700000000000) },
    { status: 200, body: page([{ id: "2" }], null) },
  ], { display: {} });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 2);
});
