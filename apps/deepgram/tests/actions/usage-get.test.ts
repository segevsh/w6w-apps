import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-get.ts";

const display = { projectId: "proj_1" };
const usage = (results: unknown[]) => ({ status: 200, body: { results } });

/** Deepgram bills by duration, so hours are the number that matters. */
Deno.test("usage-get: totals the hours and the requests", async () => {
  const { ctx, calls } = mockCtx([usage([
    { requests: 10, total_hours: 1.5 },
    { requests: 5, total_hours: 0.5 },
  ])], { display });
  const result = await action.execute!({}, ctx) as {
    totalHours: number;
    totalRequests: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.deepgram.com/v1/projects/proj_1/usage");
  assertEquals(result.totalHours, 2);
  assertEquals(result.totalRequests, 15);
});

/** A timestamp is misread rather than rejected, so it is converted first. */
Deno.test("usage-get: a timestamp is narrowed to the date Deepgram wants", async () => {
  const { ctx, calls } = mockCtx([usage([])], { display });
  await action.execute!({ start: "2026-08-18T12:00:00Z", end: "2026-08-19" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("start"), "2026-08-18");
  assertEquals(q.get("end"), "2026-08-19");
});

/** The only way to attribute spend to one workflow. */
Deno.test("usage-get: the tag filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([usage([])], { display });
  await action.execute!({ tag: "support-summaries" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("tag"), "support-summaries");
});

Deno.test("usage-get: a response with no results totals to zero", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], { display });
  const result = await action.execute!({}, ctx) as { totalHours: number };
  assertEquals(result.totalHours, 0);
});

Deno.test("usage-get: says hours rather than requests are what is billed", () => {
  assert(/bills by duration/.test(action.description!), action.description);
});
