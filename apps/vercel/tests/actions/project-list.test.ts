import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const page = (items: unknown[], next: number | null) => ({
  projects: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("project-list: lists /v10/projects with a search filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "prj_1" }], null) }], {
    display: { teamId: "team_abc" },
  });
  const result = await action.execute!({ search: "web" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v10/projects");
  assertEquals(url.searchParams.get("search"), "web");
  assertEquals(url.searchParams.get("teamId"), "team_abc");
  assertEquals(result, [{ id: "prj_1" }]);
});

Deno.test("project-list: returnAll collects every page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "1" }], 1700000000000) },
    { status: 200, body: page([{ id: "2" }], null) },
  ], { display: {} });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 2);
});
