import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("candidate-list: converts a date filter to Unix milliseconds", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "c1" }])]);
  await action.execute!({ createdAfter: "2026-08-18T12:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).createdAfter, 1787054400000);
});

/** The token arrives on the last page, and only a completed walk gets one. */
Deno.test("candidate-list: returns the sync token when the walk finished", async () => {
  const { ctx } = mockCtx([page([{ id: "c1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as {
    syncToken: string;
    moreDataAvailable: boolean;
  };
  assertEquals(result.syncToken, "Rld2D");
  assertEquals(result.moreDataAvailable, false);
});

Deno.test("candidate-list: a truncated walk returns no token and says so", async () => {
  const { ctx } = mockCtx([
    page([{ id: "c1" }, { id: "c2" }], {
      moreDataAvailable: true,
      nextCursor: "Rl",
      syncToken: "X",
    }),
  ]);
  const result = await action.execute!({ limit: 2 }, ctx) as {
    syncToken?: string;
    moreDataAvailable: boolean;
  };
  assertEquals(result.syncToken, undefined);
  assertEquals(result.moreDataAvailable, true);
});

Deno.test("candidate-list: passes a previous sync token straight through", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ syncToken: "Rld2D" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).syncToken, "Rld2D");
});

/** A count and whether a token arrived — never the candidates. */
Deno.test("candidate-list: logs no personal data", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "c1", primaryEmailAddress: "ada@example.com" }])]);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@example.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1, gotSyncToken: false });
});
