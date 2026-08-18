import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-note-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("candidate-note-list: pages a candidate's notes to the end by default", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "n1" }], { moreDataAvailable: true, nextCursor: "Rl" }),
    page([{ id: "n2" }]),
  ]);
  const result = await action.execute!({ candidateId: "c1" }, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.listNotes");
  assertEquals(result.count, 2);
});

/**
 * Ashby accepts a `syncToken` here and ignores it — the endpoint has no
 * incremental sync — so passing one would silently fetch everything while
 * looking like a delta.
 */
Deno.test("candidate-note-list: deliberately offers no sync-token parameter", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("syncToken"), keys.join(","));
  assert(/IGNORES it/.test(action.description!), action.description);
});

Deno.test("candidate-note-list: never sends a sync token even if paged", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ candidateId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).syncToken, undefined);
});

Deno.test("candidate-note-list: needs a candidate id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "candidateId");
  assertEquals(calls.length, 0);
});
