import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

/** Nobody should be credited with a referral if they have left. */
Deno.test("user-list: excludes deactivated users by default", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "u1" }])]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/user.list");
  assertEquals(JSON.parse(calls[0].body!).includeDeactivated, undefined);
});

/** Resolving a credit on an old application needs them back. */
Deno.test("user-list: can include deactivated users for historical credits", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ includeDeactivated: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeDeactivated, true);
});

Deno.test("user-list: logs a count, not the staff list", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "u1", email: "ada@company.com" }])]);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@company.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("user-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "u1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as { syncToken: string };
  assertEquals(result.syncToken, "Rld2D");
});
