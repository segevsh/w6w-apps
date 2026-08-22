import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const page = {
  status: 200,
  body: {
    results: [
      { id: "5f8d0d55b54eff0f2b2c3d4e", name: "production" },
      { id: "6a9e1e66c65fff1f3c3d4e5f", name: "staging" },
    ],
    totalCount: 2,
  },
};

/** The console says project; every path says groups. */
Deno.test("project-list: reads the groups endpoint", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/atlas/v2/groups");
  assertEquals(result.count, 2);
  assert(/`groups` in every path/.test(action.description!), action.description);
});

/** No project-scoped path accepts a name — this is how one becomes an id. */
Deno.test("project-list: filters by name locally and returns the single id", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ name: "PRODUCT" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.id, "5f8d0d55b54eff0f2b2c3d4e");
  // The API has no name filter, so it is not sent as one.
  assertEquals(new URL(calls[0].url).searchParams.get("name"), null);
});

Deno.test("project-list: an ambiguous or empty match leaves the single id unset", async () => {
  const many = mockCtx([page]);
  const ambiguous = await action.execute({ name: "" }, many.ctx) as Record<string, unknown>;
  assertEquals(ambiguous.id, undefined, "two matches means no single answer");

  const none = mockCtx([page]);
  const missing = await action.execute({ name: "nope" }, none.ctx) as Record<string, unknown>;
  assertEquals(missing.count, 0);
  assertEquals(missing.id, undefined);
});

Deno.test("project-list: totalCount is the unfiltered total", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ name: "staging" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.totalCount, 2);
});

Deno.test("project-list: a project this account cannot reach is simply absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.ids, []);
});
