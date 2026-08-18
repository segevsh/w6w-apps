import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("job-list: sends the status filter as an array", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "j1" }])]);
  await action.execute!({ status: "Open, Draft" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, ["Open", "Draft"]);
});

Deno.test("job-list: date filters are converted to Unix milliseconds", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ openedAfter: "2026-08-18T12:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).openedAfter, 1787054400000);
});

Deno.test("job-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "j1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as { syncToken: string };
  assertEquals(result.syncToken, "Rld2D");
});

/** A job is the internal role; a posting is the public advertisement for it. */
Deno.test("job-list: says it is not the public postings", () => {
  assert(/not the public postings/.test(action.description!), action.description);
});

/** Ashby leaves confidential-job access off by default on API keys. */
Deno.test("job-list: warns that confidential jobs need a key permission", () => {
  assert(/off by default/.test(action.description!), action.description);
});
