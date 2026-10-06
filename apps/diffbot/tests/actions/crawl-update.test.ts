import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/crawl-update.ts";
import { mockCtx, run } from "../_helpers.ts";
import { CRAWL_JOB } from "../_fixtures.ts";

const PAUSED = { ...CRAWL_JOB, jobStatus: { status: 6, message: "Job paused" } };

Deno.test("crawl-update: each operation maps to the vendor's query parameter", async () => {
  const cases: Record<string, Record<string, string>> = {
    pause: { pause: "1" },
    resume: { pause: "0" },
    "start-round": { roundStart: "1" },
    restart: { restart: "1" },
  };
  for (const [operation, expected] of Object.entries(cases)) {
    const { ctx, calls } = mockCtx([{ body: { response: "ok", jobs: [PAUSED] } }]);
    await run(action, { name: "test-crawl", operation }, ctx);
    const q = new URL(calls[0].url).searchParams;
    assertEquals(q.get("name"), "test-crawl");
    for (const [k, v] of Object.entries(expected)) assertEquals(q.get(k), v, operation);
    assertEquals(q.has("delete"), false);
  }
});

Deno.test("crawl-update: returns the job's new status; an unknown operation never calls out", async () => {
  const { ctx } = mockCtx([{ body: { response: "ok", jobs: [PAUSED] } }]);
  const out = await run(action, { name: "test-crawl", operation: "pause" }, ctx);
  assertEquals(out.statusCode, 6);
  assertEquals(out.statusMessage, "Job paused");

  const bad = mockCtx();
  await assertRejects(
    () => run(action, { name: "x", operation: "delete" }, bad.ctx),
    Error,
    "Unknown operation",
  );
  assertEquals(bad.calls.length, 0);
});
