import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/archive-reason-list.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

test("archive-reason-list: reads the reasons, excluding archived by default", async () => {
  const { ctx, calls } = mockCtx([ok([{ id: "r1", text: "Failed technical screen" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/archiveReason.list");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result.count, 1);
});

test("archive-reason-list: archived reasons are opt-in", async () => {
  const { ctx, calls } = mockCtx([ok([])]);
  await action.execute!({ includeArchived: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeArchived, true);
});

/** One generic reason for every rejection destroys the funnel analysis. */
test("archive-reason-list: says what the reasons are actually for", () => {
  assert(/funnel report/.test(action.description!), action.description);
});
