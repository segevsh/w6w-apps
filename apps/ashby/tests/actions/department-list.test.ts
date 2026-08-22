import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/department-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("department-list: excludes archived departments by default", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "d1" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/department.list");
  assertEquals(JSON.parse(calls[0].body!).includeArchived, undefined);
  assertEquals(result.count, 1);
});

/** Archived departments still appear on historical jobs. */
Deno.test("department-list: can include archived departments", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ includeArchived: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeArchived, true);
});

/** Grouping on the immediate department splits a division into its teams. */
Deno.test("department-list: says departments are hierarchical", () => {
  assert(/hierarchical/.test(action.description!), action.description);
});
