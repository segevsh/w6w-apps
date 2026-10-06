import { assert, assertEquals } from "@std/assert";
import action from "../../actions/crawl-get.ts";
import { mockCtx, run } from "../_helpers.ts";
import { CRAWL_JOB } from "../_fixtures.ts";

Deno.test("crawl-get: no name lists every job; finished is derived from the status code", async () => {
  const done = {
    ...CRAWL_JOB,
    name: "b",
    jobStatus: { status: 9, message: "Job has completed and no repeat is scheduled" },
  };
  const { ctx, calls } = mockCtx([{ body: { jobs: [CRAWL_JOB, done] } }]);
  const out = await run(action, {}, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v3/crawl");
  assertEquals(u.searchParams.has("name"), false);
  assertEquals(out.count, 2);
  assertEquals(out.finished, false);
  const jobs = out.jobs as Array<{ finished: boolean; statusCode: number }>;
  assertEquals(jobs[1].finished, true);
  assertEquals(jobs[1].statusCode, 9);
});

Deno.test("crawl-get: a name reads one job and strips token-bearing URLs; none found is null", async () => {
  const one = mockCtx([{ body: { jobs: [CRAWL_JOB] } }]);
  const out = await run(action, { name: "test-crawl" }, one.ctx);
  assertEquals(new URL(one.calls[0].url).searchParams.get("name"), "test-crawl");
  assertEquals(out.objectsFound, 12);
  assert(!JSON.stringify(out).includes("SECRETTOKEN"));

  const none = mockCtx([{ body: { jobs: [] } }]);
  const empty = await run(action, { name: "x" }, none.ctx);
  assertEquals(empty.count, 0);
  assertEquals(empty.job, null);
});
